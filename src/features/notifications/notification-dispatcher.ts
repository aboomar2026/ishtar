import 'server-only';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { notifyAdminAboutNewOrder } from '@/features/orders/order-notifications';
import { MAX_NOTIFICATION_ATTEMPTS, NOTIFICATION_LEASE_MS, notificationRetryDelay, orderOutboxEnabled } from './notification-config';

/** Claim first; never keep a transaction/row lock open during a provider request. */
export async function dispatchOrderNotification(orderId?: string): Promise<boolean> {
  if (!orderOutboxEnabled()) return false;
  const now = new Date();
  const token = randomUUID();
  const claimed = await prisma.$transaction(async tx => {
    // An expired in-flight send is ambiguous. An operator decides whether to resend.
    const expired = await tx.orderNotification.findMany({
      where: { deliveryStatus: 'PROCESSING', leaseUntil: { lte: now } }, select: { id: true, leaseToken: true, attempts: true }, take: 10
    });
    for (const row of expired) {
      const changed = await tx.orderNotification.updateMany({ where: { id: row.id, deliveryStatus: 'PROCESSING', leaseToken: row.leaseToken, leaseUntil: { lte: now } },
        data: { deliveryStatus: 'UNCERTAIN', lastErrorCode: 'LEASE_EXPIRED', leaseToken: null, leaseUntil: null } });
      if (changed.count) await tx.orderNotificationAttempt.updateMany({ where: { notificationId: row.id, attempt: row.attempts, outcome: 'PROCESSING' },
        data: { outcome: 'UNCERTAIN', errorCode: 'LEASE_EXPIRED', finishedAt: now } });
    }
    const row = await tx.orderNotification.findFirst({
      where: { ...(orderId ? { orderId } : {}), deliveryStatus: { in: ['PENDING', 'RETRY'] }, nextAttemptAt: { lte: now } },
      orderBy: [{ nextAttemptAt: 'asc' }, { id: 'asc' }]
    });
    if (!row) return null;
    const changed = await tx.orderNotification.updateMany({ where: { id: row.id, deliveryStatus: row.deliveryStatus, attempts: row.attempts, nextAttemptAt: { lte: now } },
      data: { deliveryStatus: 'PROCESSING', attempts: { increment: 1 }, leaseToken: token, leaseUntil: new Date(now.getTime() + NOTIFICATION_LEASE_MS), lastErrorCode: null } });
    if (!changed.count) return null;
    await tx.orderNotificationAttempt.create({ data: { notificationId: row.id, attempt: row.attempts + 1 } });
    return { ...row, attempts: row.attempts + 1 };
  });
  if (!claimed) return false;

  let result;
  try { result = await notifyAdminAboutNewOrder(claimed.orderId); }
  catch { result = { ok: false as const, skipped: false as const, status: 0, code: 'UNCERTAIN' as const }; }
  const finishedAt = new Date();
  const errorCode = result.ok ? null : result.skipped ? 'MISSING_CONFIG' : result.code;
  const status = result.ok ? 'SENT' : !result.skipped && result.code === 'UNCERTAIN' ? 'UNCERTAIN'
    : !result.skipped && result.code === 'RETRYABLE' && claimed.attempts < MAX_NOTIFICATION_ATTEMPTS ? 'RETRY' : 'FAILED';
  const retryAfter = !result.ok && !result.skipped ? result.retryAfter : undefined;
  await prisma.$transaction(async tx => {
    const changed = await tx.orderNotification.updateMany({ where: { id: claimed.id, deliveryStatus: 'PROCESSING', leaseToken: token },
      data: { deliveryStatus: status, lastErrorCode: errorCode, sentAt: result.ok ? finishedAt : null,
        nextAttemptAt: new Date(finishedAt.getTime() + notificationRetryDelay(claimed.attempts, retryAfter)), leaseToken: null, leaseUntil: null } });
    if (changed.count) await tx.orderNotificationAttempt.updateMany({ where: { notificationId: claimed.id, attempt: claimed.attempts, outcome: 'PROCESSING' },
      data: { outcome: status, errorCode, finishedAt } });
  });
  return true;
}

export async function drainOrderNotifications(limit = 3): Promise<number> {
  let processed = 0;
  const startedAt = Date.now();
  for (let index = 0; index < Math.min(3, Math.max(0, limit)); index++) {
    if (Date.now() - startedAt > 15000) break;
    if (!await dispatchOrderNotification()) break;
    processed++;
  }
  return processed;
}
