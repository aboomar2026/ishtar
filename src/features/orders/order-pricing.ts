/**
 * Server-side order pricing. The client may display an estimate, but these
 * functions are the single source of truth for money — always computed from
 * DB variant prices, never from client-supplied totals.
 *
 * Delivery is intentionally NOT auto-calculated. In Gaza/local delivery flows,
 * the delivery price can change by area, distance, availability, and courier
 * conditions. New storefront orders therefore start with deliveryFeeStatus
 * = PENDING and deliveryFee = 0. Admins set the final fee later.
 */

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calcLineTotal(unitPrice: number, quantity: number): number {
  return roundMoney(Math.max(0, unitPrice) * Math.max(0, quantity));
}

export type OrderTotals = {
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
};

export function calcOrderTotals(subtotal: number, discount = 0, deliveryFee = 0): OrderTotals {
  const cleanSubtotal = roundMoney(Math.max(0, subtotal));
  const cleanDiscount = roundMoney(Math.max(0, discount));
  const cleanDeliveryFee = roundMoney(Math.max(0, deliveryFee));
  const total = roundMoney(cleanSubtotal + cleanDeliveryFee - cleanDiscount);

  return {
    subtotal: cleanSubtotal,
    deliveryFee: cleanDeliveryFee,
    discount: cleanDiscount,
    total: Math.max(0, total)
  };
}
