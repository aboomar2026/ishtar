import type { DeliveryFeeStatus, OrderStatus, PaymentMethod } from '@prisma/client';

export type CheckoutLineInput = {
  variantId: string;
  quantity: number;
};

export type CheckoutInput = {
  requestKey: string;
  fullName: string;
  phone: string;
  whatsappPhone?: string;
  city: string;
  area: string;
  address: string;
  notes?: string;
  lines: CheckoutLineInput[];
};

export type OrderStockError = {
  code: 'OUT_OF_STOCK' | 'UNAVAILABLE';
  variantId: string;
  productName: string;
  available: number;
};

export type CreateOrderResult =
  | { ok: true; orderNumber: string; orderId: string; total: number }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; stockErrors?: OrderStockError[] };

/** Snapshot stored on each OrderItem (variantSnapshot JSON). */
export type VariantSnapshot = {
  sku: string;
  colorName?: string;
  colorValue?: string;
  size?: string;
  image?: string;
  productSlug: string;
};

export type OrderItemView = {
  id: string;
  productName: string;
  productSlug?: string;
  sku?: string;
  colorName?: string;
  colorValue?: string;
  size?: string;
  image?: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type OrderView = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerPhone: string;
  customerWhatsappPhone?: string;
  city: string;
  area: string;
  address: string;
  notes?: string;
  subtotal: number;
  deliveryFee: number;
  deliveryFeeStatus: DeliveryFeeStatus;
  discount: number;
  total: number;
  createdAt: Date;
  items: OrderItemView[];
};
