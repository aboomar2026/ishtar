import type { OrderExportRow } from './order-admin.queries';

function escapeCsv(value: string | number): string {
  const str = String(value ?? '');
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

const HEADERS = [
  'Order Number',
  'Status',
  'Customer Name',
  'Phone',
  'WhatsApp Phone',
  'City',
  'Area',
  'Address',
  'Subtotal',
  'Delivery Fee',
  'Delivery Fee Status',
  'Discount',
  'Total',
  'Payment',
  'Created At',
  'Updated At'
];

/** Build a UTF-8 CSV (with BOM for Excel/Arabic compatibility). */
export function buildOrdersCsv(rows: OrderExportRow[]): string {
  const lines = [HEADERS.join(',')];
  for (const row of rows) {
    lines.push(
      [
        row.orderNumber,
        row.status,
        row.customerName,
        row.customerPhone,
        row.customerWhatsappPhone ?? '',
        row.city,
        row.area,
        row.address,
        row.subtotal,
        row.deliveryFee,
        row.deliveryFeeStatus,
        row.discount,
        row.total,
        row.paymentMethod,
        row.createdAt.toISOString(),
        row.updatedAt.toISOString()
      ]
        .map(escapeCsv)
        .join(',')
    );
  }
  return `﻿${lines.join('\r\n')}`;
}
