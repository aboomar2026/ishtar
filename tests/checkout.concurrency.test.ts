import assert from 'node:assert/strict';
import { execFileSync, fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PrismaClient, Prisma } from '@prisma/client';
import { concurrencyDatabaseUrl } from './runtime/postgres-target';
import type { RaceOperation } from './runtime/concurrency-worker';

type WorkerMessage = { type: 'ready'; pid: number } | { type: 'result'; result: { ok: boolean; orderId?: string }; messages: number } | { type: 'error'; message: string };
type Result = Extract<WorkerMessage, { type: 'result' }>;

// Deliberately fail, not skip, when the conventional PostgreSQL target is absent.
test('independent PostgreSQL checkout and stock races', { timeout: 90000 }, async t => {
  process.env.ORDER_OUTBOX_ENABLED = 'false';
  const schema = `qa_${randomUUID().replaceAll('-', '')}`;
  const url = concurrencyDatabaseUrl(process.env.ISHTAR_TEST_POSTGRES_URL, schema);
  const db = new PrismaClient({ datasources: { db: { url } } });
  const locker = new PrismaClient({ datasources: { db: { url } } });
  let schemaCreated = false;
  try {
    await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    schemaCreated = true;
    const ddl = execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8' });
    execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'db', 'execute', '--url', url, '--stdin'], { input: ddl, stdio: ['pipe', 'pipe', 'pipe'] });
    // Exercise the reviewed additive SQL on conventional PostgreSQL, not only generated DDL.
    await db.$executeRawUnsafe('DROP TABLE "OrderNotificationAttempt", "OrderNotificationRead", "OrderNotification"');
    const additive = readFileSync('prisma/additive/order-notifications.sql', 'utf8');
    for (let index = 0; index < 2; index++) execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'db', 'execute', '--url', url, '--stdin'], { input: additive, stdio: ['pipe', 'pipe', 'pipe'] });
    await db.adminUser.create({ data: { id: 'qa-admin', name: 'مدير اختبار', email: 'qa@example.invalid', passwordHash: 'unused-test-only', role: 'SUPER_ADMIN' } });
    await db.category.create({ data: { id: 'qa-category', name: 'اختبار', slug: 'qa' } });
    await db.product.create({ data: { id: 'qa-product', name: 'منتج اختبار', description: 'بيانات مصطنعة ومعزولة', slug: 'qa-product', categoryId: 'qa-category', status: 'ACTIVE', basePrice: 99,
      variants: { create: { id: 'qa-variant', sku: 'QA', price: 25, quantity: 1 } } } });

    async function reset(quantity: number) {
      // These deletes can only reach this run's newly created random schema.
      await db.orderNotification.deleteMany();
      await db.inventoryLog.deleteMany(); await db.order.deleteMany();
      await db.productVariant.update({ where: { id: 'qa-variant' }, data: { quantity } });
      await db.product.update({ where: { id: 'qa-product' }, data: { soldCount: 0 } });
    }

    function worker(operation: RaceOperation) {
      const child = fork('tests/runtime/concurrency-worker.ts', [], { execArgv: ['--require', './tests/runtime/server-marker.cjs', '--import', 'tsx'],
        env: { ...process.env, ISHTAR_TEST_SCHEMA: schema, DATABASE_URL: url, ADMIN_SESSION_SECRET: 'isolated-race-session-secret', NEXT_PUBLIC_STORE_BRAND: 'ishtar' },
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
      let readyResolve!: (pid: number) => void;
      let readyReject!: (error: Error) => void;
      let resultResolve!: (message: Result) => void;
      let resultReject!: (error: Error) => void;
      const ready = new Promise<number>((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
      const result = new Promise<Result>((resolve, reject) => { resultResolve = resolve; resultReject = reject; });
      // Attach rejection handlers immediately; startup errors must not become unhandled rejections.
      void ready.catch(() => {}); void result.catch(() => {});
      child.on('message', (message: WorkerMessage) => {
        if (message.type === 'ready') readyResolve(message.pid);
        else if (message.type === 'result') resultResolve(message);
        else { const error = new Error(message.message); readyReject(error); resultReject(error); }
      });
      child.on('error', error => { readyReject(error); resultReject(error); });
      child.on('exit', code => { if (code) { const error = new Error(`Race worker exited ${code}`); readyReject(error); resultReject(error); } });
      return { child, ready, result, start: () => child.send(operation) };
    }

    async function race(operations: [RaceOperation, RaceOperation], lock: 'variant' | string = 'variant') {
      const workers = operations.map(worker);
      let release = () => {};
      let held: Promise<unknown> | undefined;
      try {
        const pids = await Promise.all(workers.map(w => w.ready));
        assert.equal(new Set(pids).size, 2, 'must be independent backend connections, not a single serialized PGlite backend');
        const [{ pid: observerPid }] = await db.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid()::int AS pid`;
        assert.ok(!pids.includes(observerPid));
        let acquired!: () => void;
        const acquiredPromise = new Promise<void>(resolve => { acquired = resolve; });
        const released = new Promise<void>(resolve => { release = resolve; });
        held = locker.$transaction(async tx => {
          if (lock === 'variant') await tx.$queryRaw`SELECT id FROM "ProductVariant" WHERE id = 'qa-variant' FOR UPDATE`;
          else if (lock.startsWith('notification:')) await tx.$queryRaw`SELECT id FROM "OrderNotification" WHERE id = ${lock.slice('notification:'.length)} FOR UPDATE`;
          else await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${lock} FOR UPDATE`;
          acquired(); await released;
        }, { timeout: 15000 });
        await Promise.race([acquiredPromise, held.then(() => { throw new Error('Blocker ended before acquiring lock'); })]);
        workers.forEach(w => w.start());
        let blocked = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          const [{ count }] = await db.$queryRaw<{ count: number }[]>(Prisma.sql`SELECT count(*)::int AS count FROM pg_stat_activity WHERE pid IN (${Prisma.join(pids)}) AND wait_event_type = 'Lock'`);
          if (count === 2) { blocked = true; break; }
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        assert.ok(blocked, 'both real action transactions must overlap and wait on locks before release');
        release(); await held;
        return await Promise.all(workers.map(w => w.result));
      } finally {
        release(); await held?.catch(() => {});
        workers.forEach(w => w.child.kill());
      }
    }

    await t.test('two different attempts compete for the last item without overselling', async () => {
      await reset(1);
      const results = await race([{ kind: 'checkout', key: randomUUID() }, { kind: 'checkout', key: randomUUID() }]);
      assert.equal(results.filter(r => r.result.ok).length, 1);
      assert.equal(await db.order.count(), 1);
      assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: 'qa-variant' } })).quantity, 0);
      assert.equal(await db.inventoryLog.count(), 1);
      assert.equal(results.reduce((count, r) => count + r.messages, 0), 1);
    });
    await t.test('simultaneous replay returns the same receipt and sends once', async () => {
      await reset(2); const key = randomUUID();
      const results = await race([{ kind: 'checkout', key }, { kind: 'checkout', key }]);
      assert.ok(results.every(r => r.result.ok));
      assert.equal(results[0].result.orderId, results[1].result.orderId);
      assert.equal(await db.order.count(), 1); assert.equal(await db.inventoryLog.count(), 1);
      assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: 'qa-variant' } })).quantity, 1);
      assert.equal(results.reduce((count, r) => count + r.messages, 0), 1);
    });
    await t.test('the same key with different payloads cannot create two orders', async () => {
      await reset(2); const key = randomUUID();
      const results = await race([{ kind: 'checkout', key }, { kind: 'checkout', key, address: 'عنوان اختبار مختلف' }]);
      assert.equal(results.filter(r => r.result.ok).length, 1);
      assert.equal(await db.order.count(), 1); assert.equal(await db.inventoryLog.count(), 1);
    });
    await t.test('two cancellations restore stock exactly once', async () => {
      const order = await db.order.findFirstOrThrow();
      const before = (await db.productVariant.findUniqueOrThrow({ where: { id: 'qa-variant' } })).quantity;
      const results = await race([{ kind: 'cancel', orderId: order.id }, { kind: 'cancel', orderId: order.id }], order.id);
      assert.equal(results.filter(r => r.result.ok).length, 1);
      assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: 'qa-variant' } })).quantity, before + 1);
      assert.equal(await db.inventoryLog.count({ where: { type: 'ORDER_CANCELED' } }), 1);
      assert.equal(await db.orderStatusHistory.count({ where: { toStatus: 'CANCELED' } }), 1);
    });
    await t.test('cancellation racing a manual stock target preserves the inventory ledger', async () => {
      await reset(1);
      const setup = worker({ kind: 'checkout', key: randomUUID() });
      let created: Result;
      try { await setup.ready; setup.start(); created = await setup.result; } finally { setup.child.kill(); }
      assert.ok(created.result.ok && created.result.orderId);
      const results = await race([{ kind: 'cancel', orderId: created.result.orderId }, { kind: 'stock', quantity: 5 }]);
      assert.ok(results.every(r => r.result.ok));
      const quantity = (await db.productVariant.findUniqueOrThrow({ where: { id: 'qa-variant' } })).quantity;
      const ledger = await db.inventoryLog.aggregate({ _sum: { quantityChange: true } });
      assert.ok(quantity === 5 || quantity === 6);
      assert.equal(1 + (ledger._sum.quantityChange ?? 0), quantity);
    });
    await t.test('simultaneous checkout replay enqueues and sends only one durable notification', async () => {
      process.env.ORDER_OUTBOX_ENABLED = 'true';
      await reset(2); const key = randomUUID();
      const results = await race([{ kind: 'checkout', key }, { kind: 'checkout', key }]);
      assert.ok(results.every(row => row.result.ok));
      assert.equal(await db.orderNotification.count(), 1);
      assert.equal(await db.orderNotificationAttempt.count(), 1);
      assert.equal(results.reduce((count, row) => count + row.messages, 0), 1);
    });
    await t.test('two independent dispatchers cannot claim the same due event', async () => {
      const event = await db.orderNotification.findFirstOrThrow();
      await db.orderNotification.update({ where: { id: event.id }, data: { deliveryStatus: 'RETRY', nextAttemptAt: new Date(0), sentAt: null } });
      const results = await race([{ kind: 'dispatch', orderId: event.orderId }, { kind: 'dispatch', orderId: event.orderId }], `notification:${event.id}`);
      assert.equal(results.filter(row => row.result.ok).length, 1);
      assert.equal(results.reduce((count, row) => count + row.messages, 0), 1);
      assert.equal((await db.orderNotification.findUniqueOrThrow({ where: { id: event.id } })).deliveryStatus, 'SENT');
      assert.equal(await db.orderNotificationAttempt.count(), 2);
    });
  } finally {
    await locker.$disconnect();
    if (schemaCreated) await db.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await db.$disconnect();
  }
});
