'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { InventoryRow } from '@/features/admin/inventory/inventory-admin.queries';
import {
  adjustVariantQuantityAction,
  updateVariantThresholdAction,
  setVariantActiveAction
} from '@/features/admin/inventory/inventory-admin.actions';
import { STOCK_STATE_LABEL, formatDateTime } from '@/features/admin/shared/admin-format';

function stockClass(state: InventoryRow['stockState']) {
  return state === 'in-stock' ? 'stockIn' : state === 'low-stock' ? 'stockLow' : 'stockOut';
}

function InventoryCard({ row }: { row: InventoryRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState(String(row.quantity));
  const [threshold, setThreshold] = useState(String(row.lowStockThreshold));
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const dirty = Number(quantity) !== row.quantity || Number(threshold) !== row.lowStockThreshold;

  function save() {
    setMessage(null);
    startTransition(async () => {
      if (Number(quantity) !== row.quantity) {
        const result = await adjustVariantQuantityAction(row.id, Number(quantity));
        if (!result.ok) { setMessage({ kind: 'error', text: result.message }); return; }
      }
      if (Number(threshold) !== row.lowStockThreshold) {
        const result = await updateVariantThresholdAction(row.id, Number(threshold));
        if (!result.ok) { setMessage({ kind: 'error', text: result.message }); return; }
      }
      setMessage({ kind: 'ok', text: 'تم الحفظ' });
      router.refresh();
    });
  }

  function toggleActive() {
    setMessage(null);
    startTransition(async () => {
      const result = await setVariantActiveAction(row.id, !row.isActive);
      if (!result.ok) { setMessage({ kind: 'error', text: result.message }); return; }
      router.refresh();
    });
  }

  return (
    <div className="adminInventoryCard">
      <div className="adminInventoryHead">
        <img className="adminThumb" src={row.image ?? '/mock-products/gift-box.svg'} alt={row.productName} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <Link href={`/admin/products/${row.productId}/edit`}><strong>{row.productName}</strong></Link>
          <div className="adminMuted" style={{ fontSize: 12 }}>{row.sku}</div>
        </div>
        <span className={`adminBadge ${stockClass(row.stockState)}`}>{STOCK_STATE_LABEL[row.stockState]}</span>
      </div>

      <div className="adminRecordMeta">
        {row.colorName && (
          <span>
            {row.colorValue && <span className="adminVariantSwatch" style={{ background: row.colorValue }} />}
            <b>{row.colorName}</b>
          </span>
        )}
        {row.size && <span>المقاس: <b>{row.size}</b></span>}
        {!row.isActive && <span className="adminBadge isArchived">غير نشط</span>}
      </div>

      <div className="adminInventoryControls">
        <div className="adminField">
          <label>الكمية</label>
          <input type="number" min="0" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>
        <div className="adminField">
          <label>حد المخزون المنخفض</label>
          <input type="number" min="0" step="1" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
        </div>
      </div>

      <div className="adminBtnRow">
        <button type="button" className="adminBtn adminBtnPrimary adminBtnSm" onClick={save} disabled={pending || !dirty}>
          {pending ? 'جارٍ الحفظ…' : 'حفظ'}
        </button>
        <button type="button" className="adminBtn adminBtnGhost adminBtnSm" onClick={toggleActive} disabled={pending}>
          {row.isActive ? 'إلغاء التنشيط' : 'تنشيط'}
        </button>
        {message && <span className={message.kind === 'ok' ? 'adminFieldHint' : 'adminFieldError'}>{message.text}</span>}
        <span className="adminMuted" style={{ marginInlineStart: 'auto', fontSize: 12 }}>{formatDateTime(row.updatedAt)}</span>
      </div>
    </div>
  );
}

export function InventoryTable({ rows }: { rows: InventoryRow[] }) {
  if (rows.length === 0) {
    return <div className="adminEmptyState">لا توجد خيارات تطابق هذه التصفية.</div>;
  }
  return (
    <div className="adminInventoryGrid">
      {rows.map((row) => (
        <InventoryCard key={row.id} row={row} />
      ))}
    </div>
  );
}
