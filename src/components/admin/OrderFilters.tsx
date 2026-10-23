'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export function OrderFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') ?? '');

  useEffect(() => {
    setQ(searchParams.get('q') ?? '');
  }, [searchParams]);

  function update(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    for (const [key, value] of Object.entries(next)) {
      if (value && value !== 'ALL' && value !== 'all') params.set(key, value);
      else params.delete(key);
    }
    router.push(`/admin/orders?${params.toString()}`);
  }

  return (
    <form
      className="adminFilters"
      onSubmit={(event) => {
        event.preventDefault();
        update({ q });
      }}
    >
      <input className="adminInput" type="search" placeholder="ابحث برقم الطلب أو الاسم أو الهاتف أو الواتساب…" value={q} onChange={(event) => setQ(event.target.value)} aria-label="بحث في الطلبات" />
      <select className="adminInput" value={searchParams.get('status') ?? 'ALL'} onChange={(event) => update({ status: event.target.value })} aria-label="تصفية حسب الحالة">
        <option value="ALL">كل الحالات</option>
        <option value="PENDING">بانتظار التأكيد</option>
        <option value="CONFIRMED">تم التأكيد</option>
        <option value="PROCESSING">قيد التجهيز</option>
        <option value="SHIPPED">تم الشحن</option>
        <option value="DELIVERED">تم التسليم</option>
        <option value="CANCELED">ملغي</option>
      </select>
      <select className="adminInput" value={searchParams.get('date') ?? 'all'} onChange={(event) => update({ date: event.target.value })} aria-label="تصفية حسب التاريخ">
        <option value="all">كل الأوقات</option>
        <option value="today">اليوم</option>
        <option value="7d">آخر 7 أيام</option>
      </select>
      <select className="adminInput" value={searchParams.get('delivery') ?? 'ALL'} onChange={(event) => update({ delivery: event.target.value })} aria-label="تصفية حسب التوصيل">
        <option value="ALL">كل حالات التوصيل</option>
        <option value="PENDING">بانتظار تحديد التوصيل</option>
        <option value="SET">تم تحديد سعر التوصيل</option>
        <option value="FREE">توصيل مجاني</option>
      </select>
    </form>
  );
}
