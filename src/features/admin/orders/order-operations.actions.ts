'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/features/admin/auth/admin-auth';
import { orderNotesSchema, type OrderNotesInput, type PrintType } from './order-operations.validation';

export type OperationsResult = { ok: true } | { ok: false; message: string };

export async function updateOrderNotesAction(orderId: string, input: OrderNotesInput): Promise<OperationsResult> {
  await requireAdmin();
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true } });
  if (!order) return { ok: false, message: 'Order not found.' };

  const parsed = orderNotesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Invalid notes.' };

  await prisma.order.update({
    where: { id: orderId },
    data: {
      internalNote: parsed.data.internalNote ?? null,
      packagingNote: parsed.data.packagingNote ?? null,
      deliveryNote: parsed.data.deliveryNote ?? null
    }
  });
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}

/** Record a print of the invoice or packing slip (increment count + timestamp). */
export async function markOrderPrintedAction(orderId: string, type: PrintType): Promise<OperationsResult> {
  await requireAdmin();
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, deliveryFeeStatus: true } });
  if (!order) return { ok: false, message: 'Order not found.' };
  if (type === 'invoice' && order.deliveryFeeStatus === 'PENDING') {
    return { ok: false, message: 'حدد سعر التوصيل أو اعتمده مجانياً قبل طباعة الفاتورة النهائية.' };
  }

  await prisma.order.update({
    where: { id: orderId },
    data:
      type === 'invoice'
        ? { invoicePrintCount: { increment: 1 }, lastInvoicePrintedAt: new Date() }
        : { packingSlipPrintCount: { increment: 1 }, lastPackingSlipPrintedAt: new Date() }
  });
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}

export async function setOrderPackedAction(orderId: string, isPacked: boolean): Promise<OperationsResult> {
  await requireAdmin();
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, status: true } });
  if (!order) return { ok: false, message: 'Order not found.' };
  if (order.status === 'CANCELED') return { ok: false, message: 'لا يمكن تعديل حالة التغليف لطلب ملغي.' };

  await prisma.order.update({
    where: { id: orderId },
    data: { isPacked, packedAt: isPacked ? new Date() : null }
  });
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}
