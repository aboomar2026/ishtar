import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { getStockState } from '../src/features/catalog/catalog.utils';
import type { CatalogProduct } from '../src/features/catalog/catalog.types';

test('bounded admin and catalog queries preserve filters, ranking and fresh visibility', { timeout: 90000 }, async t => {
  const db = new PGlite();
  await db.exec(execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8' }));
  await db.exec(readFileSync('scripts/sql/ishtar-test-products-100.sql', 'utf8'));
  await db.exec(readFileSync('scripts/sql/ishtar-collections-from-products-100.sql', 'utf8'));
  const socket = new PGLiteSocketServer({ db, host: '127.0.0.1', port: 0 });
  await socket.start();
  const address = socket.getServerConn();
  process.env.DATABASE_URL = `${address.startsWith('postgres') ? address : `postgresql://postgres:test@${address}/postgres`}?connection_limit=1&sslmode=disable`;
  const { prisma } = await import('../src/lib/prisma');
  const { getAdminProductPage } = await import('../src/features/admin/products/product-admin.queries');
  const { getProductsByCategorySlug } = await import('../src/features/catalog/catalog.queries');
  const { getCollection, getCollectionSummary, getProductCollectionLinks } = await import('../src/features/collections/collections.queries');
  t.after(async () => {
    await prisma.$disconnect();
    for (let i=0; i<100 && socket.getStats().activeConnections>0; i++) await new Promise<void>(resolve => setImmediate(resolve));
    await socket.stop(); await new Promise<void>(resolve => setImmediate(resolve)); await db.close();
  });
  const all = await prisma.product.findMany({ orderBy: { id: 'asc' }, include: { variants: true } });
  await prisma.productVariant.updateMany({ where: { productId: all[0].id }, data: { quantity: 0 } });
  await prisma.productVariant.updateMany({ where: { productId: all[1].id }, data: { quantity: 1, lowStockThreshold: 2 } });
  await prisma.product.update({ where: { id: all[2].id }, data: { name: 'literal_100%' } });
  await t.test('admin pages contain at most 24 rows, are stable, complete and clamp invalid pages', async () => {
    const first = await getAdminProductPage();
    assert.equal(first.total, 100); assert.equal(first.pageCount, 5); assert.equal(first.items.length, 24);
    const pages = await Promise.all(Array.from({ length: first.pageCount }, (_, index) => getAdminProductPage({ page: index+1 })));
    const ids = pages.flatMap(page => page.items.map(item => item.id));
    assert.equal(new Set(ids).size, 100); assert.equal(ids.length, 100);
    assert.deepEqual((await getAdminProductPage()).items.map(p => p.id), first.items.map(p => p.id));
    for (const page of [999, Infinity, NaN, -1, 1.5]) {
      const result = await getAdminProductPage({ page });
      assert.equal(result.page, page === 999 ? 5 : 1); assert.ok(result.items.length <= 24);
    }
  });
  await t.test('stock filtering/sorting precede pagination and match full original stock semantics', async () => {
    for (const sort of ['updated', 'newest', 'name', 'stock-asc'] as const) {
      const field = sort === 'newest' ? 'createdAt' : sort === 'name' ? 'name' : 'updatedAt';
      const products = await prisma.product.findMany({ include: { variants: true }, orderBy: [{ [field]: sort === 'name' ? 'asc' : 'desc' }, { id: 'asc' }] });
      let expected = products.map(p => {
        const active = p.variants.filter(v => v.isActive);
        const total = active.reduce((n,v) => n+Math.max(0,v.quantity),0);
        const threshold = active.length ? Math.min(...active.map(v => v.lowStockThreshold)) : 0;
        return { id: p.id, total, state: getStockState(total, threshold) };
      });
      if (sort === 'stock-asc') expected = expected.sort((a,b) => a.total-b.total || a.id.localeCompare(b.id));
      for (const stock of ['all', 'out-of-stock', 'low-stock', 'in-stock'] as const) {
        const filtered = expected.filter(p => stock === 'all' || p.state === stock);
        const result = await getAdminProductPage({ sort, stock });
        assert.equal(result.total, filtered.length, `${sort}/${stock}`);
        assert.deepEqual(result.items.map(p => p.id), filtered.slice(0,24).map(p => p.id), `${sort}/${stock}`);
      }
    }
  });
  await t.test('literal search, category/status filtering and empty results remain exact', async () => {
    assert.deepEqual((await getAdminProductPage({ q: 'literal_100%' })).items.map(p => p.id), [all[2].id]);
    assert.equal((await getAdminProductPage({ q: 'nothing matches this fixture' })).total, 0);
    const category = await getAdminProductPage({ categoryId: all[0].categoryId, status: 'ACTIVE' });
    assert.equal(category.total, all.filter(p => p.categoryId === all[0].categoryId && p.status === 'ACTIVE').length);
  });
  await t.test('public sort pages retain actual non-canceled sales counts and paginated order', async () => {
    for (const [index,status] of ['PENDING','DELIVERED','CANCELED'].entries()) {
      await prisma.order.create({ data: { orderNumber: `PERF-ONLY-${index}`, status: status as 'PENDING' | 'DELIVERED' | 'CANCELED', subtotal: 1, total: 1,
        customerName: 'Isolated fixture', customerPhone: 'fixture', city: 'fixture', area: 'fixture', address: 'fixture',
        items: { create: { productId: all[3].id, productNameSnapshot: all[3].name, quantity: index+1, unitPrice: 1, total: index+1 } } } });
    }
    for (const sort of ['newest', 'price-asc', 'price-desc', 'best-sellers'] as const) {
      const seen: CatalogProduct[] = [];
      for (let page=1; page<=3; page++) {
        const result = await getProductsByCategorySlug('all', { sort, page });
        assert.ok(result); assert.equal(result.total, 100);
        assert.equal(result.pageCount, 3);
        assert.equal(result.products.length, page < 3 ? 48 : 4);
        for (const p of result.products) {
          assert.equal(p.soldCount, p.id === all[3].id ? 3 : 0);
          seen.push(p);
        }
      }
      assert.equal(new Set(seen.map(p => p.id)).size, 100);
      assert.equal(seen.length, 100);
      if (sort === 'best-sellers') assert.equal(seen[0].id, all[3].id);
      if (sort === 'price-asc') assert.ok(seen.every((p,i) => i===0 || p.price >= seen[i-1].price));
      if (sort === 'price-desc') assert.ok(seen.every((p,i) => i===0 || p.price <= seen[i-1].price));
    }
  });
  await t.test('summary omits member hydration; pills are bounded links; subsequent requests see edits', async () => {
    const summary = await getCollectionSummary('elegance');
    assert.ok(summary); assert.equal('products' in summary, false);
    const page = await getCollection('elegance', 2); assert.ok(page); assert.equal(page.page, 2);
    const links = await getProductCollectionLinks(page.products[0].id);
    assert.ok(links.length <= 6); assert.deepEqual(Object.keys(links[0]).sort(), ['id','name','slug']);
    await prisma.collection.update({ where: { id: summary.id }, data: { isActive: false } });
    assert.equal(await getCollectionSummary('elegance'), null);
    assert.equal(await getCollection('elegance'), null);
    assert.ok(!(await getProductCollectionLinks(page.products[0].id)).some(link => link.id === summary.id));
  });
});
