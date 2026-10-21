import 'server-only';
import QRCode from 'qrcode';
import { invoiceNumberForOrder } from '@/features/orders/order-number';
import { getAdminOrderById, type AdminOrderDetail } from './order-admin.queries';

export type OrderPrintData = {
  order: AdminOrderDetail;
  invoiceNumber: string;
  trackUrl: string;
  qrDataUrl: string;
};

/** Public base URL used in the QR code. Configurable; defaults to local dev. */
function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configured && process.env.NODE_ENV === 'production') throw new Error('اضبط NEXT_PUBLIC_SITE_URL قبل إنشاء رمز تتبع الطلب.');
  const url = new URL(configured || 'http://localhost:3000');
  if (process.env.NODE_ENV === 'production' && (url.protocol !== 'https:' || ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('رابط الموقع للطباعة يجب أن يكون HTTPS عامًا.');
  return url.origin;
}

/**
 * Load an order for printing and generate a QR code that points to the public
 * tracking page (order number only — never phone or admin URLs).
 */
export async function getOrderForPrint(id: string): Promise<OrderPrintData | null> {
  const order = await getAdminOrderById(id);
  if (!order) return null;

  const invoiceNumber = order.invoiceNumber ?? invoiceNumberForOrder(order.orderNumber);
  const trackUrl = `${siteUrl()}/track-order?order=${encodeURIComponent(order.orderNumber)}`;
  const qrDataUrl = await QRCode.toDataURL(trackUrl, { margin: 1, width: 220 });

  return { order, invoiceNumber, trackUrl, qrDataUrl };
}

export type { AdminOrderDetail };
