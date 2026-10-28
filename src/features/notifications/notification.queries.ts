import 'server-only';
import { prisma } from '@/lib/prisma';
import { orderOutboxEnabled } from './notification-config';

export async function getOrderActivity(adminId: string) {
  const [groups, latest] = await Promise.all([
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.order.findFirst({ orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], select: { id: true, updatedAt: true } })
  ]);
  const outboxEnabled = orderOutboxEnabled();
  const unread = outboxEnabled ? await prisma.orderNotification.count({ where: { reads: { none: { adminId } } } }) : 0;
  const failed = outboxEnabled ? await prisma.orderNotification.count({ where: { deliveryStatus: { in: ['FAILED', 'UNCERTAIN'] } } }) : 0;
  const latestNotification = outboxEnabled ? await prisma.orderNotification.findFirst({ orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], select: { id: true, updatedAt: true } }) : null;
  const counts = groups.map(group => `${group.status}:${group._count._all}`).sort().join(',');
  return {
    revision: `${counts}|${latest?.id ?? ''}|${latest?.updatedAt.toISOString() ?? ''}|${latestNotification?.id ?? ''}|${latestNotification?.updatedAt.toISOString() ?? ''}|${unread}|${failed}`,
    pendingOrders: groups.find(group => group.status === 'PENDING')?._count._all ?? 0,
    unread, failed, outboxEnabled
  };
}

export async function getNotifications(adminId: string, rawPage: number) {
  if (!orderOutboxEnabled()) return { enabled: false, rows: [], page: 1, pageCount: 1, unread: 0 };
  const [total, unread] = await Promise.all([
    prisma.orderNotification.count(),
    prisma.orderNotification.count({ where: { reads: { none: { adminId } } } })
  ]);
  const pageCount = Math.max(1, Math.ceil(total / 25));
  const page = Math.min(pageCount, Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1);
  const events = await prisma.orderNotification.findMany({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 25, skip: (page - 1) * 25,
    include: { reads: { where: { adminId }, select: { readAt: true } } }
  });
  const orders = await prisma.order.findMany({ where: { id: { in: events.map(row => row.orderId) } }, select: { id: true, orderNumber: true } });
  const byId = new Map(orders.map(row => [row.id, row.orderNumber]));
  return { enabled: true, unread, page, pageCount, rows: events.map(row => ({
    id: row.id, orderId: row.orderId, orderNumber: byId.get(row.orderId), status: row.deliveryStatus,
    attempts: row.attempts, errorCode: row.lastErrorCode, createdAt: row.createdAt, read: row.reads.length > 0
  })) };
}
