'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ProductStatus } from '@prisma/client';
import { setProductStatusAction } from '@/features/admin/products/product-admin.actions';

export function ProductRowActions({ id, slug, status }: { id: string; slug: string; status: ProductStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function changeStatus(next: ProductStatus) {
    setError(null);
    startTransition(async () => {
      const result = await setProductStatusAction(id, next);
      if (!result.ok) {
        setError(result.message ?? 'تعذّر تحديث الحالة.');
        return;
      }
      router.refresh();
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

      {error && <span className="adminFieldError" role="alert">{error}</span>}
    </div>
  );
}
