import { brand } from '@/lib/brand';

/** New ISHTAR orders have a separate namespace; existing order IDs remain valid. */
const orderPrefix = brand.key === 'ishtar' ? 'ISHTAR' : 'BAH';

export function orderNumberDatePrefix(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${orderPrefix}-${year}${month}${day}`;
}

export function buildOrderNumber(date: Date, sequence: number): string {
  return `${orderNumberDatePrefix(date)}-${String(sequence).padStart(4, '0')}`;
}

/** Preserve legacy invoice IDs while avoiding collisions in shared databases. */
export function invoiceNumberForOrder(orderNumber: string): string {
  return orderNumber.startsWith('ISHTAR-')
    ? `INV-${orderNumber}`
    : orderNumber.replace(/^BAH-/, 'INV-');
}
