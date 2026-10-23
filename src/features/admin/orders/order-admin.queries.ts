import 'server-only';
import { startOfBusinessDay } from '@/lib/business-time';
import type { DeliveryFeeStatus, Prisma, OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/features/orders/order.validation';
import { decimalToNumber, mapOrderItem } from '@/features/orders/order.mappers';
import type { OrderItemView } from '@/features/orders/order.types';

import { ADMIN_ORDER_PAGE_SIZE, normalizeAdminOrderParams, type AdminOrderListParams } from './order-list-params';
export type { AdminOrderListParams, AdminOrderDateFilter, AdminDeliveryFeeFilter } from './order-list-params';

export type AdminOrderListItem = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerWhatsappPhone?: string;
  city: string;
  area: string;
  status: OrderStatus;
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  deliveryFeeStatus: DeliveryFeeStatus;
  total: number;
  createdAt: Date;
};

function startOfToday(): Date {
  return startOfBusinessDay();
}

function buildOrderWhere(params: AdminOrderListParams): Prisma.OrderWhereInput {
  const { q, status, date, delivery } = normalizeAdminOrderParams(params);
  const where: Prisma.OrderWhereInput = {};
  if (status !== 'ALL') where.status = status;
  if (delivery !== 'ALL') where.deliveryFeeStatus = delivery;

  if (date === 'today') {
    where.createdAt = { gte: startOfToday() };
  } else if (date === '7d') {
    const from = new Date();
    from.setDate(from.getDate() - 7);
    where.createdAt = { gte: from };
  }

  const term = q?.trim();
  if (term) {
    const phoneTerm = normalizePhone(term);
    where.OR = [
      { orderNumber: { contains: term, mode: 'insensitive' } },
      { customerName: { contains: term, mode: 'insensitive' } },
      { customerPhone: { contains: phoneTerm.length >= 3 ? phoneTerm : term } },
      { customerWhatsappPhone: { contains: phoneTerm.length >= 3 ? phoneTerm : term } }
    ];
  }
  return where;
}

export async function getAdminOrderPage(params: AdminOrderListParams = {}) {
  const where = buildOrderWhere(params);
  const total = await prisma.order.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_ORDER_PAGE_SIZE));
  const page = Math.min(normalizeAdminOrderParams(params).page, pageCount);
  const orders = await prisma.order.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: ADMIN_ORDER_PAGE_SIZE,
    skip: (page - 1) * ADMIN_ORDER_PAGE_SIZE,
    include: { _count: { select: { items: true } } }
  });

  const rows: AdminOrderListItem[] = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerWhatsappPhone: order.customerWhatsappPhone ?? undefined,
    city: order.city,
    area: order.area,
    status: order.status,
    itemCount: order._count.items,
    subtotal: decimalToNumber(order.subtotal),
    deliveryFee: decimalToNumber(order.deliveryFee),
    deliveryFeeStatus: order.deliveryFeeStatus,
    total: decimalToNumber(order.total),
    createdAt: order.createdAt
  }));
  return { orders: rows, total, page, pageCount };
}

/** Bounded convenience query; full CSV export has its own explicit path. */
export async function getAdminOrders(params: AdminOrderListParams = {}): Promise<AdminOrderListItem[]> {
  return (await getAdminOrderPage(params)).orders;
}

export type OrderExportRow = {
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  customerWhatsappPhone?: string;
  city: string;
  area: string;
  address: string;
  subtotal: number;
  deliveryFee: number;
  deliveryFeeStatus: DeliveryFeeStatus;
  discount: number;
  total: number;
  paymentMethod: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function getOrdersForExport(params: AdminOrderListParams = {}): Promise<OrderExportRow[]> {
  const orders = await prisma.order.findMany({
    where: buildOrderWhere(params),
    orderBy: { createdAt: 'desc' },
    take: 5000
  });
  return orders.map((order) => ({
    orderNumber: order.orderNumber,
    status: order.status,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerWhatsappPhone: order.customerWhatsappPhone ?? undefined,
    city: order.city,
    area: order.area,
    address: order.address,
    subtotal: decimalToNumber(order.subtotal),
    deliveryFee: decimalToNumber(order.deliveryFee),
    deliveryFeeStatus: order.deliveryFeeStatus,
    discount: decimalToNumber(order.discount),
    total: decimalToNumber(order.total),
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  }));
}

export type AdminOrderDetail = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  customerWhatsappPhone?: string;
  city: string;
  area: string;
  address: string;
  notes?: string;
  adminNote?: string;
  cancelReason?: string;
  invoiceNumber?: string;
  internalNote?: string;
  packagingNote?: string;
  deliveryNote?: string;
  isPacked: boolean;
  packedAt?: Date;
  invoicePrintCount: number;
  packingSlipPrintCount: number;
  subtotal: number;
  deliveryFee: number;
  deliveryFeeStatus: DeliveryFeeStatus;
  discount: number;
  total: number;
  createdAt: Date;
  items: OrderItemView[];
  statusHistory: { id: string; fromStatus: OrderStatus | null; toStatus: OrderStatus; note?: string; createdAt: Date }[];
  inventoryLogs: { id: string; type: string; quantityChange: number; note?: string; createdAt: Date }[];
};

export async function getAdminOrderById(id: string): Promise<AdminOrderDetail | null> {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { orderBy: { createdAt: 'asc' } },
      statusHistory: { orderBy: { createdAt: 'asc' } }
    }
  });
  if (!order) return null;

  // Prefer the direct orderId relation; fall back to note matching for pre-Sprint-5 logs.
  const inventoryLogs = await prisma.inventoryLog.findMany({
    where: { OR: [{ orderId: id }, { orderId: null, note: { contains: order.orderNumber } }] },
    orderBy: { createdAt: 'asc' }
  });

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerWhatsappPhone: order.customerWhatsappPhone ?? undefined,
    city: order.city,
    area: order.area,
    address: order.address,
    notes: order.notes ?? undefined,
    adminNote: order.adminNote ?? undefined,
    cancelReason: order.cancelReason ?? undefined,
    invoiceNumber: order.invoiceNumber ?? undefined,
    internalNote: order.internalNote ?? undefined,
    packagingNote: order.packagingNote ?? undefined,
    deliveryNote: order.deliveryNote ?? undefined,
    isPacked: order.isPacked,
    packedAt: order.packedAt ?? undefined,
    invoicePrintCount: order.invoicePrintCount,
    packingSlipPrintCount: order.packingSlipPrintCount,
    subtotal: decimalToNumber(order.subtotal),
    deliveryFee: decimalToNumber(order.deliveryFee),
    deliveryFeeStatus: order.deliveryFeeStatus,
    discount: decimalToNumber(order.discount),
    total: decimalToNumber(order.total),
    createdAt: order.createdAt,
    items: order.items.map(mapOrderItem),
    statusHistory: order.statusHistory.map((entry) => ({
      id: entry.id,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      note: entry.note ?? undefined,
      createdAt: entry.createdAt
    })),
    inventoryLogs: inventoryLogs.map((log) => ({
      id: log.id,
      type: log.type,
      quantityChange: log.quantityChange,
      note: log.note ?? undefined,
      createdAt: log.createdAt
    }))
  };
}
