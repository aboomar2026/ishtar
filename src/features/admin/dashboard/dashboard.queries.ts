import 'server-only';
import { dashboardPeriodRange } from './dashboard-period';
import type { DeliveryFeeStatus, OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
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
  confirmedOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  canceledOrders: number;
  todayOrders: number;
  todayPendingOrders: number;
  todayOrderValue: number;
  recentOrders: DashboardRecentOrder[];
  stockAlerts: DashboardStockAlert[];
};

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const range = dashboardPeriodRange();
  const createdAt = { gte: range.start, lt: range.end };
  const publishedStock = { isActive: true, product: { status: 'ACTIVE' as const, category: { isActive: true } } };
  const lowQuantity = { gt: 0, lte: prisma.productVariant.fields.lowStockThreshold };
  const [
    totalProducts,
    activeProducts,
    draftProducts,
    archivedProducts,
    activeProductsWithoutVariants,
    totalCategories,
    activeCategories,
    activeBanners,
    totalVariants,
    outOfStockVariants,
    lowStockVariants,
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
    prisma.productVariant.count({ where: { isActive: true } }),
    prisma.productVariant.count({ where: { ...publishedStock, quantity: { lte: 0 } } }),
    prisma.productVariant.count({ where: { ...publishedStock, quantity: lowQuantity } }),
    prisma.productVariant.findMany({
      where: { ...publishedStock, OR: [{ quantity: { lte: 0 } }, { quantity: lowQuantity }] },
      orderBy: [{ quantity: 'asc' }, { updatedAt: 'desc' }, { id: 'asc' }],
      take: 6,
      include: { product: { select: { id: true, name: true } } }
    }),
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.order.count({ where: { createdAt } }),
    prisma.order.count({ where: { createdAt, status: 'PENDING' } }),
    prisma.order.count({ where: { deliveryFeeStatus: 'PENDING', status: { notIn: ['CANCELED', 'DELIVERED'] } } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { createdAt, status: { not: 'CANCELED' } } }),
    prisma.order.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 6,
      include: { _count: { select: { items: true } } }
    })
  ]);

  const orderCountByStatus = (status: OrderStatus) => orderGroups.find((group) => group.status === status)?._count._all ?? 0;

  return {
    totalProducts,
    activeProducts,
    draftProducts,
    archivedProducts,
    activeProductsWithoutVariants,
    totalCategories,
    activeCategories,
    totalVariants,
    outOfStockVariants,
    lowStockVariants,
    activeBanners,
    pendingOrders: orderCountByStatus('PENDING'),
    deliveryPendingOrders,
    confirmedOrders: orderCountByStatus('CONFIRMED'),
    processingOrders: orderCountByStatus('PROCESSING'),
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
