'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export function InventoryFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') ?? '');

  useEffect(() => {
    setQ(searchParams.get('q') ?? '');
  }, [searchParams]);

  function update(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value && value !== 'all') params.set(key, value);
      else params.delete(key);
    }
    router.push(`/admin/inventory?${params.toString()}`);
  }

  return (
    <form
      className="adminFilters"
      style={{ gridTemplateColumns: '1fr' }}
      onSubmit={(event) => {
        event.preventDefault();
        update({ q });
      }}
    >
      <input className="adminInput" type="search" placeholder="ابحث باسم المنتج أو الـ SKU…" value={q} onChange={(event) => setQ(event.target.value)} aria-label="بحث في المخزون" />
      <select className="adminInput" value={searchParams.get('filter') ?? 'all'} onChange={(event) => update({ filter: event.target.value })} aria-label="تصفية المخزون">
        <option value="all">كل الخيارات</option>
        <option value="low-stock">مخزون منخفض</option>
        <option value="out-of-stock">نفد المخزون</option>
        <option value="inactive">الخيارات غير النشطة</option>
      </select>
    </form>
  );
}
