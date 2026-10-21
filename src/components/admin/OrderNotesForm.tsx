'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrderNotesAction } from '@/features/admin/orders/order-operations.actions';

export function OrderNotesForm({
  orderId,
  internalNote = '',
  packagingNote = '',
  deliveryNote = ''
}: {
  orderId: string;
  internalNote?: string;
  packagingNote?: string;
  deliveryNote?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [internal, setInternal] = useState(internalNote);
  const [packaging, setPackaging] = useState(packagingNote);
  const [delivery, setDelivery] = useState(deliveryNote);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await updateOrderNotesAction(orderId, {
        internalNote: internal,
        packagingNote: packaging,
        deliveryNote: delivery
      });
      if (result.ok) {
        setMessage({ kind: 'ok', text: 'تم حفظ الملاحظات.' });
        router.refresh();
      } else {
        setMessage({ kind: 'error', text: result.message });
      }
    });
  }

  return (
    <form className="adminForm" onSubmit={onSubmit}>
      <div className="adminField">
        <label>ملاحظة داخلية (للمشرف فقط)</label>
        <textarea value={internal} onChange={(e) => setInternal(e.target.value)} placeholder="لا تظهر للعميل ولا على المستندات." />
      </div>
      <div className="adminField">
        <label>ملاحظة التغليف (تظهر على قائمة التغليف)</label>
        <textarea value={packaging} onChange={(e) => setPackaging(e.target.value)} />
      </div>
      <div className="adminField">
        <label>ملاحظة التسليم (للمشرف)</label>
        <textarea value={delivery} onChange={(e) => setDelivery(e.target.value)} />
      </div>
      <div className="adminBtnRow">
        <button type="submit" className="adminBtn adminBtnPrimary" disabled={pending}>{pending ? 'جارٍ الحفظ…' : 'حفظ الملاحظات'}</button>
        {message && <span className={message.kind === 'ok' ? 'adminFieldHint' : 'adminFieldError'}>{message.text}</span>}
      </div>
    </form>
  );
}
