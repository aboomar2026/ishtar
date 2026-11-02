'use client';

import { useSearchParams } from 'next/navigation';
import { useNavigationRouter as useRouter } from '@/components/NavigationProvider';
import { useEffect, useState } from 'react';

type CategoryOption = { id: string; name: string };

export function ProductFilters({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') ?? '');

  // Keep the local search box in sync if the URL changes externally.
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
    router.push(`/admin/products?${params.toString()}`);
  }

  return (
    <form
      className="adminFilters"
      onSubmit={(event) => {
        event.preventDefault();
        update({ q });
      }}
    >
      <input
        className="adminInput"
        type="search"
        placeholder="ابحث بالاسم أو الـ slug أو الـ SKU…"
        value={q}
        onChange={(event) => setQ(event.target.value)}
        aria-label="بحث في المنتجات"
      />
      <select className="adminInput" value={searchParams.get('status') ?? 'ALL'} onChange={(event) => update({ status: event.target.value })} aria-label="تصفية حسب الحالة">
        <option value="ALL">كل الحالات</option>
        <option value="ACTIVE">نشط</option>
        <option value="DRAFT">مسودة</option>
        <option value="ARCHIVED">مؤرشف</option>
      </select>
      <select className="adminInput" value={searchParams.get('category') ?? 'ALL'} onChange={(event) => update({ category: event.target.value })} aria-label="تصفية حسب التصنيف">
        <option value="ALL">كل التصنيفات</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <select className="adminInput" value={searchParams.get('stock') ?? 'all'} onChange={(event) => update({ stock: event.target.value })} aria-label="تصفية حسب المخزون">
        <option value="all">كل المخزون</option>
        <option value="in-stock">متوفر</option>
        <option value="low-stock">مخزون منخفض</option>
        <option value="out-of-stock">نفد المخزون</option>
      </select>
      <select className="adminInput" value={searchParams.get('recent') ?? 'all'} onChange={(event) => update({ recent: event.target.value, ...(event.target.value !== 'all' ? { sort: 'newest' } : {}) })} aria-label="تصفية حسب وقت إضافة المنتج">
        <option value="all">جميع أوقات الإضافة</option>
        <option value="10m">آخر 10 دقائق</option>
        <option value="1h">آخر ساعة</option>
        <option value="2h">آخر ساعتين</option>
        <option value="24h">آخر 24 ساعة</option>
        <option value="7d">آخر 7 أيام</option>
        <option value="30d">آخر 30 يوم</option>
      </select>
      <select className="adminInput" value={searchParams.get('sort') ?? 'updated'} onChange={(event) => update({ sort: event.target.value })} aria-label="ترتيب المنتجات">
        <option value="updated">الأحدث تحديثاً</option>
        <option value="newest">الأحدث إضافةً</option>
        <option value="name">الاسم (أ–ي)</option>
        <option value="stock-asc">المخزون (من الأقل إلى الأعلى)</option>
      </select>
      <button type="submit" className="adminBtn adminBtnPrimary">بحث</button>
    </form>
  );
}
