import 'server-only';
import QRCode from 'qrcode';
import { getAdminOrderById, type AdminOrderDetail } from './order-admin.queries';

export type OrderPrintData = {
  order: AdminOrderDetail;
  invoiceNumber: string;
  trackUrl: string;
  qrDataUrl: string;
};

/** Public base URL used in the QR code. Configurable; defaults to local dev. */
function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
}

/**
 * Load an order for printing and generate a QR code that points to the public
 * tracking page (order number only — never phone or admin URLs).
 */
export async function getOrderForPrint(id: string): Promise<OrderPrintData | null> {
  const order = await getAdminOrderById(id);
  if (!order) return null;

  const invoiceNumber = order.invoiceNumber ?? order.orderNumber.replace('BAH-', 'INV-');
  const trackUrl = `${siteUrl()}/track-order?order=${encodeURIComponent(order.orderNumber)}`;
  const qrDataUrl = await QRCode.toDataURL(trackUrl, { margin: 1, width: 220 });

  return { order, invoiceNumber, trackUrl, qrDataUrl };
}

export type { AdminOrderDetail };
