import 'server-only';

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sendTelegramMessage } from '@/lib/telegram';
import { brand } from '@/lib/brand';
import { decimalToNumber } from './order.mappers';
import type { VariantSnapshot } from './order.types';

const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;
const TELEGRAM_SAFE_MESSAGE_LENGTH = 3900;

function readVariantSnapshot(value: Prisma.JsonValue | null): Partial<VariantSnapshot> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Partial<VariantSnapshot>;
  }

  return {};
}

function formatMoney(value: Prisma.Decimal | number | string | null): string {
  return `₪${decimalToNumber(value).toFixed(2)}`;
}

function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

function clampTelegramMessage(text: string): string {
  if (text.length <= TELEGRAM_MAX_MESSAGE_LENGTH) return text;
  return `${text.slice(0, TELEGRAM_SAFE_MESSAGE_LENGTH)}\n\n… تم اختصار الرسالة. افتح الطلب من لوحة الأدمن لعرض كل التفاصيل.`;
}

export async function notifyAdminAboutNewOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!order) {
    console.warn(`Telegram order notification skipped: order not found (${orderId})`);
    return;
  }

  const orderUrl = `${getSiteUrl()}/admin/orders/${order.id}`;
  const customerWhatsapp = order.customerWhatsappPhone || order.customerPhone;

  const itemsText = order.items
    .map((item, index) => {
      const snapshot = readVariantSnapshot(item.variantSnapshot);
      const details = [
        snapshot.colorName ? `اللون: ${snapshot.colorName}` : null,
        snapshot.size ? `المقاس: ${snapshot.size}` : null,
        snapshot.sku ? `SKU: ${snapshot.sku}` : null
      ]
        .filter(Boolean)
        .join(' / ');

      return `${index + 1}. ${item.productNameSnapshot} × ${item.quantity}${details ? ` — ${details}` : ''}`;
    })
    .join('\n');

  const text = [
    `🧾 طلب جديد - ${brand.name}`,
    '',
    `رقم الطلب: ${order.orderNumber}`,
    `العميل: ${order.customerName}`,
    `الجوال: ${order.customerPhone}`,
    `واتساب: ${customerWhatsapp}`,
    '',
    `المحافظة/المدينة: ${order.city}`,
    `المنطقة: ${order.area}`,
    `العنوان: ${order.address}`,
    '',
    'المنتجات:',
    itemsText || 'لا توجد منتجات مسجلة على الطلب.',
    '',
    `المجموع قبل التوصيل: ${formatMoney(order.total)}`,
    'التوصيل: بانتظار تحديد الأدمن',
    '',
    order.notes ? `ملاحظات العميل: ${order.notes}` : null,
    '',
    `فتح الطلب: ${orderUrl}`
  ]
    .filter((line): line is string => typeof line === 'string')
    .join('\n');

  await sendTelegramMessage({ text: clampTelegramMessage(text) });
}
