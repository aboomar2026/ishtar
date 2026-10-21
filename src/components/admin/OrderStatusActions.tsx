'use client';

import { useState, useTransition } from 'react';
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
  const [error, setError] = useState<string | null>(null);

  const nextStatuses = ALLOWED_TRANSITIONS[status] ?? [];
  const deliveryPending = deliveryFeeStatus === 'PENDING';

  function run(next: OrderStatus) {
    setError(null);
    if (next === 'SHIPPED' && deliveryPending) {
      setError('حدد سعر التوصيل أو اعتمده مجانياً قبل تحويل الطلب إلى تم الشحن.');
      return;
    }

    let note: string | undefined;
    if (next === 'CANCELED') {
      const confirmed = window.confirm('هل تريد إلغاء هذا الطلب؟ ستتم إعادة الكمية إلى المخزون.');
      if (!confirmed) return;
      const reason = window.prompt('سبب الإلغاء (اختياري):');
      if (reason === null) return;
      note = reason.trim() || undefined;
    }
    startTransition(async () => {
      try {

      const result = await updateOrderStatusAction(orderId, next, note);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();

      } catch { setError('تعذر تأكيد تغيير الحالة. حدّث الطلب قبل إعادة المحاولة.'); }
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
              disabled={pending || disabledByDelivery}
              onClick={() => run(next)}
              title={disabledByDelivery ? 'حدد سعر التوصيل أولاً' : undefined}
            >
              {next === 'CANCELED' ? 'إلغاء الطلب' : `تحديد كـ ${STATUS_LABEL_AR[next]}`}
            </button>
          );
        })}
      </div>
      {error && <div className="adminAlert isError" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  );
}
