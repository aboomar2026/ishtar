'use server';

import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { checkoutSchema, trackOrderSchema } from './order.validation';
import { lockVariantsForUpdate } from './order-stock';
import { calcLineTotal, calcOrderTotals, roundMoney } from './order-pricing';
import { buildOrderNumber, invoiceNumberForOrder, orderNumberDatePrefix } from './order-number';
import { getOrderByNumberAndPhone } from './order.queries';
import { notifyAdminAboutNewOrder } from './order-notifications';
import { orderOutboxEnabled } from '@/features/notifications/notification-config';
import { dispatchOrderNotification } from '@/features/notifications/notification-dispatcher';
import type { CheckoutInput, CreateOrderResult, OrderStockError, OrderView } from './order.types';

/** Internal error used to abort the transaction and surface stock problems. */
class StockAbort extends Error {
  constructor(public stockErrors: OrderStockError[]) {
    super('stock-abort');
  }
}

type OrderItemData = {
  productId: string;
  variantId: string;
  productNameSnapshot: string;
  snapshot: Record<string, string>;
  productSlug: string;
  categorySlug: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
};

export async function createCodOrderAction(input: CheckoutInput): Promise<CreateOrderResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? 'form';
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: 'يرجى تعبئة بيانات التوصيل بشكل صحيح.', fieldErrors };
  }
  const data = parsed.data;
  const canonicalLines = [...data.lines].sort((a, b) => a.variantId.localeCompare(b.variantId));
  const fingerprint = createHash('sha256').update(JSON.stringify({ ...data, requestKey: undefined, lines: canonicalLines })).digest('hex');

  // Merge duplicate variant lines defensively.
  const qtyByVariant = new Map<string, number>();
  for (const line of data.lines) {
    qtyByVariant.set(line.variantId, (qtyByVariant.get(line.variantId) ?? 0) + line.quantity);
  }
  const variantIds = [...qtyByVariant.keys()];

  const MAX_RETRIES = 4;
  const ORDER_TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 20_000 };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Serialize retries of the same attempt before checking for an existing order.
        // Cast the void return value: Prisma cannot deserialize PostgreSQL void.
        await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${data.requestKey}, 0))::text`);
        const existing = await tx.order.findUnique({ where: { checkoutRequestKey: data.requestKey } });
        if (existing) {
          if (existing.checkoutFingerprint !== fingerprint) throw new Error('CHECKOUT_KEY_CONFLICT');
          return { orderId: existing.id, orderNumber: existing.orderNumber, total: existing.total.toNumber(), productSlugs: [] as string[], categorySlugs: [] as string[], reused: true };
        }
        // 1. Lock the variant rows so concurrent checkouts can't oversell.
        await lockVariantsForUpdate(tx, variantIds);

        // 2. Re-read variants + product fresh inside the locked transaction.
        const variants = await tx.productVariant.findMany({
          where: { id: { in: variantIds } },
          include: {
            product: {
              include: {
                category: { select: { slug: true, isActive: true } },
                images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 }
              }
            }
          }
        });
        const variantMap = new Map(variants.map((variant) => [variant.id, variant]));

        // 3. Validate availability for every requested line.
        const stockErrors: OrderStockError[] = [];
        for (const [variantId, qty] of qtyByVariant) {
          const variant = variantMap.get(variantId);
          if (!variant || !variant.isActive || variant.product.status !== 'ACTIVE' || !variant.product.category?.isActive) {
            stockErrors.push({ code: 'UNAVAILABLE', variantId, productName: variant?.product.name ?? 'منتج غير متوفر', available: 0 });
            continue;
          }
          if (variant.quantity < qty) {
            stockErrors.push({ code: 'OUT_OF_STOCK', variantId, productName: variant.product.name, available: Math.max(0, variant.quantity) });
          }
        }
        if (stockErrors.length > 0) throw new StockAbort(stockErrors);

        // 4. Compute totals from DB prices (never trust the client).
        let subtotal = 0;
        const itemsData: OrderItemData[] = [];
        for (const [variantId, qty] of qtyByVariant) {
          const variant = variantMap.get(variantId)!;
          const unitPrice = variant.price.toNumber();
          const lineTotal = calcLineTotal(unitPrice, qty);
          subtotal = roundMoney(subtotal + lineTotal);

          const snapshot: Record<string, string> = { sku: variant.sku, productSlug: variant.product.slug };
          if (variant.colorName) snapshot.colorName = variant.colorName;
          if (variant.colorValue) snapshot.colorValue = variant.colorValue;
          if (variant.size) snapshot.size = variant.size;
          const image = variant.product.images[0]?.url;
          if (image) snapshot.image = image;

          itemsData.push({
            productId: variant.productId,
            variantId: variant.id,
            productNameSnapshot: variant.product.name,
            snapshot,
            productSlug: variant.product.slug,
            categorySlug: variant.product.category?.slug ?? null,
            quantity: qty,
            unitPrice,
            total: lineTotal
          });
        }
        const totals = calcOrderTotals(subtotal);

        // 5. Upsert the customer by normalised phone.
        const customer = await tx.customer.upsert({
          where: { phone: data.phone },
          update: {
            fullName: data.fullName,
            whatsappPhone: data.whatsappPhone ?? undefined,
            city: data.city,
            area: data.area,
            address: data.address
          },
          create: {
            phone: data.phone,
            whatsappPhone: data.whatsappPhone ?? null,
            fullName: data.fullName,
            city: data.city,
            area: data.area,
            address: data.address
          }
        });

        // 6. Generate the daily order number.
        const now = new Date();
        const prefix = orderNumberDatePrefix(now);
        const todayCount = await tx.order.count({ where: { orderNumber: { startsWith: `${prefix}-` } } });
        const orderNumber = buildOrderNumber(now, todayCount + 1);

        // 7. Create the order, its items, and the first status-history row.
        const order = await tx.order.create({
          data: {
            orderNumber,
            checkoutRequestKey: data.requestKey,
            checkoutFingerprint: fingerprint,
            invoiceNumber: invoiceNumberForOrder(orderNumber),
            customerId: customer.id,
            status: 'PENDING',
            paymentMethod: 'COD',
            subtotal: totals.subtotal,
            deliveryFee: 0,
            deliveryFeeStatus: 'PENDING',
            discount: totals.discount,
            total: totals.total,
            customerName: data.fullName,
            customerPhone: data.phone,
            customerWhatsappPhone: data.whatsappPhone ?? null,
            city: data.city,
            area: data.area,
            address: data.address,
            notes: data.notes ?? null,
            items: {
              create: itemsData.map((item) => ({
                productId: item.productId,
                variantId: item.variantId,
                productNameSnapshot: item.productNameSnapshot,
                variantSnapshot: item.snapshot as Prisma.InputJsonValue,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total
              }))
            },
            statusHistory: { create: { fromStatus: null, toStatus: 'PENDING', note: 'Order created from storefront — delivery fee pending admin confirmation' } }
          },
          select: { id: true, orderNumber: true }
        });

        // 8. Deduct stock, log it, and update the storefront sold counters.
        const soldQuantityByProduct = new Map<string, number>();
        for (const item of itemsData) {
          const stockUpdate = await tx.productVariant.updateMany({
            where: { id: item.variantId, quantity: { gte: item.quantity } },
            data: { quantity: { decrement: item.quantity } }
          });
          if (stockUpdate.count !== 1) {
            throw new StockAbort([
              {
                code: 'OUT_OF_STOCK',
                variantId: item.variantId,
                productName: item.productNameSnapshot,
                available: Math.max(0, variantMap.get(item.variantId)?.quantity ?? 0)
              }
            ]);
          }

          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              variantId: item.variantId,
              orderId: order.id,
              type: 'ORDER_CREATED',
              quantityChange: -item.quantity,
              note: `Order ${order.orderNumber}`
            }
          });
          soldQuantityByProduct.set(item.productId, (soldQuantityByProduct.get(item.productId) ?? 0) + item.quantity);
        }

        for (const [productId, quantity] of soldQuantityByProduct) {
          await tx.product.update({ where: { id: productId }, data: { soldCount: { increment: quantity } } });
        }

        if (orderOutboxEnabled()) await tx.orderNotification.create({ data: { orderId: order.id } });

        return {
          reused: false,
          orderId: order.id,
          orderNumber: order.orderNumber,
          total: totals.total,
          productSlugs: [...new Set(itemsData.map((item) => item.productSlug))],
          categorySlugs: [...new Set(itemsData.map((item) => item.categorySlug).filter((slug): slug is string => Boolean(slug)))]
        };
      }, ORDER_TRANSACTION_OPTIONS);

      try {
      revalidatePath('/admin/orders');
      revalidatePath('/admin');
      revalidatePath('/admin/inventory');
      revalidatePath('/');
      revalidatePath('/category/new-in');
      revalidatePath('/category/sale');
      for (const slug of result.categorySlugs) revalidatePath(`/category/${slug}`);
      for (const slug of result.productSlugs) revalidatePath(`/product/${slug}`);
      } catch (cacheError) { console.error('Order committed; cache refresh failed', cacheError); }

      try {
        if (!result.reused) {
          if (orderOutboxEnabled()) await dispatchOrderNotification(result.orderId);
          else {
            const delivery = await notifyAdminAboutNewOrder(result.orderId);
            if (!delivery.ok) console.warn('Telegram order alert not confirmed', { orderId: result.orderId, code: delivery.skipped ? 'MISSING_CONFIG' : delivery.code });
          }
        }
      } catch (notificationError) {
        console.error('notifyAdminAboutNewOrder failed', notificationError);
      }

      return { ok: true, orderNumber: result.orderNumber, orderId: result.orderId, total: result.total };
    } catch (error) {
      if (error instanceof Error && error.message === 'CHECKOUT_KEY_CONFLICT') return { ok: false, error: 'تغيّرت بيانات محاولة الطلب. حدّثي الصفحة وراجعي السلة.' };
      if (error instanceof StockAbort) {
        return { ok: false, error: 'بعض المنتجات لم تعد متوفرة بالكمية المطلوبة.', stockErrors: error.stockErrors };
      }
      // Order-number collision under concurrency → retry the whole transaction.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        continue;
      }
      console.error('createCodOrderAction failed', error);
      return { ok: false, error: 'تعذر تأكيد الطلب، يرجى المحاولة مرة أخرى.' };
    }
  }

  return { ok: false, error: 'تعذر إنشاء رقم الطلب، يرجى المحاولة مرة أخرى.' };
}

export type TrackOrderResult = { ok: true; order: OrderView } | { ok: false; error: string };

/** Public order tracking — requires both order number and matching phone. */
export async function trackOrderAction(input: { orderNumber: string; phone: string }): Promise<TrackOrderResult> {
  const parsed = trackOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'يرجى إدخال رقم الطلب ورقم الجوال.' };
  }
  const order = await getOrderByNumberAndPhone(parsed.data.orderNumber, parsed.data.phone);
  if (!order) {
    return { ok: false, error: 'لم نتمكن من العثور على طلب بهذا الرقم ورقم الجوال.' };
  }
  return { ok: true, order };
}

/** A random attempt key is a receipt capability; return no customer details. */
export async function recoverCheckoutAction(requestKey: string): Promise<{ orderNumber: string } | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestKey)) return null;
  const order = await prisma.order.findUnique({ where: { checkoutRequestKey: requestKey }, select: { orderNumber: true } });
  return order;
}
