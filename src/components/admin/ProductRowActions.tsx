'use client';

import { useId, useState, useTransition } from 'react';
import Link from '@/components/NavigationLink';
import { useRouter } from 'next/navigation';
import type { ProductStatus } from '@prisma/client';
import { deleteProductAction, setProductStatusAction } from '@/features/admin/products/product-admin.actions';

export function ProductRowActions({ id, slug, name, status }: { id: string; slug: string; name: string; status: ProductStatus }) {
  const router = useRouter();
  const confirmationId = useId();
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function changeStatus(next: ProductStatus) {
    setError(null);
    startTransition(async () => {
      try {
      const result = await setProductStatusAction(id, next);
      if (!result.ok) {
        setError(result.message ?? 'تعذّر تحديث الحالة.');
        return;
      }
      router.refresh();
      } catch { setError('تعذّر الاتصال. حاول مجددًا.'); }
    });
  }

  function remove() {
    if (pending || confirmation !== 'حذف') return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteProductAction(id, confirmation);
        if (!result.ok) { setError(result.message ?? 'تعذّر حذف المنتج.'); return; }
        setConfirming(false);
        setConfirmation('');
        router.refresh();
      } catch { setError('تعذّر الاتصال. حاول مجددًا.'); }
    });
  }

  return (
    <div className="adminRowActions">
      <Link href={`/admin/products/${id}/edit`} className="adminBtn adminBtnSm">تعديل</Link>
      <Link href={`/product/${slug}`} className="adminBtn adminBtnGhost adminBtnSm" target="_blank">عرض</Link>

      <span className="adminRowActionsSep" aria-hidden="true" />

      {status !== 'ACTIVE' && (
        <button type="button" className="adminBtn adminBtnGhost adminBtnSm" disabled={pending} onClick={() => changeStatus('ACTIVE')}>
          تفعيل
        </button>
      )}
      {status !== 'DRAFT' && (
        <button type="button" className="adminBtn adminBtnGhost adminBtnSm" disabled={pending} onClick={() => changeStatus('DRAFT')}>
          {status === 'ARCHIVED' ? 'استعادة' : 'مسودة'}
        </button>
      )}
      {status !== 'ARCHIVED' && (
        <button type="button" className="adminBtn adminBtnDanger adminBtnSm" disabled={pending} onClick={() => changeStatus('ARCHIVED')}>
          أرشفة
        </button>
      )}

      <button type="button" className="adminBtn adminBtnDanger adminBtnSm" disabled={pending} onClick={() => { setConfirming(true); setConfirmation(''); setError(null); }}>حذف</button>
      {confirming && <fieldset className="adminCard" disabled={pending} style={{ flexBasis: '100%', minWidth: 0 }}>
        <legend>حذف المنتج: {name}</legend>
        <p>سيختفي المنتج من المتجر وقوائم المنتجات والمخزون. تبقى الطلبات والفواتير والمبيعات وسجل المخزون القديم محفوظة، ولا تتغيّر مبالغها. لن يُحذف ملف الصورة من التخزين.</p>
        <label htmlFor={confirmationId}>اكتب حذف للتأكيد</label>
        <input id={confirmationId} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" />
        <div className="adminBtnRow">
          <button type="button" className="adminBtn adminBtnDanger" disabled={pending || confirmation !== 'حذف'} onClick={remove}>{pending ? 'جارٍ الحذف…' : 'تأكيد حذف المنتج'}</button>
          <button type="button" className="adminBtn adminBtnGhost" disabled={pending} onClick={() => setConfirming(false)}>إلغاء</button>
        </div>
      </fieldset>}
      {error && <span className="adminFieldError" role="alert">{error}</span>}
    </div>
  );
}
