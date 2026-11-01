'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { DeliveryFeeStatus, OrderStatus } from '@prisma/client';
import { updateOrderStatusAction } from '@/features/admin/orders/order-admin.actions';
import { ALLOWED_TRANSITIONS, STATUS_LABEL_AR } from '@/features/admin/orders/order-admin.validation';

export function OrderStatusActions({
  orderId,
  status,
  deliveryFeeStatus
}: {
  orderId: string;
  status: OrderStatus;
  deliveryFeeStatus: DeliveryFeeStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const submitting = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const nextStatuses = ALLOWED_TRANSITIONS[status] ?? [];
  const deliveryPending = deliveryFeeStatus === 'PENDING';

  function run(next: OrderStatus) {
    if (submitting.current) return;
    setError(null);
    setSuccess(null);
    if (next === 'SHIPPED' && deliveryPending) {
      setError('حدد سعر التوصيل أو اعتمده مجانياً قبل تحويل الطلب إلى تم الشحن.');
      return;
    }
    if (next === 'CANCELED' && !cancelOpen) {
      setCancelOpen(true);
      return;
    }

    const note = next === 'CANCELED' ? cancelReason.trim() || undefined : undefined;
    submitting.current = true;
    startTransition(async () => {
      try {
        const result = await updateOrderStatusAction(orderId, next, note);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setCancelOpen(false);
        setCancelReason('');
        setSuccess(next === 'CANCELED' ? 'تم إلغاء الطلب وإعادة الكمية إلى المخزون.' : 'تم تحديث حالة الطلب.');
        router.refresh();
      } catch {
        setError('تعذر تأكيد تغيير الحالة. حدّث الطلب قبل إعادة المحاولة.');
      } finally {
        submitting.current = false;
      }
    });
  }

  if (nextStatuses.length === 0) {
    return <p className="adminMuted">لا توجد تغييرات حالة إضافية متاحة لهذا الطلب.</p>;
  }

  return (
    <div>
      {deliveryPending && nextStatuses.includes('SHIPPED') && (
        <div className="adminAlert isInfo" style={{ marginBottom: 10 }}>
          لا يمكن تحويل الطلب إلى تم الشحن قبل تحديد سعر التوصيل أو اعتماده مجانياً.
        </div>
      )}
      <div className="adminBtnRow">
        {nextStatuses.map((next) => {
          const disabledByDelivery = next === 'SHIPPED' && deliveryPending;
          return (
            <button
              key={next}
              type="button"
              className={`adminBtn ${next === 'CANCELED' ? 'adminBtnDanger' : 'adminBtnPrimary'}`}
              disabled={pending || disabledByDelivery || cancelOpen}
              onClick={() => run(next)}
              title={disabledByDelivery ? 'حدد سعر التوصيل أولاً' : undefined}
            >
              {next === 'CANCELED' ? 'إلغاء الطلب' : `تحديد كـ ${STATUS_LABEL_AR[next]}`}
            </button>
          );
        })}
      </div>
      {cancelOpen && (
        <fieldset className="adminCard" disabled={pending} style={{ marginTop: 12 }}>
          <legend>تأكيد إلغاء الطلب</legend>
          <p>سيتم إلغاء الطلب وإعادة كمياته إلى المخزون. يمكنك ترك السبب فارغاً.</p>
          <label className="adminField">
            <span>سبب الإلغاء (اختياري)</span>
            <textarea value={cancelReason} onChange={event => setCancelReason(event.target.value)} rows={3} />
          </label>
          <div className="adminBtnRow">
            <button type="button" className="adminBtn adminBtnDanger" disabled={pending} onClick={() => run('CANCELED')}>
              {pending ? 'جارٍ إلغاء الطلب…' : 'تأكيد إلغاء الطلب'}
            </button>
            <button type="button" className="adminBtn adminBtnGhost" disabled={pending} onClick={() => { setCancelOpen(false); setCancelReason(''); setError(null); }}>
              تراجع
            </button>
          </div>
        </fieldset>
      )}
      {error && <div role="alert" className="adminAlert isError" style={{ marginTop: 10 }}>{error}</div>}
      {success && <p role="status" className="adminAlert isInfo">{success}</p>}
    </div>
  );
}
