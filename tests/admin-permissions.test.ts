import assert from 'node:assert/strict';
import test from 'node:test';
import { hasAdminPermission, adminLandingPath } from '../src/features/admin/auth/admin-permissions';
import { normalizeAdminOrderParams } from '../src/features/admin/orders/order-list-params';

function mockModule(id: string, exports: unknown) {
  const filename = require.resolve(id);
  require.cache[filename] = { id: filename, filename, loaded: true, exports } as NodeModule;
}

test('catalog staff keep catalog access, unknown roles fail closed and order access is explicit', () => {
  assert.equal(hasAdminPermission('SUPER_ADMIN', 'orders'), true);
  assert.equal(hasAdminPermission('CATALOG_MANAGER', 'orders'), false);
  assert.equal(hasAdminPermission('CATALOG_MANAGER', 'catalog'), true);
  assert.equal(hasAdminPermission('unknown', 'catalog'), false);
  assert.equal(adminLandingPath('CATALOG_MANAGER'), '/admin/products');
});

test('order URL values cannot send invalid enums or unbounded pages to Prisma', () => {
  assert.deepEqual(normalizeAdminOrderParams({ status: 'INVALID', delivery: 'INVALID', date: 'INVALID', page: Infinity }),
    { q: '', status: 'ALL', delivery: 'ALL', date: 'all', page: 1 });
  assert.equal(normalizeAdminOrderParams({ page: -2 }).page, 1);
  assert.equal(normalizeAdminOrderParams({ page: '2.8' }).page, 2);
  assert.equal(normalizeAdminOrderParams({ page: 1e12, q: 'x'.repeat(300) }).q.length, 200);
});

test('actual order guards and every mutation reject catalog staff before touching order data', async () => {
  process.env.ADMIN_SESSION_SECRET = 'isolated-permission-test-secret';
  let cookie: string | undefined;
  let databaseRole = 'CATALOG_MANAGER';
  let active = true;
  let orderCalls = 0;
  const failIfReached = () => { orderCalls++; throw new Error('private order access reached'); };
  mockModule('next/headers', { cookies: async () => ({ get: () => cookie ? { value: cookie } : undefined }) });
  mockModule('../src/lib/prisma', { prisma: {
    adminUser: { findUnique: async () => ({ id: 'staff', name: 'Test', email: 'staff@example.invalid', role: databaseRole, isActive: active }) },
    order: { findUnique: failIfReached, update: failIfReached }, $transaction: failIfReached
  } });
  const { createSessionToken } = await import('../src/features/admin/auth/admin-session');
  const { requireAdmin, requireOrderAdmin } = await import('../src/features/admin/auth/admin-auth');
  // A stale SUPER_ADMIN claim cannot override the current role in the database.
  cookie = createSessionToken({ id: 'staff', email: 'staff@example.invalid', role: 'SUPER_ADMIN' });
  assert.equal((await requireAdmin()).role, 'CATALOG_MANAGER');
  const denied = (error: unknown) => String((error as { digest?: string }).digest).includes('/admin/products');
  await assert.rejects(requireOrderAdmin, denied);
  const actions = await import('../src/features/admin/orders/order-admin.actions');
  const operations = await import('../src/features/admin/orders/order-operations.actions');
  for (const run of [
    () => actions.updateOrderStatusAction('private', 'CANCELED'),
    () => actions.updateOrderDeliveryFeeAction('private', { mode: 'FREE' }),
    () => actions.updateOrderAdminNoteAction('private', 'test'),
    () => operations.updateOrderNotesAction('private', {}),
    () => operations.markOrderPrintedAction('private', 'invoice'),
    () => operations.setOrderPackedAction('private', true)
  ]) await assert.rejects(run, denied);
  assert.equal(orderCalls, 0);
  databaseRole = 'SUPER_ADMIN';
  assert.equal((await requireOrderAdmin()).role, 'SUPER_ADMIN');
  databaseRole = 'unknown';
  await assert.rejects(requireAdmin, error => String((error as { digest?: string }).digest).includes('/admin/login'));
  databaseRole = 'SUPER_ADMIN';
  active = false;
  await assert.rejects(requireOrderAdmin, error => String((error as { digest?: string }).digest).includes('/admin/login'));
  active = true;
  cookie = undefined;
  await assert.rejects(requireOrderAdmin, error => String((error as { digest?: string }).digest).includes('/admin/login'));
});
