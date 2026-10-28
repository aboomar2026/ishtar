import 'server-only';
import { createHash } from 'node:crypto';
import { Prisma, type AdminRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const RESET_CONFIRMATION = 'تصفير الطلبات';

export function canResetTestOrders(role: AdminRole): boolean {
  return process.env.ENABLE_TEST_ORDER_RESET === 'true' && role === 'SUPER_ADMIN';
}

const selection = {
  id: true, status: true, updatedAt: true,
  items: { select: { id: true, productId: true, variantId: true, quantity: true } },
} satisfies Prisma.OrderSelect;
type SnapshotOrder = Prisma.OrderGetPayload<{ select: typeof selection }>;

function preview(orders: SnapshotOrder[]) {
  const signature = orders.map((order) => ({
    ...order,
    items: [...order.items].sort((a, b) => a.id.localeCompare(b.id)),
  })).sort((a, b) => a.id.localeCompare(b.id));
  return {
    token: createHash('sha256').update(JSON.stringify(signature)).digest('hex'),
    orderCount: orders.length,
    canceledCount: orders.filter((order) => order.status === 'CANCELED').length,
    restoreQuantity: orders.filter((order) => order.status !== 'CANCELED')
      .flatMap((order) => order.items).reduce((sum, item) => sum + item.quantity, 0),
  };
}

export async function getTestOrderResetPreview() {
  return preview(await prisma.order.findMany({ select: selection }));
}

export class OrderResetAbort extends Error {}

/** Only called after the server action authenticates and checks the feature flag. */
export async function resetTestOrders(token: string, adminId: string) {
  return prisma.$transaction(async (tx) => {
    // Lock before reading status: cancellation and another reset must not restore
    // the same stock twice. New orders created after this snapshot are retained.
    const locked = await tx.$queryRaw<{ id: string }[]>(
      Prisma.sql`SELECT id FROM "Order" ORDER BY id FOR UPDATE`,
    );
    const ids = locked.map((order) => order.id);
    const orders = await tx.order.findMany({ where: { id: { in: ids } }, select: selection });
    const current = preview(orders);
    if (current.token !== token) {
      throw new OrderResetAbort('تغيّرت الطلبات. أغلق التأكيد وافتحه مجدداً لمراجعة الأعداد.');
    }
    if (!ids.length) return current;

    // Older environments may not have installed the optional notification SQL.
    const notificationTable = await tx.$queryRaw<{ name: string | null }[]>(
      Prisma.sql`SELECT to_regclass('"OrderNotification"')::text AS name`,
    );
    if (notificationTable[0]?.name) {
      const notifications = await tx.$queryRaw<{ deliveryStatus: string }[]>(Prisma.sql`
        SELECT "deliveryStatus" FROM "OrderNotification"
        WHERE "orderId" IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE
      `);
      if (notifications.some((notification) => notification.deliveryStatus === 'PROCESSING')) {
        throw new OrderResetAbort('يوجد تنبيه قيد الإرسال. انتظر اكتماله ثم حاول تصفير الطلبات مجدداً.');
      }
    }

    const activeIds = orders.filter((order) => order.status !== 'CANCELED').map((order) => order.id);
    if (orders.some((order) => order.status !== 'CANCELED' && order.items.some((item) => !item.variantId))) {
      throw new OrderResetAbort('يوجد طلب غير ملغي مرتبط بخيار منتج محذوف. راجع المخزون قبل التصفير.');
    }

    if (activeIds.length) {
      const restored = await tx.$queryRaw<{ id: string; productId: string; quantity: number }[]>(Prisma.sql`
        WITH quantities AS (
          SELECT "variantId", SUM(quantity)::integer AS quantity FROM "OrderItem"
          WHERE "orderId" IN (${Prisma.join(activeIds)}) GROUP BY "variantId"
        )
        UPDATE "ProductVariant" AS v SET quantity = v.quantity + q.quantity, "updatedAt" = NOW()
        FROM quantities q WHERE v.id = q."variantId"
        RETURNING v.id, v."productId", q.quantity
      `);
      if (restored.reduce((sum, row) => sum + row.quantity, 0) !== current.restoreQuantity) {
        throw new OrderResetAbort('تغيّرت خيارات المنتجات أثناء التصفير. راجع المخزون وحاول مجدداً.');
      }
      await tx.inventoryLog.createMany({ data: restored.map((row) => ({
        productId: row.productId, variantId: row.id, type: 'RESTOCK', quantityChange: row.quantity,
        note: `Test order reset by admin ${adminId}; ${current.orderCount} orders removed`,
      })) });
      await tx.$executeRaw(Prisma.sql`
        WITH quantities AS (
          SELECT "productId", SUM(quantity)::integer AS quantity FROM "OrderItem"
          WHERE "orderId" IN (${Prisma.join(activeIds)}) GROUP BY "productId"
        )
        UPDATE "Product" AS p SET "soldCount" = GREATEST(p."soldCount" - q.quantity, 0), "updatedAt" = NOW()
        FROM quantities q WHERE p.id = q."productId"
      `);
    }
    if (notificationTable[0]?.name) {
      // Read/attempt rows cascade; no stale retries remain for removed orders.
      await tx.orderNotification.deleteMany({ where: { orderId: { in: ids } } });
    }
    // Items/history cascade; existing stock logs survive with orderId set null.
    await tx.order.deleteMany({ where: { id: { in: ids } } });
    return current;
  }, { maxWait: 10_000, timeout: 20_000 });
}
