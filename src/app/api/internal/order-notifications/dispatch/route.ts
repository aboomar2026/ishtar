import { createHash, timingSafeEqual } from 'node:crypto';
import { orderOutboxEnabled } from '@/features/notifications/notification-config';
import { drainOrderNotifications } from '@/features/notifications/notification-dispatcher';

export const dynamic = 'force-dynamic';
export const maxDuration = 25;

export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  const expected = process.env.ORDER_OUTBOX_WORKER_SECRET;
  if (!orderOutboxEnabled() || process.env.ORDER_OUTBOX_WORKER_ENABLED !== 'true' || !expected || expected.length < 32) {
    return Response.json({ error: 'DISABLED' }, { status: 404, headers });
  }
  const authorization = request.headers.get('authorization') ?? '';
  const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const digest = (value: string) => createHash('sha256').update(value).digest();
  if (supplied.length > 512 || !timingSafeEqual(digest(supplied), digest(expected))) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401, headers });
  try { return Response.json({ processed: await drainOrderNotifications() }, { headers }); }
  catch { return Response.json({ error: 'DISPATCH_UNAVAILABLE' }, { status: 503, headers }); }
}
