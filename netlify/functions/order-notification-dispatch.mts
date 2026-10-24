// Scheduled functions are not public HTTP triggers. Never log the worker secret.
export default async function dispatchNotifications() {
  if (process.env.ORDER_OUTBOX_ENABLED !== 'true' || process.env.ORDER_OUTBOX_WORKER_ENABLED !== 'true') return;
  const secret = process.env.ORDER_OUTBOX_WORKER_SECRET;
  if (!secret || secret.length < 32) throw new Error('Notification worker secret is not configured');
  const origin = process.env.DEPLOY_URL ?? process.env.URL;
  if (!origin || new URL(origin).protocol !== 'https:') throw new Error('Worker requires its deployed HTTPS origin');
  const response = await fetch(new URL('/api/internal/order-notifications/dispatch', origin), {
    method: 'POST', headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(25_000), redirect: 'error'
  });
  if (!response.ok) throw new Error(`Notification worker returned HTTP ${response.status}`);
}

export const config = { schedule: '* * * * *' };
