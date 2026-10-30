import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

function mockModule(id: string, exports: unknown) {
  const filename = require.resolve(id);
  require.cache[filename] = { id: filename, filename, loaded: true, exports } as NodeModule;
}
let authorized = true;
const authorize = async () => { if (!authorized) throw new Error('DENIED'); return { id: 'test-admin', role: 'SUPER_ADMIN' }; };
mockModule('next/cache', { revalidatePath() {} });
mockModule('../src/features/admin/auth/admin-auth', { requireAdmin: authorize, requireOrderAdmin: authorize });

test('product deletion preserves historical accounting on disposable PostgreSQL', { timeout: 90000 }, async (t) => {
  const db = new PGlite();
  const schema = execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8' });
  await db.exec(schema);
  await db.exec('ALTER TABLE "Product" DROP COLUMN "deletedAt";');
  const sql = readFileSync('prisma/additive/product-deletion.sql', 'utf8');
  await db.exec(sql);
  await db.exec(sql);
  const socket = new PGLiteSocketServer({ db, host: '127.0.0.1', port: 0 });
  await socket.start();
  const address = socket.getServerConn();
  process.env.DATABASE_URL = `${address.startsWith('postgres') ? address : `postgresql://postgres:test@${address}/postgres`}?connection_limit=1&sslmode=disable`;
  const { prisma } = await import('../src/lib/prisma');
  const { deleteProductAction, setProductStatusAction, updateProductAction } = await import('../src/features/admin/products/product-admin.actions');
  const { getAdminProductPage, getAdminProductById } = await import('../src/features/admin/products/product-admin.queries');
  const { getDashboardOverview } = await import('../src/features/admin/dashboard/dashboard.queries');
  const { getInventoryVariants } = await import('../src/features/admin/inventory/inventory-admin.queries');
  const inventory = await import('../src/features/admin/inventory/inventory-admin.actions');
  const { getProductBySlug, getProductsByCategorySlug } = await import('../src/features/catalog/catalog.queries');
  const { productOptions } = await import('../src/features/collections/collections.admin');
  const { getCartAvailability } = await import('../src/features/orders/cart.actions');
  t.after(async () => { await prisma.$disconnect(); await socket.stop(); await db.close(); });
  await prisma.category.create({ data: { id: 'category', name: 'قسم', slug: 'category' } });
  await prisma.product.create({ data: {
    id: 'sold', name: 'منتج قديم', slug: 'sold', categoryId: 'category', description: 'اختبار', basePrice: 20, status: 'ACTIVE', soldCount: 2,
    images: { create: { url: 'https://example.com/original.jpg' } },
    variants: { create: { id: 'variant', sku: 'HISTORICAL-SKU', price: 20, quantity: 3 } },
  } });
  const order = await prisma.order.create({ data: {
    id: 'old-order', orderNumber: 'ISHTAR-TEST-1', invoiceNumber: 'INV-TEST-1', subtotal: 40, total: 45, deliveryFee: 5,
    customerName: 'عميلة اختبار', customerPhone: '0590000000', city: 'مدينة', area: 'حي', address: 'عنوان',
    items: { create: { productId: 'sold', variantId: 'variant', productNameSnapshot: 'اسم وقت البيع', variantSnapshot: { sku: 'HISTORICAL-SKU' }, quantity: 2, unitPrice: 20, total: 40 } },
  } });
  await prisma.inventoryLog.create({ data: { productId: 'sold', variantId: 'variant', orderId: order.id, type: 'ORDER_CREATED', quantityChange: -2 } });
  const beforeOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
  const beforeLog = await prisma.inventoryLog.findMany();
  const beforeDashboard = await getDashboardOverview();
  await t.test('authorization and typed confirmation are required before mutation', async () => {
    authorized = false;
    await assert.rejects(deleteProductAction('sold', 'حذف'), /DENIED/);
    authorized = true;
    assert.equal((await deleteProductAction('sold', '')).ok, false);
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: 'sold' } })).deletedAt, null);
  });
  await t.test('deleting an ordered product keeps every financial snapshot and ledger entry', async () => {
    assert.equal((await deleteProductAction('sold', 'حذف')).ok, true);
    const deleted = await prisma.product.findUniqueOrThrow({ where: { id: 'sold' } });
    assert.ok(deleted.deletedAt);
    assert.equal(deleted.status, 'ARCHIVED');
    assert.equal(deleted.soldCount, 2);
    assert.deepEqual(await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } }), beforeOrder);
    assert.deepEqual(await prisma.inventoryLog.findMany(), beforeLog);
    assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: 'variant' } })).quantity, 3);
    assert.equal(await prisma.productImage.count(), 1);
    const after = await getDashboardOverview();
    for (const key of Object.keys(beforeDashboard) as (keyof typeof beforeDashboard)[]) {
      if (/order|revenue|sales/i.test(key)) assert.deepEqual(after[key], beforeDashboard[key], key);
    }
  });
  await t.test('deleted products disappear from catalogue, admin, inventory, options and saved carts', async () => {
    assert.equal(await getProductBySlug('sold'), null);
    assert.equal((await getProductsByCategorySlug('all'))?.products.length, 0);
    assert.equal((await getAdminProductPage()).total, 0);
    assert.equal(await getAdminProductById('sold'), null);
    assert.deepEqual(await getInventoryVariants(), []);
    assert.deepEqual(await productOptions('', ['sold']), []);
    assert.equal((await getCartAvailability(['variant']))[0].quantity, 0);
    const { createCodOrderAction } = await import('../src/features/orders/order.actions');
    const blocked = await createCodOrderAction({ requestKey: '11111111-1111-4111-8111-111111111111', fullName: 'عميلة اختبار', phone: '0590000000', city: 'خانيونس', area: 'اختبار', address: 'عنوان اختبار', lines: [{ variantId: 'variant', quantity: 1 }] });
    assert.equal(blocked.ok, false);
    assert.equal(await prisma.order.count(), 1);
  });
  await t.test('duplicate deletion is idempotent and stale editors cannot restore or change stock', async () => {
    const deletedAt = (await prisma.product.findUniqueOrThrow({ where: { id: 'sold' } })).deletedAt;
    assert.equal((await deleteProductAction('sold', 'حذف')).ok, true);
    assert.deepEqual((await prisma.product.findUniqueOrThrow({ where: { id: 'sold' } })).deletedAt, deletedAt);
    assert.equal((await setProductStatusAction('sold', 'DRAFT')).ok, false);
    assert.equal((await updateProductAction('sold', {} as Parameters<typeof updateProductAction>[1])).ok, false);
    assert.equal((await inventory.adjustVariantQuantityAction('variant', 100)).ok, false);
    assert.equal((await inventory.updateVariantThresholdAction('variant', 99)).ok, false);
    assert.equal((await inventory.setVariantActiveAction('variant', true)).ok, false);
    assert.deepEqual(await prisma.inventoryLog.findMany(), beforeLog);
  });
  await t.test('an existing order can still be canceled and restocked once after product deletion', async () => {
    const { updateOrderStatusAction } = await import('../src/features/admin/orders/order-admin.actions');
    assert.equal((await updateOrderStatusAction(order.id, 'CANCELED')).ok, true);
    assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: 'variant' } })).quantity, 5);
    assert.equal((await updateOrderStatusAction(order.id, 'CANCELED')).ok, false);
    assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: 'variant' } })).quantity, 5);
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: 'sold' } })).status, 'ARCHIVED');
  });
  await t.test('new drafts can be deleted without orders and archive remains recoverable', async () => {
    await prisma.product.create({ data: { id: 'draft', name: 'خطأ', slug: 'draft', description: '', categoryId: 'category', basePrice: 0 } });
    assert.equal((await setProductStatusAction('draft', 'ARCHIVED')).ok, true);
    assert.equal((await setProductStatusAction('draft', 'DRAFT')).ok, true);
    assert.equal((await deleteProductAction('draft', 'حذف')).ok, true);
    assert.equal((await deleteProductAction('unknown', 'حذف')).ok, false);
  });
});
