import type { OrderStatus } from '@prisma/client';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELED: 'Canceled'
};

export const ORDER_STATUS_LABEL_AR: Record<OrderStatus, string> = {
  PENDING: 'بانتظار التأكيد',
  CONFIRMED: 'تم التأكيد',
  PROCESSING: 'قيد التجهيز',
  SHIPPED: 'تم الشحن',
  DELIVERED: 'تم التسليم',
  CANCELED: 'ملغي'
};

export const ORDER_TRACKING_STEPS_AR: { key: OrderStatus; label: string }[] = [
  { key: 'PENDING', label: 'بانتظار التأكيد' },
  { key: 'CONFIRMED', label: 'تم التأكيد' },
  { key: 'PROCESSING', label: 'قيد التجهيز' },
  { key: 'SHIPPED', label: 'تم الشحن' },
  { key: 'DELIVERED', label: 'تم التسليم' }
];
