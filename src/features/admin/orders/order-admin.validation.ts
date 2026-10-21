import type { OrderStatus } from '@prisma/client';
import { ORDER_STATUS_LABEL, ORDER_STATUS_LABEL_AR } from '@/features/orders/order-status.labels';

/** Allowed forward transitions. Cancel is permitted from any active (non-terminal) status. */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELED'],
  CONFIRMED: ['PROCESSING', 'CANCELED'],
  PROCESSING: ['SHIPPED', 'CANCELED'],
  SHIPPED: ['DELIVERED', 'CANCELED'],
  DELIVERED: [],
  CANCELED: []
};

export function isAllowedTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export const STATUS_TIMESTAMP_FIELD: Partial<Record<OrderStatus, 'confirmedAt' | 'processingAt' | 'shippedAt' | 'deliveredAt' | 'canceledAt'>> = {
  CONFIRMED: 'confirmedAt',
  PROCESSING: 'processingAt',
  SHIPPED: 'shippedAt',
  DELIVERED: 'deliveredAt',
  CANCELED: 'canceledAt'
};

export const STATUS_LABEL = ORDER_STATUS_LABEL;
export const STATUS_LABEL_AR = ORDER_STATUS_LABEL_AR;
