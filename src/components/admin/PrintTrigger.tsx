'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { markOrderPrintedAction } from '@/features/admin/orders/order-operations.actions';
import type { PrintType } from '@/features/admin/orders/order-operations.validation';

/** Print toolbar shown on screen only (hidden in print via .noPrint). */
export function PrintTrigger({
  orderId,
  type,
  backHref,
  disabledReason
}: {
  orderId: string;
  type: PrintType;
  backHref: string;
  disabledReason?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function print() {
    if (disabledReason) {
      setError(disabledReason);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await markOrderPrintedAction(orderId, type);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      window.print();
    });
  }

  return (
    <div className="printToolbar noPrint">
      <Link href={backHref} className="adminBtn adminBtnGhost">← الرجوع للطلب</Link>
      <button type="button" className="adminBtn adminBtnPrimary" onClick={print} disabled={pending || Boolean(disabledReason)} title={disabledReason}>
        {pending ? 'جاري التجهيز…' : 'فتح نافذة الطباعة'}
      </button>
      {disabledReason && <span className="adminMuted">{disabledReason}</span>}
      {error && <span className="adminAlert isError" style={{ margin: 0 }}>{error}</span>}
    </div>
  );
}
