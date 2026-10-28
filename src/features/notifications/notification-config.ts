export function orderOutboxEnabled(): boolean {
  return process.env.ORDER_OUTBOX_ENABLED === 'true';
}

export const MAX_NOTIFICATION_ATTEMPTS = 5;
export const NOTIFICATION_LEASE_MS = 30_000;

export function notificationRetryDelay(attempt: number, retryAfterSeconds = 0): number {
  const backoff = Math.min(3600, 30 * 2 ** Math.max(0, attempt - 1));
  return Math.max(backoff, Math.min(604800, retryAfterSeconds)) * 1000;
}
