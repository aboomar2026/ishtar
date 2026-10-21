import type { Prisma, Order, OrderItem } from '@prisma/client';
import type { OrderItemView, OrderView, VariantSnapshot } from './order.types';

type DecimalLike = Prisma.Decimal | number | string | null;

export function decimalToNumber(value: DecimalLike): number {
  if (value === null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return value.toNumber();
}

function readSnapshot(value: Prisma.JsonValue | null): Partial<VariantSnapshot> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Partial<VariantSnapshot>;
  }
  return {};
}

export function mapOrderItem(item: OrderItem): OrderItemView {
  const snapshot = readSnapshot(item.variantSnapshot);
  return {
    id: item.id,
    productName: item.productNameSnapshot,
    productSlug: snapshot.productSlug,
    sku: snapshot.sku,
    colorName: snapshot.colorName,
    colorValue: snapshot.colorValue,
    size: snapshot.size,
    image: snapshot.image,
    quantity: item.quantity,
    unitPrice: decimalToNumber(item.unitPrice),
    total: decimalToNumber(item.total)
  };
}

export function mapOrderView(order: Order & { items: OrderItem[] }): OrderView {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerWhatsappPhone: order.customerWhatsappPhone ?? undefined,
    city: order.city,
    area: order.area,
    address: order.address,
    notes: order.notes ?? undefined,
    subtotal: decimalToNumber(order.subtotal),
    deliveryFee: decimalToNumber(order.deliveryFee),
    deliveryFeeStatus: order.deliveryFeeStatus,
    discount: decimalToNumber(order.discount),
    total: decimalToNumber(order.total),
    createdAt: order.createdAt,
    items: order.items.map(mapOrderItem)
  };
}

/** Mask a phone for public display: keep last 3 digits. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 3) return phone;
  return `${'•'.repeat(Math.max(2, digits.length - 3))}${digits.slice(-3)}`;
}
