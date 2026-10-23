import type { DeliveryFeeStatus, OrderStatus } from '@prisma/client';

export type AdminOrderDateFilter = 'all' | 'today' | '7d';
export type AdminDeliveryFeeFilter = 'ALL' | DeliveryFeeStatus;
export type AdminOrderListParams = {
  q?: string;
  status?: OrderStatus | 'ALL';
  date?: AdminOrderDateFilter;
  delivery?: AdminDeliveryFeeFilter;
  page?: number;
};

export const ADMIN_ORDER_PAGE_SIZE = 50;
const statuses = ['ALL', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELED'];

export function normalizeAdminOrderParams(raw: Record<string, unknown>): Required<AdminOrderListParams> {
  const page = Number(raw.page);
  return {
    q: typeof raw.q === 'string' ? raw.q.trim().slice(0, 200) : '',
    status: statuses.includes(String(raw.status)) ? raw.status as OrderStatus | 'ALL' : 'ALL',
    date: ['today', '7d'].includes(String(raw.date)) ? raw.date as AdminOrderDateFilter : 'all',
    delivery: ['PENDING', 'SET', 'FREE'].includes(String(raw.delivery)) ? raw.delivery as DeliveryFeeStatus : 'ALL',
    page: Number.isFinite(page) ? Math.max(1, Math.min(100000, Math.floor(page))) : 1
  };
}
