import { createSessionToken, ADMIN_SESSION_COOKIE } from '../../src/features/admin/auth/admin-session';
import { concurrencyDatabaseUrl } from './postgres-target';

export type RaceOperation =
  | { kind: 'checkout'; key: string; address?: string }
  | { kind: 'cancel'; orderId: string }
  | { kind: 'stock'; quantity: number }
  | { kind: 'dispatch'; orderId: string };

// Verify the test target in every process before importing any database client.
process.env.DATABASE_URL = concurrencyDatabaseUrl(process.env.ISHTAR_TEST_POSTGRES_URL, process.env.ISHTAR_TEST_SCHEMA ?? '');
process.env.TELEGRAM_BOT_TOKEN = 'ISHTAR_CONCURRENCY_TEST_ONLY';
process.env.TELEGRAM_ADMIN_CHAT_ID = 'ISOLATED_TEST_CHAT';
const cookie = createSessionToken({ id: 'qa-admin', email: 'qa@example.invalid', role: 'SUPER_ADMIN' });
function mockModule(id: string, exports: unknown) {
  const filename = require.resolve(id);
  require.cache[filename] = { id: filename, filename, loaded: true, exports } as NodeModule;
}
// Framework request/cache boundaries only: actions, auth, Prisma and stock SQL are real.
mockModule('next/headers', { cookies: async () => ({ get: (name: string) => name === ADMIN_SESSION_COOKIE ? { value: cookie } : undefined }) });
mockModule('next/cache', { revalidatePath() {} });
let messages = 0;
globalThis.fetch = async url => {
  if (String(url) !== 'https://api.telegram.org/botISHTAR_CONCURRENCY_TEST_ONLY/sendMessage') throw new Error('External network forbidden in race worker');
  messages++;
  return new Response('{"ok":true,"result":{"message_id":1}}', { status: 200 });
};

async function main() {
  const { prisma } = await import('../../src/lib/prisma');
  const [{ pid }] = await prisma.$queryRaw<{ pid: number }[]>`SELECT pg_backend_pid()::int AS pid`;
  process.send?.({ type: 'ready', pid });
  process.once('message', async (operation: RaceOperation) => {
    try {
      let result;
      if (operation.kind === 'checkout') {
        const { createCodOrderAction } = await import('../../src/features/orders/order.actions');
        result = await createCodOrderAction({ requestKey: operation.key, fullName: 'زبونة اختبار معزولة', phone: '0590000000',
          city: 'مدينة اختبار', area: 'اختبار', address: operation.address ?? 'عنوان مصطنع للاختبار', lines: [{ variantId: 'qa-variant', quantity: 1 }] });
      } else if (operation.kind === 'cancel') {
        const { updateOrderStatusAction } = await import('../../src/features/admin/orders/order-admin.actions');
        result = await updateOrderStatusAction(operation.orderId, 'CANCELED');
      } else if (operation.kind === 'dispatch') {
        const { dispatchOrderNotification } = await import('../../src/features/notifications/notification-dispatcher');
        result = { ok: await dispatchOrderNotification(operation.orderId) };
      } else {
        const { adjustVariantQuantityAction } = await import('../../src/features/admin/inventory/inventory-admin.actions');
        result = await adjustVariantQuantityAction('qa-variant', operation.quantity);
      }
      process.send?.({ type: 'result', result, messages });
    } catch (error) {
      process.send?.({ type: 'error', message: error instanceof Error ? error.message : 'Race worker failed' });
    } finally {
      await prisma.$disconnect();
      process.disconnect?.();
    }
  });
}
main().catch(error => { process.send?.({ type: 'error', message: error instanceof Error ? error.message : 'Worker startup failed' }); process.exitCode = 1; });
