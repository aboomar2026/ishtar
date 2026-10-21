import 'server-only';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from './order.validation';
import { decimalToNumber, mapOrderView } from './order.mappers';
import type { OrderView } from './order.types';

const orderWithItems = { items: { orderBy: { createdAt: 'asc' } } } as const;

export type OrderSuccessSummary = Pick<
  OrderView,
  'orderNumber' | 'status' | 'deliveryFeeStatus' | 'subtotal' | 'total' | 'createdAt'
>;

/**
 * Minimal public success-page lookup.
 * Do not load or render customer phone/address/items from an order-number-only URL.
 */
export async function getOrderSuccessSummaryByNumber(orderNumber: string): Promise<OrderSuccessSummary | null> {
  const order = await prisma.order.findUnique({
    where: { orderNumber: orderNumber.trim() },
    select: {
      orderNumber: true,
      status: true,
      deliveryFeeStatus: true,
      subtotal: true,
      total: true,
      createdAt: true
    }
  });

  return order
    ? {
        orderNumber: order.orderNumber,
        status: order.status,
        deliveryFeeStatus: order.deliveryFeeStatus,
        subtotal: decimalToNumber(order.subtotal),
        total: decimalToNumber(order.total),
        createdAt: order.createdAt
      }
    : null;
}

/** Load a full order view only for trusted flows that already verify ownership. */
export async function getOrderByNumber(orderNumber: string): Promise<OrderView | null> {
  const order = await prisma.order.findUnique({
    where: { orderNumber: orderNumber.trim() },
    include: orderWithItems
  });
  return order ? mapOrderView(order) : null;
}

/**
 * Public tracking lookup — requires BOTH order number and matching phone,
 * so a phone number alone can't enumerate someone else's orders.
 */
export async function getOrderByNumberAndPhone(orderNumber: string, phone: string): Promise<OrderView | null> {
  const normalized = normalizePhone(phone);
  const order = await prisma.order.findUnique({
    where: { orderNumber: orderNumber.trim() },
    include: orderWithItems
  });
  if (!order) return null;
  if (normalizePhone(order.customerPhone) !== normalized) return null;
  return mapOrderView(order);
}
