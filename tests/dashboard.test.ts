import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { businessDateKey, dashboardPeriodRange } from '../src/features/admin/dashboard/dashboard-period';

test('report periods use Palestinian calendar days across midnight and DST boundaries', () => {
  for (const instant of ['2026-03-28T12:00:00Z', '2026-10-24T12:00:00Z', '2026-01-01T00:00:00Z', '2026-07-01T21:30:00Z']) {
    const now = new Date(instant);
    for (const period of ['today', 'week', 'month']) {
      const range = dashboardPeriodRange(period, now);
      assert.equal(businessDateKey(range.start), range.keys[0]);
      assert.notEqual(businessDateKey(new Date(+range.start - 1)), range.keys[0]);
      assert.equal(businessDateKey(new Date(+range.end - 1)), range.keys.at(-1));
      assert.notEqual(businessDateKey(range.end), range.keys.at(-1));
      assert.ok(+range.start <= +now && +range.end > +now);
      assert.equal(range.keys.length, period === 'today' ? 1 : period === 'week' ? 7 : 30);
    }
  }
  for (const [date, hours] of [['2026-03-28T12:00:00Z', 23], ['2026-10-24T12:00:00Z', 25]] as const) {
    const range = dashboardPeriodRange('today', new Date(date));
    assert.equal((+range.end - +range.start) / 3600000, hours, 'calendar days are not fixed 24-hour windows');
  }
  assert.equal(dashboardPeriodRange('invalid').period, 'today');
  assert.equal(dashboardPeriodRange('month', new Date('2026-01-02T12:00:00Z')).keys[0], '2025-12-04');
});

test('dashboard aggregates reconcile real rows and alerts are filtered before limiting', { timeout: 90000 }, async t => {
  const db = new PGlite();
  const ddl = execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8' });
  await db.exec(ddl);
  const socket = new PGLiteSocketServer({ db, host: '127.0.0.1', port: 0 });
  await socket.start();
  const address = socket.getServerConn();
  const connection = address.startsWith('postgres') ? address : `postgresql://postgres:test@${address}/postgres`;
  process.env.DATABASE_URL = `${connection}${connection.includes('?') ? '&' : '?'}connection_limit=1&sslmode=disable`;
  const { prisma } = await import('../src/lib/prisma');
  const { getDashboardAnalytics } = await import('../src/features/admin/dashboard/dashboard-analytics.queries');
  const { getDashboardOverview } = await import('../src/features/admin/dashboard/dashboard.queries');
  try {
    await prisma.category.createMany({ data: [{ id: 'public', name: 'Test', slug: 'public' }, { id: 'hidden', name: 'Test', slug: 'hidden', isActive: false }] });
    await prisma.product.createMany({ data: [
      { id: 'public', name: 'Public', slug: 'public', categoryId: 'public', status: 'ACTIVE', basePrice: 25, description: 'Synthetic fixture' },
      { id: 'draft', name: 'Draft', slug: 'draft', categoryId: 'public', status: 'DRAFT', basePrice: 25, description: 'Synthetic fixture' },
      { id: 'hidden', name: 'Hidden', slug: 'hidden', categoryId: 'hidden', status: 'ACTIVE', basePrice: 25, description: 'Synthetic fixture' }
    ] });
    await prisma.productVariant.createMany({ data: [
      ...Array.from({ length: 105 }, (_, i) => ({ id: `healthy-${i}`, productId: 'public', sku: `HEALTHY-${i}`, price: 25, quantity: 1, lowStockThreshold: 0 })),
      { id: 'high-threshold', productId: 'public', sku: 'LOW', price: 25, quantity: 100, lowStockThreshold: 101 },
      { id: 'empty', productId: 'public', sku: 'EMPTY', price: 25, quantity: 0, lowStockThreshold: 2 },
      { id: 'draft', productId: 'draft', sku: 'DRAFT', price: 25, quantity: 0, lowStockThreshold: 2 },
      { id: 'hidden', productId: 'hidden', sku: 'HIDDEN', price: 25, quantity: 0, lowStockThreshold: 2 },
      { id: 'inactive', productId: 'public', sku: 'INACTIVE', price: 25, quantity: 0, lowStockThreshold: 2, isActive: false }
    ] });
    await t.test('low threshold variants beyond the old 100-row window stay visible; unpublished stock is excluded', async () => {
      const overview = await getDashboardOverview();
      assert.equal(overview.lowStockVariants, 1); assert.equal(overview.outOfStockVariants, 1);
      assert.deepEqual(overview.stockAlerts.map(row => row.id), ['empty', 'high-threshold']);
    });
    const now = new Date('2026-07-01T22:30:00Z'); // July 2 in Palestine.
    const range = dashboardPeriodRange('week', now);
    const fixtures = [
      { id: 'before', createdAt: new Date(+range.start - 1), status: 'PENDING' as const, total: 900 },
      { id: 'start', createdAt: range.start, status: 'CONFIRMED' as const, total: 20.15 },
      { id: 'cancel', createdAt: range.start, status: 'CANCELED' as const, total: 900 },
      { id: 'delivered', createdAt: new Date('2026-07-01T21:30:00Z'), status: 'DELIVERED' as const, total: 30.25 },
      { id: 'pending', createdAt: new Date('2026-07-01T20:59:59Z'), status: 'PENDING' as const, total: 10.10 },
      { id: 'end', createdAt: range.end, status: 'DELIVERED' as const, total: 900 }
    ];
    await prisma.order.createMany({ data: fixtures.map(row => ({ ...row, orderNumber: row.id, subtotal: row.total, customerName: 'Synthetic', customerPhone: '0590000000', city: 'Test', area: 'Test', address: 'Test' })) });
    await t.test('calendar grouping, exclusive end, canceled exclusion and average reconcile against fixture rows', async () => {
      const report = await getDashboardAnalytics('week', now);
      assert.equal(report.daily.length, 7); assert.equal(report.totals.orders, 4);
      assert.equal(report.totals.canceled, 1); assert.equal(report.totals.delivered, 1);
      assert.ok(Math.abs(report.totals.orderValue - 60.50) < 1e-8);
      assert.equal(report.totals.deliveredValue, 30.25); assert.equal(report.totals.pendingDelivery, 2);
      assert.ok(Math.abs(report.averageOrderValue - 60.50 / 3) < 1e-8);
      assert.equal(report.daily.at(-1)?.orders, 1); assert.equal(report.daily.at(-2)?.orders, 1);
      assert.equal(report.daily.filter(row => row.orders === 0).length, 4);
    });
    await t.test('a changed current status changes values without creating a second order', async () => {
      await prisma.order.update({ where: { id: 'pending' }, data: { status: 'CANCELED' } });
      const report = await getDashboardAnalytics('week', now);
      assert.equal(report.totals.orders, 4); assert.equal(report.totals.canceled, 2);
      assert.ok(Math.abs(report.totals.orderValue - 50.40) < 1e-8);
      assert.equal(report.totals.pendingDelivery, 1);
    });
    await t.test('empty and canceled-only periods have zero averages and no NaN', async () => {
      const empty = await getDashboardAnalytics('month', new Date('2025-01-01T12:00:00Z'));
      assert.equal(empty.totals.orders, 0); assert.equal(empty.averageOrderValue, 0); assert.equal(empty.daily.length, 30);
      await prisma.order.updateMany({ data: { status: 'CANCELED' } });
      const canceled = await getDashboardAnalytics('week', now);
      assert.equal(canceled.averageOrderValue, 0); assert.equal(canceled.totals.orderValue, 0);
    });
  } finally { await prisma.$disconnect(); await socket.stop(); await db.close(); }
});
