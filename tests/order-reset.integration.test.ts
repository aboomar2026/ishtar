import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

test('test-order reset on disposable Postgres', { timeout: 90000 }, async (t) => {
  const db = new PGlite();
  await db.exec(execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8' }));
  const socket = new PGLiteSocketServer({ db, host: '127.0.0.1', port: 0 });
  await socket.start();
  const address = socket.getServerConn();
  const connection = address.startsWith('postgres') ? address : `postgresql://postgres:test@${address}/postgres`;
  process.env.DATABASE_URL = `${connection}?connection_limit=1&sslmode=disable`;
  const { prisma } = await import('../src/lib/prisma');
  const { canResetTestOrders, getTestOrderResetPreview, resetTestOrders } = await import('../src/features/admin/orders/order-reset');
  t.after(async () => { await prisma.$disconnect(); await socket.stop(); await db.close(); });

  await t.test('flag and super-admin role are both required', () => {
    process.env.ENABLE_TEST_ORDER_RESET = 'false';
    assert.equal(canResetTestOrders('SUPER_ADMIN'), false);
    process.env.ENABLE_TEST_ORDER_RESET = 'true';
    assert.equal(canResetTestOrders('CATALOG_MANAGER'), false);
    assert.equal(canResetTestOrders('SUPER_ADMIN'), true);
  });

  await prisma.category.create({ data: { id: 'cat', name: 'قسم محفوظ', slug: 'preserved-category' } });
  await prisma.product.create({ data: {
    id: 'product', name: 'منتج محفوظ', slug: 'preserved-product', description: 'لا تحذف هذا المنتج', categoryId: 'cat',
    status: 'ACTIVE', basePrice: 10, soldCount: 7,
    images: { create: { url: 'https://example.invalid/image.webp', isPrimary: true } },
    variants: { create: [{ id: 'variant', sku: 'V1', price: 10, quantity: 3 }, { id: 'other', sku: 'V2', price: 10, quantity: 80 }] },
  } });
  const productBefore = await prisma.product.findUniqueOrThrow({ where: { id: 'product' }, include: { images: true } });
  async function makeOrder(id: string, status: 'PENDING' | 'DELIVERED' | 'CANCELED', quantity: number, variantId: string | null = 'variant') {
    return prisma.order.create({ data: {
      id, orderNumber: id, status, customerName: 'Test', customerPhone: '0590000000',
      city: 'Test', area: 'Test', address: 'Test', subtotal: quantity * 10, total: quantity * 10,
      items: { create: { productId: 'product', variantId, productNameSnapshot: 'Test', quantity, unitPrice: 10, total: quantity * 10 } },
      statusHistory: { create: { toStatus: status } },
    } });
  }
  await makeOrder('pending', 'PENDING', 3);
  await makeOrder('delivered', 'DELIVERED', 4);
  await makeOrder('already-canceled', 'CANCELED', 6);
  await prisma.orderNotification.create({ data: {
    id: 'notification', orderId: 'pending', deliveryStatus: 'PROCESSING',
    reads: { create: { adminId: 'admin' } },
    deliveryAttempts: { create: { attempt: 1 } },
  } });
  await prisma.inventoryLog.create({ data: { productId: 'product', variantId: 'variant', orderId: 'pending', type: 'ORDER_CREATED', quantityChange: -3 } });

  await t.test('in-flight notification blocks reset; queued notifications are eligible for cleanup', async () => {
    await assert.rejects(resetTestOrders((await getTestOrderResetPreview()).token, 'admin'), /تنبيه قيد الإرسال/);
    assert.equal(await prisma.order.count(), 3);
    assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: 'variant' } })).quantity, 3);
    await prisma.orderNotification.update({ where: { id: 'notification' }, data: { deliveryStatus: 'RETRY' } });
  });

  await t.test('preview includes all statuses; changed snapshot refuses without modifying stock', async () => {
    const old = await getTestOrderResetPreview();
    assert.deepEqual({ count: old.orderCount, canceled: old.canceledCount, quantity: old.restoreQuantity }, { count: 3, canceled: 1, quantity: 7 });
    await makeOrder('new-order', 'PENDING', 1, 'other');
    await assert.rejects(resetTestOrders(old.token, 'admin'), /تغيّرت الطلبات/);
    assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: 'variant' } })).quantity, 3);
    await prisma.order.delete({ where: { id: 'new-order' } });
  });

  await t.test('missing variant refuses the reset and leaves every order intact', async () => {
    await makeOrder('missing-variant', 'PENDING', 1, null);
    await assert.rejects(resetTestOrders((await getTestOrderResetPreview()).token, 'admin'), /خيار منتج محذوف/);
    assert.equal(await prisma.order.count(), 4);
    await prisma.order.delete({ where: { id: 'missing-variant' } });
  });

  await t.test('failure after stock writes rolls everything back', async () => {
    await db.exec(`CREATE FUNCTION refuse_reset() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'isolated rollback test'; END $$;
      CREATE TRIGGER refuse_reset BEFORE DELETE ON "Order" FOR EACH ROW EXECUTE FUNCTION refuse_reset();`);
    await assert.rejects(resetTestOrders((await getTestOrderResetPreview()).token, 'admin'), /isolated rollback test/);
    assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: 'variant' } })).quantity, 3);
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: 'product' } })).soldCount, 7);
    assert.equal(await prisma.inventoryLog.count(), 1);
    assert.equal(await prisma.order.count(), 3);
    assert.equal(await prisma.orderNotification.count(), 1);
    await db.exec('DROP TRIGGER refuse_reset ON "Order"; DROP FUNCTION refuse_reset();');
  });

  await t.test('reset restores active and delivered orders once; preserves products/images/ledger', async () => {
    const preview = await getTestOrderResetPreview();
    const result = await resetTestOrders(preview.token, 'test-admin');
    assert.equal(result.restoreQuantity, 7);
    assert.equal(await prisma.order.count(), 0);
    assert.equal(await prisma.orderItem.count(), 0);
    assert.equal(await prisma.orderStatusHistory.count(), 0);
    assert.equal(await prisma.orderNotification.count(), 0);
    assert.equal(await prisma.orderNotificationRead.count(), 0);
    assert.equal(await prisma.orderNotificationAttempt.count(), 0);
    assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: 'variant' } })).quantity, 10);
    assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: 'other' } })).quantity, 80);
    const after = await prisma.product.findUniqueOrThrow({ where: { id: 'product' }, include: { images: true } });
    assert.deepEqual({ ...after, soldCount: 7, updatedAt: productBefore.updatedAt }, productBefore);
    assert.equal(after.soldCount, 0);
    const logs = await prisma.inventoryLog.findMany();
    assert.equal(logs.length, 2);
    assert.ok(logs.every((log) => log.orderId === null));
    assert.equal(logs.find((log) => log.type === 'RESTOCK')?.quantityChange, 7);
    await assert.rejects(resetTestOrders(preview.token, 'test-admin'), /تغيّرت الطلبات/);
    await resetTestOrders((await getTestOrderResetPreview()).token, 'test-admin');
    assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: 'variant' } })).quantity, 10);
  });

  await t.test('reset also works before optional notification tables are installed', async () => {
    await db.exec('DROP TABLE "OrderNotificationRead", "OrderNotificationAttempt", "OrderNotification";');
    await makeOrder('legacy-order', 'PENDING', 2);
    await prisma.productVariant.update({ where: { id: 'variant' }, data: { quantity: 8 } });
    await resetTestOrders((await getTestOrderResetPreview()).token, 'admin');
    assert.equal(await prisma.order.count(), 0);
    assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: 'variant' } })).quantity, 10);
  });
});
