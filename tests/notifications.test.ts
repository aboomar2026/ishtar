import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

function mockModule(id: string, exports: unknown) {
  const filename = require.resolve(id);
  require.cache[filename] = { id: filename, filename, loaded: true, exports } as NodeModule;
}

test('durable order notifications on an isolated database with mocked transport', { timeout: 90000 }, async t => {
  const db = new PGlite();
  const ddl = execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8' });
  await db.exec(ddl);
  await db.exec('DROP TABLE "OrderNotificationAttempt", "OrderNotificationRead", "OrderNotification"');
  const socket = new PGLiteSocketServer({ db, host: '127.0.0.1', port: 0 });
  await socket.start();
  const address = socket.getServerConn();
  const connection = address.startsWith('postgres') ? address : `postgresql://postgres:test@${address}/postgres`;
  process.env.DATABASE_URL = `${connection}${connection.includes('?') ? '&' : '?'}connection_limit=1&sslmode=disable`;
  process.env.ORDER_OUTBOX_ENABLED = 'false';
  process.env.ADMIN_SESSION_SECRET = randomUUID() + randomUUID();
  process.env.TELEGRAM_BOT_TOKEN = 'ISHTAR_NOTIFICATION_TEST_ONLY';
  process.env.TELEGRAM_ADMIN_CHAT_ID = 'ISOLATED_TEST_CHAT';
  process.env.NEXT_PUBLIC_SITE_URL = 'https://ishtar-test.example.invalid';
  process.env.NEXT_PUBLIC_STORE_BRAND = 'ishtar';
  let cookie: string | undefined;
  mockModule('next/headers', { cookies: async () => ({ get: () => cookie ? { value: cookie } : undefined }) });
  mockModule('next/cache', { revalidatePath() {} });
  let mode: 'success' | 'rate-limit' | 'rejected' | 'uncertain' | 'migrated' | 'invalid' = 'success';
  let calls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => {
    assert.equal(String(url), 'https://api.telegram.org/botISHTAR_NOTIFICATION_TEST_ONLY/sendMessage');
    calls++;
    if (mode === 'uncertain') throw new Error('Synthetic network failure');
    if (mode === 'invalid') return new Response('not-json', { status: 200 });
    if (mode === 'rate-limit') return Response.json({ ok: false, error_code: 429, parameters: { retry_after: 90 } }, { status: 429 });
    if (mode === 'migrated') return Response.json({ ok: false, error_code: 400, parameters: { migrate_to_chat_id: -1000000000001 } }, { status: 400 });
    if (mode === 'rejected') return Response.json({ ok: false, error_code: 403 }, { status: 200 });
    return Response.json({ ok: true, result: { message_id: calls } });
  };
  const { prisma } = await import('../src/lib/prisma');
  const { createSessionToken } = await import('../src/features/admin/auth/admin-session');
  const { createCodOrderAction } = await import('../src/features/orders/order.actions');
  const { dispatchOrderNotification, drainOrderNotifications } = await import('../src/features/notifications/notification-dispatcher');
  const { getOrderActivity, getNotifications } = await import('../src/features/notifications/notification.queries');
  const { markNotificationReadAction, retryNotificationAction, markAllNotificationsReadAction, processQueuedNotificationsAction } = await import('../src/features/notifications/notification.actions');
  const input = (key = randomUUID(), quantity = 1) => ({ requestKey: key, fullName: 'زبونة اختبار', phone: '0590000000', city: 'اختبار', area: 'اختبار', address: 'عنوان اختبار معزول', lines: [{ variantId: 'test-variant', quantity }] });
  try {
    await prisma.adminUser.createMany({ data: ['one', 'two', 'catalog'].map(id => ({ id, name: 'Test', email: `${id}@example.invalid`, passwordHash: 'unused-test-only', role: id === 'catalog' ? 'CATALOG_MANAGER' : 'SUPER_ADMIN' })) });
    const signIn = (id: string) => { cookie = createSessionToken({ id, email: `${id}@example.invalid`, role: 'SUPER_ADMIN' }); };
    signIn('one');
    await prisma.category.create({ data: { id: 'test-category', slug: 'test', name: 'اختبار' } });
    await prisma.product.create({ data: { id: 'test-product', slug: 'test', name: 'اختبار', description: 'معزول', categoryId: 'test-category', status: 'ACTIVE', basePrice: 25,
      variants: { create: { id: 'test-variant', sku: 'TEST', price: 25, quantity: 20 } } } });
    const legacy = await createCodOrderAction(input()); assert.ok(legacy.ok);
    await t.test('disabled mode works without notification tables; additive SQL is repeatable and preserves existing orders', async () => {
      const activity = await getOrderActivity('one'); assert.equal(activity.outboxEnabled, false);
      assert.equal((await getNotifications('one', 1)).enabled, false);
      const sql = readFileSync('prisma/additive/order-notifications.sql', 'utf8');
      await db.exec(sql); await db.exec(sql);
      assert.equal(await prisma.order.count(), 1);
      assert.equal(await prisma.orderNotification.count(), 0, 'no historical notifications or messages are backfilled');
    });
    process.env.ORDER_OUTBOX_ENABLED = 'true';
    const key = randomUUID();
    mode = 'rate-limit';
    let firstId = '';
    await t.test('provider rejection cannot roll back the order; event, attempts and delayed retry persist', async () => {
      const result = await createCodOrderAction(input(key)); assert.ok(result.ok); firstId = result.orderId;
      const row = await prisma.orderNotification.findUniqueOrThrow({ where: { orderId: firstId } });
      assert.equal(row.deliveryStatus, 'RETRY'); assert.equal(row.attempts, 1);
      assert.ok(row.nextAttemptAt.getTime() >= Date.now() + 85000);
      assert.equal(await prisma.order.count(), 2);
      assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: 'test-variant' } })).quantity, 18);
      assert.equal(await prisma.orderNotificationAttempt.count(), 1);
      const before = calls;
      const replay = await createCodOrderAction(input(key)); assert.ok(replay.ok); assert.equal(replay.orderId, firstId);
      assert.equal(calls, before); assert.equal(await prisma.orderNotification.count(), 1);
      assert.equal(await dispatchOrderNotification(firstId), false, 'retry_after must be honored');
    });
    await t.test('a due retry succeeds once and sent events are not sent again', async () => {
      await prisma.orderNotification.update({ where: { orderId: firstId }, data: { nextAttemptAt: new Date(0) } });
      mode = 'success'; assert.equal(await drainOrderNotifications(), 1);
      const row = await prisma.orderNotification.findUniqueOrThrow({ where: { orderId: firstId } });
      assert.equal(row.deliveryStatus, 'SENT'); assert.equal(row.attempts, 2); assert.ok(row.sentAt);
      assert.equal(await dispatchOrderNotification(firstId), false);
      assert.equal(await prisma.orderNotificationAttempt.count(), 2);
    });
    await t.test('enqueue failure rolls back order, stock and ledger atomically', async () => {
      const before = await prisma.inventoryLog.count();
      await db.exec(`CREATE FUNCTION qa_fail_event() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'synthetic enqueue failure'; END $$ LANGUAGE plpgsql;
        CREATE TRIGGER qa_fail_event BEFORE INSERT ON "OrderNotification" FOR EACH ROW EXECUTE FUNCTION qa_fail_event();`);
      const result = await createCodOrderAction(input()); assert.equal(result.ok, false);
      await db.exec('DROP TRIGGER qa_fail_event ON "OrderNotification"; DROP FUNCTION qa_fail_event()');
      assert.equal(await prisma.order.count(), 2); assert.equal(await prisma.inventoryLog.count(), before);
      assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: 'test-variant' } })).quantity, 18);
    });
    await t.test('read state belongs to each admin, and catalog staff cannot read or retry notifications', async () => {
      const row = await prisma.orderNotification.findUniqueOrThrow({ where: { orderId: firstId } });
      assert.equal((await getOrderActivity('one')).unread, 1);
      assert.equal((await markNotificationReadAction(row.id)).ok, true);
      assert.equal((await markNotificationReadAction(row.id)).ok, true);
      assert.equal((await getOrderActivity('one')).unread, 0);
      assert.equal((await getOrderActivity('two')).unread, 1);
      assert.equal(await prisma.orderNotificationRead.count(), 1);
      signIn('two');
      assert.equal((await markAllNotificationsReadAction()).ok, true);
      assert.equal((await markAllNotificationsReadAction()).ok, true);
      assert.equal((await getOrderActivity('two')).unread, 0);
      signIn('catalog');
      await assert.rejects(() => markNotificationReadAction(row.id), /NEXT_REDIRECT/);
      await assert.rejects(() => retryNotificationAction(row.id, true), /NEXT_REDIRECT/);
      await assert.rejects(markAllNotificationsReadAction, /NEXT_REDIRECT/);
      await assert.rejects(processQueuedNotificationsAction, /NEXT_REDIRECT/);
      signIn('one');
    });
    await t.test('expired in-flight leases become uncertain without resending; explicit acknowledgement is required', async () => {
      const event = await prisma.orderNotification.create({ data: { orderId: legacy.orderId, deliveryStatus: 'PROCESSING', attempts: 1, leaseToken: randomUUID(), leaseUntil: new Date(0) } });
      await prisma.orderNotificationAttempt.create({ data: { notificationId: event.id, attempt: 1 } });
      const before = calls;
      assert.equal(await dispatchOrderNotification(legacy.orderId), false);
      assert.equal(calls, before);
      assert.equal((await prisma.orderNotification.findUniqueOrThrow({ where: { id: event.id } })).deliveryStatus, 'UNCERTAIN');
      assert.equal((await retryNotificationAction(event.id)).ok, false);
      assert.equal((await retryNotificationAction(event.id, true)).ok, true);
      assert.equal((await processQueuedNotificationsAction()).ok, true);
      assert.equal((await prisma.orderNotification.findUniqueOrThrow({ where: { id: event.id } })).deliveryStatus, 'SENT');
    });
    await t.test('network loss and malformed success remain uncertain, not automatic duplicate sends', async () => {
      for (const nextMode of ['uncertain', 'invalid'] as const) {
        mode = nextMode;
        const result = await createCodOrderAction(input()); assert.ok(result.ok);
        assert.equal((await prisma.orderNotification.findUniqueOrThrow({ where: { orderId: result.orderId } })).deliveryStatus, 'UNCERTAIN');
      }
      const before = calls; assert.equal(await drainOrderNotifications(), 0); assert.equal(calls, before);
    });
    await t.test('a persistence failure after provider success leaves a recoverable uncertain send, not a second order', async () => {
      mode = 'success';
      await db.exec(`CREATE FUNCTION qa_fail_receipt() RETURNS trigger AS $$ BEGIN IF NEW."deliveryStatus" = 'SENT' THEN RAISE EXCEPTION 'synthetic receipt persistence failure'; END IF; RETURN NEW; END $$ LANGUAGE plpgsql;
        CREATE TRIGGER qa_fail_receipt BEFORE UPDATE ON "OrderNotification" FOR EACH ROW EXECUTE FUNCTION qa_fail_receipt();`);
      const result = await createCodOrderAction(input()); assert.ok(result.ok);
      await db.exec('DROP TRIGGER qa_fail_receipt ON "OrderNotification"; DROP FUNCTION qa_fail_receipt()');
      const row = await prisma.orderNotification.findUniqueOrThrow({ where: { orderId: result.orderId } });
      assert.equal(row.deliveryStatus, 'PROCESSING');
      await prisma.orderNotification.update({ where: { id: row.id }, data: { leaseUntil: new Date(0) } });
      const before = calls;
      assert.equal(await dispatchOrderNotification(result.orderId), false); assert.equal(calls, before);
      assert.equal((await prisma.orderNotification.findUniqueOrThrow({ where: { id: row.id } })).deliveryStatus, 'UNCERTAIN');
    });
    await t.test('API ok:false on HTTP 200, migrated chat and missing credentials are terminal and visible', async () => {
      for (const nextMode of ['rejected', 'migrated'] as const) {
        mode = nextMode; const result = await createCodOrderAction(input()); assert.ok(result.ok);
        const row = await prisma.orderNotification.findUniqueOrThrow({ where: { orderId: result.orderId } });
        assert.equal(row.deliveryStatus, 'FAILED'); assert.equal(row.lastErrorCode, nextMode === 'migrated' ? 'CHAT_MIGRATED' : 'REJECTED');
      }
      delete process.env.TELEGRAM_BOT_TOKEN;
      const result = await createCodOrderAction(input()); assert.ok(result.ok);
      assert.equal((await prisma.orderNotification.findUniqueOrThrow({ where: { orderId: result.orderId } })).lastErrorCode, 'MISSING_CONFIG');
      process.env.TELEGRAM_BOT_TOKEN = 'ISHTAR_NOTIFICATION_TEST_ONLY';
    });
    await t.test('retry cap stops repeated known transient failures', async () => {
      const event = await prisma.orderNotification.findFirstOrThrow({ where: { deliveryStatus: 'FAILED' } });
      await prisma.orderNotification.update({ where: { id: event.id }, data: { deliveryStatus: 'RETRY', attempts: 4, nextAttemptAt: new Date(0) } });
      mode = 'rate-limit'; assert.equal(await dispatchOrderNotification(event.orderId), true);
      assert.equal((await prisma.orderNotification.findUniqueOrThrow({ where: { id: event.id } })).deliveryStatus, 'FAILED');
      assert.equal(await dispatchOrderNotification(event.orderId), false);
    });
    await t.test('worker endpoint requires both flags and a valid secret before any dispatch', async () => {
      const { POST } = await import('../src/app/api/internal/order-notifications/dispatch/route');
      process.env.ORDER_OUTBOX_WORKER_SECRET = randomUUID() + randomUUID();
      process.env.ORDER_OUTBOX_WORKER_ENABLED = 'false';
      assert.equal((await POST(new Request('https://test.invalid', { method: 'POST' }))).status, 404);
      process.env.ORDER_OUTBOX_WORKER_ENABLED = 'true';
      assert.equal((await POST(new Request('https://test.invalid', { method: 'POST' }))).status, 401);
      assert.equal((await POST(new Request('https://test.invalid', { method: 'POST', headers: { Authorization: `Bearer ${process.env.ORDER_OUTBOX_WORKER_SECRET}` } }))).status, 200);
    });
  } finally {
    globalThis.fetch = originalFetch;
    await prisma.$disconnect(); await socket.stop(); await db.close();
  }
});
