'use client';
import { IconCheck, IconReceipt, IconPackage } from '@/components/Icons';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { DeliveryFeeStatus, OrderStatus } from '@prisma/client';
import { setOrderPackedAction } from '@/features/admin/orders/order-operations.actions';

export function OrderOperations({
  orderId,
  status,
  deliveryFeeStatus,
  isPacked,
  invoicePrintCount,
  packingSlipPrintCount,
  summaryText
}: {
  orderId: string;
  status: OrderStatus;
  deliveryFeeStatus: DeliveryFeeStatus;
  isPacked: boolean;
  invoicePrintCount: number;
  packingSlipPrintCount: number;
  summaryText: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const deliveryPending = deliveryFeeStatus === 'PENDING' && status !== 'CANCELED';
  const canPrintInvoice = !deliveryPending;

  function togglePacked() {
    startTransition(async () => {
      await setOrderPackedAction(orderId, !isPacked);
      router.refresh();
    });
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      {deliveryPending && (
        <div className="adminAlert isInfo" style={{ marginBottom: 10 }}>
          الفاتورة النهائية مقفولة حتى يتم تحديد سعر التوصيل أو اعتماده مجانياً. يمكنك طباعة قائمة التغليف بدون أسعار.
        </div>
      )}
      <div className="adminBtnRow">
        {canPrintInvoice ? (
          <Link href={`/admin/orders/${orderId}/invoice`} className="adminBtn adminBtnPrimary"><IconReceipt size={20} /> طباعة الفاتورة</Link>
        ) : (
          <button type="button" className="adminBtn adminBtnPrimary" disabled title="حدد التوصيل أولاً"><IconReceipt size={20} /> طباعة الفاتورة</button>
        )}
        <Link href={`/admin/orders/${orderId}/packing-slip`} className="adminBtn"><IconPackage size={20} /> طباعة قائمة التغليف</Link>
        <button type="button" className="adminBtn adminBtnGhost" onClick={copySummary}>{copied ? 'تم النسخ!' : 'نسخ الملخص'}</button>
        <button type="button" className={`adminBtn ${isPacked ? 'adminBtnGhost' : 'adminBtnPrimary'}`} onClick={togglePacked} disabled={pending || status === 'CANCELED'}>
          {isPacked ? 'تحديد كغير مُغلَّف' : 'تحديد كمُغلَّف'}
        </button>
      </div>
      <p className="adminMuted" style={{ marginTop: 10 }}>
        {isPacked ? <><IconCheck size={16} /> مُغلَّف · </> : null}فُتحت طباعة الفاتورة {invoicePrintCount}× · فُتحت طباعة التجهيز {packingSlipPrintCount}× (لا يؤكد اكتمال الطباعة)
      </p>
    </div>
  );
}
