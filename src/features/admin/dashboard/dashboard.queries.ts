import 'server-only';
import { startOfBusinessDay } from '@/lib/business-time';
import type { DeliveryFeeStatus, OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { variantStockState } from '@/features/admin/shared/admin-format';
import { decimalToNumber } from '@/features/orders/order.mappers';

export type DashboardRecentOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  deliveryFeeStatus: DeliveryFeeStatus;
  customerName: string;
  customerPhone: string;
  customerWhatsappPhone?: string;
  city: string;
  area: string;
  itemCount: number;
  total: number;
  createdAt: Date;
};

export type DashboardStockAlert = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  colorName?: string;
  size?: string;
  quantity: number;
  lowStockThreshold: number;
};

export type DashboardOverview = {
  totalProducts: number;
  activeProducts: number;
  draftProducts: number;
  archivedProducts: number;
  activeProductsWithoutVariants: number;
  totalCategories: number;
  activeCategories: number;
  totalVariants: number;
  outOfStockVariants: number;
  lowStockVariants: number;
  activeBanners: number;
  pendingOrders: number;
  deliveryPendingOrders: number;
  inProgressOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  canceledOrders: number;
  todayOrders: number;
  todayPendingOrders: number;
  todayOrderValue: number;
  recentOrders: DashboardRecentOrder[];
  stockAlerts: DashboardStockAlert[];
};

function startOfToday(): Date {
  return startOfBusinessDay();
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const today = startOfToday();
  const [
    totalProducts,
    activeProducts,
    draftProducts,
    archivedProducts,
    activeProductsWithoutVariants,
    totalCategories,
    activeCategories,
    activeBanners,
    activeVariants,
    stockWatchVariants,
    orderGroups,
    todayOrders,
    todayPendingOrders,
    deliveryPendingOrders,
    todayAgg,
    recentOrders
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: 'ACTIVE' } }),
    prisma.product.count({ where: { status: 'DRAFT' } }),
    prisma.product.count({ where: { status: 'ARCHIVED' } }),
    prisma.product.count({ where: { status: 'ACTIVE', variants: { none: { isActive: true } } } }),
    prisma.category.count(),
    prisma.category.count({ where: { isActive: true } }),
    prisma.banner.count({ where: { isActive: true } }),
    prisma.productVariant.findMany({ where: { isActive: true }, select: { quantity: true, lowStockThreshold: true } }),
    prisma.productVariant.findMany({
      where: { isActive: true, product: { status: 'ACTIVE' } },
      orderBy: [{ quantity: 'asc' }, { updatedAt: 'desc' }],
      take: 100,
      include: { product: { select: { id: true, name: true } } }
    }),
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.order.count({ where: { createdAt: { gte: today }, status: 'PENDING' } }),
    prisma.order.count({ where: { deliveryFeeStatus: 'PENDING', status: { notIn: ['CANCELED', 'DELIVERED'] } } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: today }, status: { not: 'CANCELED' } } }),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { _count: { select: { items: true } } }
    })
  ]);

  let outOfStockVariants = 0;
  let lowStockVariants = 0;
  for (const variant of activeVariants) {
    const state = variantStockState(variant.quantity, variant.lowStockThreshold);
    if (state === 'out-of-stock') outOfStockVariants += 1;
    else if (state === 'low-stock') lowStockVariants += 1;
  }

  const orderCountByStatus = (status: OrderStatus) => orderGroups.find((group) => group.status === status)?._count._all ?? 0;

  return {
    totalProducts,
    activeProducts,
    draftProducts,
    archivedProducts,
    activeProductsWithoutVariants,
    totalCategories,
    activeCategories,
    totalVariants: activeVariants.length,
    outOfStockVariants,
    lowStockVariants,
    activeBanners,
    pendingOrders: orderCountByStatus('PENDING'),
    deliveryPendingOrders,
    inProgressOrders: orderCountByStatus('CONFIRMED') + orderCountByStatus('PROCESSING'),
    shippedOrders: orderCountByStatus('SHIPPED'),
    deliveredOrders: orderCountByStatus('DELIVERED'),
    canceledOrders: orderCountByStatus('CANCELED'),
    todayOrders,
    todayPendingOrders,
    todayOrderValue: decimalToNumber(todayAgg._sum.total),
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      deliveryFeeStatus: order.deliveryFeeStatus,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerWhatsappPhone: order.customerWhatsappPhone ?? undefined,
      city: order.city,
      area: order.area,
      itemCount: order._count.items,
      total: decimalToNumber(order.total),
      createdAt: order.createdAt
    })),
    stockAlerts: stockWatchVariants
      .filter((variant) => variant.quantity <= variant.lowStockThreshold)
      .slice(0, 6)
      .map((variant) => ({
        id: variant.id,
        productId: variant.product.id,
        productName: variant.product.name,
        sku: variant.sku,
        colorName: variant.colorName ?? undefined,
        size: variant.size ?? undefined,
        quantity: variant.quantity,
        lowStockThreshold: variant.lowStockThreshold
      }))
  };
}
