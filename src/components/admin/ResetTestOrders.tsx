'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useDialog } from '@/components/useDialog';
import { previewTestOrderResetAction, resetTestOrdersAction } from '@/features/admin/orders/order-reset.actions';

type Preview = { token: string; orderCount: number; canceledCount: number; restoreQuantity: number };

export function ResetTestOrders() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const dialog = useDialog(open, () => { if (!pending) setOpen(false); });

  function showPreview() {
    setMessage('');
    startTransition(async () => {
      try {
        const result = await previewTestOrderResetAction();
        if (!result.ok) { setMessage(result.message); return; }
        setPreview(result.preview);
        setConfirmation('');
        setOpen(true);
      } catch { setMessage('تعذّر تحميل ملخص الطلبات. حاول مجدداً.'); }
    });
  }

  function reset() {
    if (!preview) return;
    setMessage('');
    startTransition(async () => {
      try {
        const result = await resetTestOrdersAction(preview.token, confirmation);
        if (!result.ok) { setMessage(result.message); return; }
        setOpen(false);
        setMessage(`تم حذف ${result.orderCount} طلب وإرجاع ${result.restoreQuantity} قطعة إلى المخزون.`);
        router.refresh();
      } catch { setMessage('تعذّر تأكيد النتيجة. حدّث الصفحة وراجع الطلبات قبل إعادة المحاولة.'); }
    });
  }

  return <>
    <button type="button" className="adminBtn adminBtnDanger" disabled={pending} onClick={showPreview}>
      {pending && !open ? 'جارٍ تحميل الملخص…' : 'تصفير طلبات الاختبار'}
    </button>
    {!open && message && <p role="status">{message}</p>}
    {open && preview && <div className="orderResetBackdrop">
      <div ref={dialog} className="adminCard orderResetDialog" role="dialog" aria-modal="true" aria-labelledby="order-reset-title" aria-describedby="order-reset-description" tabIndex={-1} aria-busy={pending}>
        <h2 id="order-reset-title">تصفير جميع طلبات الاختبار</h2>
        <p id="order-reset-description">سيتم حذف {preview.orderCount} طلب نهائياً، بجميع الحالات بما فيها المسلّمة، بغض النظر عن البحث والفلاتر. هذه العملية لا يمكن التراجع عنها.</p>
        <p>سيعود {preview.restoreQuantity} قطعة إلى المخزون. الطلبات الملغاة ({preview.canceledCount}) لن تعيد كمياتها مرة أخرى. المنتجات وصورها وخياراتها محفوظة.</p>
        <p className="adminMuted">الطلبات الجديدة التي تصل بعد بدء العملية تبقى محفوظة. يُفضّل إيقاف الاختبارات الأخرى أثناء التصفير.</p>
        <label htmlFor="order-reset-confirmation">للتأكيد اكتب: <strong>تصفير الطلبات</strong></label>
        <input id="order-reset-confirmation" className="adminInput" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={pending} autoComplete="off" />
        {message && <p role="alert">{message}</p>}
        <div className="orderResetActions">
          <button type="button" className="adminBtn" disabled={pending} onClick={() => setOpen(false)}>رجوع</button>
          <button type="button" className="adminBtn adminBtnDanger" disabled={pending || !preview.orderCount || confirmation !== 'تصفير الطلبات'} onClick={reset}>{pending ? 'جارٍ التصفير…' : 'حذف الطلبات وإرجاع المخزون'}</button>
        </div>
      </div>
    </div>}
  </>;
}
