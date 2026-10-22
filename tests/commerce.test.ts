import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { Prisma } from '@prisma/client';
import { normalizeDigits } from '../src/lib/numbers';
import { startOfBusinessDay } from '../src/lib/business-time';
import { checkoutSchema, normalizePhone } from '../src/features/orders/order.validation';
import { mapProductCard } from '../src/features/catalog/catalog.mappers';
import { getProductsByCategorySlug } from '../src/features/catalog/catalog.queries';
import { prisma } from '../src/lib/prisma';

function fixture(index: number) {
  const id = `p${index}`;
  return { id, name: index === 0 ? 'محفظة' : `منتج ${index}`, slug: id, categoryId: 'c', subtitle: null, description: 'وصف المنتج', details: '["خامة ناعمة","حزام قابل للتعديل"]', careInstructions: null, brand: null,
    basePrice: 100 - index, compareAtPrice: null, status: 'ACTIVE', isFeatured: false, isNewArrival: index > 0, isBestSeller: false, rating: null, reviewCount: 0, soldCount: index === 0 ? 0 : 500, viewCount: 0, tags: [], createdAt: new Date('2026-01-01'), images: [],
    variants: [{ id: `v${index}`, productId: id, sku: `sku${index}`, colorName: null, colorValue: null, size: null, price: index + 1, compareAtPrice: null, quantity: 10, lowStockThreshold: 2, isActive: true }]
  };
}

test('Arabic and Persian digits normalize before phone validation', () => {
  assert.equal(normalizeDigits('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹'), '01234567890123456789');
  assert.equal(normalizePhone('+٩٧٠ ٥٩-١٢٣٤٥٦٧'), '+970591234567');
  assert.equal(normalizePhone('۰۵۹۱۲۳۴۵۶۷'), '0591234567');
  const result = checkoutSchema.safeParse({ requestKey: '11111111-1111-4111-8111-111111111111', fullName: 'عميلة اختبار', phone: '٠٥٩١٢٣٤٥٦٧', city: 'خانيونس', area: 'حي تجريبي', address: 'عنوان اختبار فقط', lines: [{ variantId: 'v0', quantity: 1 }] });
  assert.ok(result.success);
  assert.equal(result.data.phone, '0591234567');
});

test('legacy JSON details render as bullets and unavailable cheap variants do not set purchase price', () => {
  const product = fixture(0);
  product.variants.push({ ...product.variants[0], id: 'empty', price: 0.1, quantity: 0 });
  const mapped = mapProductCard(product);
  assert.deepEqual(mapped.details, ['خامة ناعمة', 'حزام قابل للتعديل']);
  assert.equal(mapped.price, 1);
  assert.deepEqual(mapProductCard({ ...product, details: 'نص قديم\nسطر ثان' }).details, ['نص قديم', 'سطر ثان']);
});

test('business-day boundaries use Palestine time independently of server timezone', () => {
  for (const input of ['2026-01-21T10:00:00Z', '2026-07-21T10:00:00Z']) {
    const start = startOfBusinessDay(new Date(input));
    assert.equal(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Hebron', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(start), '00:00');
    assert.ok(start.getTime() <= new Date(input).getTime());
    assert.ok(new Date(input).getTime() - start.getTime() < 24 * 3600000);
  }
});

test('catalog queries execute against isolated Postgres with more than one page', async (t) => {
  const db = new PGlite();
  const schema = execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8' });
  await db.exec(schema);
  const products = Array.from({ length: 30 }, (_, i) => fixture(i));
  await db.query('INSERT INTO "Category" (id,name,slug,"updatedAt") VALUES ($1,$2,$3,now())', ['c', 'إكسسوارات', 'accessories']);
  for (const p of products) {
    await db.query('INSERT INTO "Product" (id,name,slug,description,"categoryId","basePrice",status,"isNewArrival","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,\'ACTIVE\',$7,now())', [p.id,p.name,p.slug,p.description,p.categoryId,p.basePrice,p.isNewArrival]);
    await db.query('INSERT INTO "ProductVariant" (id,"productId",sku,price,quantity,"updatedAt") VALUES ($1,$2,$3,$4,$5,now())', [p.variants[0].id,p.id,p.variants[0].sku,p.variants[0].price,10]);
  }
  Object.defineProperty(prisma, '$queryRaw', { configurable: true, value: async (query: Prisma.Sql) => (await db.query(query.text, query.values)).rows });
  Object.defineProperty(prisma.category, 'findMany', { configurable: true, value: async () => [] });
  Object.defineProperty(prisma.product, 'findMany', { configurable: true, value: async (args: { where: { id: { in: string[] } } }) => products.filter((p) => args.where.id.in.includes(p.id)) });
  try {
    await t.test('pagination exposes all 30 products and keeps the real total', async () => {
      const first = await getProductsByCategorySlug('all', { sort: 'price-asc' });
      const second = await getProductsByCategorySlug('all', { sort: 'price-asc', page: 2 });
      assert.equal(first?.total, 30); assert.equal(first?.pageCount, 2);
      assert.equal(first?.products.length, 24); assert.equal(second?.products.length, 6);
      assert.equal(new Set([...first!.products,...second!.products].map((p) => p.id)).size, 30);
    });
    await t.test('displayed variant prices determine ordering before pagination', async () => {
      const result = await getProductsByCategorySlug('all', { sort: 'price-asc', limit: 2 });
      assert.deepEqual(result?.products.map((p) => p.price), [1,2]);
      const filtered = await getProductsByCategorySlug('all', { minPrice: 29 });
      assert.equal(filtered?.total, 2);
    });
    await t.test('global search finds an existing non-new product, scoped new-in does not', async () => {
      assert.equal((await getProductsByCategorySlug('all', { q: 'محفظة' }))?.total, 1);
      assert.equal((await getProductsByCategorySlug('new-in', { q: 'محفظة' }))?.total, 0);
      assert.equal((await getProductsByCategorySlug('all', { q: "%' OR 1=1 --" }))?.total, 0);
    });
    await t.test('featured collection filters before pagination and supports search and sorting', async () => {
      await db.query('UPDATE "Product" SET "isFeatured" = true WHERE id IN (\'p0\', \'p28\', \'p29\')');
      const first = await getProductsByCategorySlug('featured', { sort: 'price-desc', limit: 2 });
      const second = await getProductsByCategorySlug('featured', { sort: 'price-desc', limit: 2, page: 2 });
      assert.equal(first?.category.slug, 'featured');
      assert.equal(first?.total, 3);
      assert.equal(first?.pageCount, 2);
      assert.deepEqual(first?.products.map((product) => product.id), ['p29', 'p28']);
      assert.deepEqual(second?.products.map((product) => product.id), ['p0']);
      assert.equal((await getProductsByCategorySlug('featured', { q: 'محفظة' }))?.total, 1);
      assert.equal((await getProductsByCategorySlug('featured', { q: 'منتج 1' }))?.total, 0);
    });
    await db.query('INSERT INTO "Order" (id,"orderNumber","customerName","customerPhone",city,area,address,subtotal,total,"updatedAt") VALUES (\'o\',\'TEST-1\',\'اختبار\',\'0000000\',\'اختبار\',\'اختبار\',\'اختبار\',50,50,now())');
    await db.query('INSERT INTO "OrderItem" (id,"orderId","productId","productNameSnapshot",quantity,"unitPrice",total) VALUES (\'i\',\'o\',\'p0\',\'اختبار\',50,1,50)');
    await t.test('best seller ranking uses actual orders before limiting, ignores imported counters', async () => {
      const result = await getProductsByCategorySlug('all', { sort: 'best-sellers', limit: 1 });
      assert.equal(result?.products[0].id, 'p0'); assert.equal(result?.products[0].soldCount, 50);
    });
    await t.test('additive retry schema is repeatable and enforces unique attempt keys', async () => {
      const sql = readFileSync('scripts/sql/ishtar-checkout-idempotency.sql', 'utf8');
      await db.exec(sql); await db.exec(sql);
      await db.query('UPDATE "Order" SET "checkoutRequestKey"=$1 WHERE id=\'o\'', ['11111111-1111-4111-8111-111111111111']);
      await assert.rejects(db.query('INSERT INTO "Order" (id,"orderNumber","customerName","customerPhone",city,area,address,subtotal,total,"updatedAt","checkoutRequestKey") SELECT \'other\',\'TEST-2\',"customerName","customerPhone",city,area,address,subtotal,total,now(),"checkoutRequestKey" FROM "Order" WHERE id=\'o\''));
      assert.equal((await db.query<{ count: number }>('SELECT count(*)::int AS count FROM "Order"')).rows[0].count, 1);
    });
  } finally { await db.close(); }
});
