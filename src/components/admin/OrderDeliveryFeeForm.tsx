'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { DeliveryFeeStatus, OrderStatus } from '@prisma/client';
import { updateOrderDeliveryFeeAction } from '@/features/admin/orders/order-admin.actions';
import { formatCurrency } from '@/features/admin/shared/admin-format';

export function OrderDeliveryFeeForm({
  orderId,
  status,
  deliveryFee,
  deliveryFeeStatus,
  total,
  subtotal
}: {
  orderId: string;
  status: OrderStatus;
  deliveryFee: number;
  deliveryFeeStatus: DeliveryFeeStatus;
  total: number;
  subtotal: number;
}) {
  const router = useRouter();
  const [fee, setFee] = useState(deliveryFee > 0 ? String(deliveryFee) : '');
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const isCanceled = status === 'CANCELED';
  const isLocked = status === 'SHIPPED' || status === 'DELIVERED' || isCanceled;
  const isPending = deliveryFeeStatus === 'PENDING';

  function save(mode: 'SET' | 'FREE') {
    setMessage(null);
    startTransition(async () => {
      try {

      const result = await updateOrderDeliveryFeeAction(orderId, { mode, fee });
      if (!result.ok) {
        setMessage({ type: 'error', text: result.message });
        return;
      }
      setMessage({ type: 'success', text: mode === 'FREE' ? 'تم اعتماد التوصيل المجاني.' : 'تم تحديث سعر التوصيل والإجمالي.' });
      router.refresh();

      } catch { setMessage({ type: 'error', text: 'تعذر تأكيد سعر التوصيل. حدّث الطلب قبل إعادة المحاولة.' }); }
    });
  }

  return (
    <div className="adminDeliveryFeePanel">
      {isPending ? (
        <div className="adminAlert isInfo">
          سعر التوصيل لم يتم تحديده بعد. لا يظهر للعميل كتوصيل مجاني، وسيظهر له أن التوصيل يحدد عند التأكيد.
        </div>
      ) : (
        <div className="adminAlert isSuccess">
          {deliveryFeeStatus === 'FREE' ? 'تم اعتماد التوصيل المجاني لهذا الطلب.' : `سعر التوصيل المعتمد: ${formatCurrency(deliveryFee)}.`}
        </div>
      )}

      <div className="adminFormGrid two" style={{ marginTop: 14 }}>
        <div className="adminField">
          <label htmlFor="delivery-fee">سعر التوصيل</label>
          <input
            id="delivery-fee"
            inputMode="decimal"
            type="number"
            min="0"
            step="0.5"
            value={fee}
            onChange={(event) => setFee(event.target.value)}
            placeholder="مثال: 15"
            disabled={pending || isLocked}
          />
          <span className="adminFieldHint">اكتب السعر بعد التواصل أو حسب المنطقة. اتركه فارغاً فقط عند اختيار مجاني.</span>
        </div>
        <div className="adminField">
          <span className="adminFieldLabel">الحساب الحالي</span>
          <div className="adminDeliveryFeeSummary">
            <span>المجموع قبل التوصيل: <b>{formatCurrency(subtotal)}</b></span>
            <span>التوصيل: <b>{isPending ? 'بانتظار التحديد' : deliveryFeeStatus === 'FREE' ? 'مجاني' : formatCurrency(deliveryFee)}</b></span>
            <span>الإجمالي الحالي: <b>{formatCurrency(total)}</b></span>
          </div>
        </div>
      </div>

      <div className="adminBtnRow" style={{ marginTop: 12 }}>
        <button type="button" className="adminBtn adminBtnPrimary" onClick={() => save('SET')} disabled={pending || isLocked}>
          {pending ? 'جاري الحفظ...' : 'حفظ سعر التوصيل'}
        </button>
        <button type="button" className="adminBtn adminBtnGhost" onClick={() => save('FREE')} disabled={pending || isLocked}>
          اعتماد توصيل مجاني
        </button>
      </div>

      {message && <div className={`adminAlert ${message.type === 'error' ? 'isError' : 'isSuccess'}`} style={{ marginTop: 12 }}>{message.text}</div>}
      {isCanceled && <p className="adminMuted">لا يمكن تعديل التوصيل بعد إلغاء الطلب.</p>}
      {(status === 'SHIPPED' || status === 'DELIVERED') && <p className="adminMuted">تم قفل سعر التوصيل بعد الشحن أو التسليم حتى تبقى الفاتورة والإجمالي ثابتين.</p>}
    </div>
  );
}
