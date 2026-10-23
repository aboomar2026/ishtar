'use client';
import { useEffect, useState } from 'react';
import { useWishlist } from './WishlistProvider';
import { ProductGrid } from './ProductGrid';
import { EmptyState } from './EmptyState';
import type { Product } from '@/lib/types';

export function WishlistPageClient() {
  const { ids, loaded, persistent, remove } = useWishlist();
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify(ids);
  const requestKey = `${key}:${revision}`;
  const [data, setData] = useState<{ key: string; products: Product[]; unavailableIds: string[]; error?: boolean }>();
  useEffect(() => {
    if (!loaded || key === '[]') return;
    let disposed = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    void (async () => {
      try {
        const result = await fetch('/api/catalog/saved-products', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: JSON.parse(key) }), cache: 'no-store', signal: controller.signal });
        if (!result.ok) throw new Error('catalog');
        const body = await result.json();
        if (!Array.isArray(body.products) || !Array.isArray(body.unavailableIds)) throw new Error('shape');
        if (!disposed) setData({ key: requestKey, products: body.products, unavailableIds: body.unavailableIds });
      } catch { if (!disposed) setData({ key: requestKey, products: [], unavailableIds: [], error: true }); }
      finally { clearTimeout(timeout); }
    })();
    return () => { disposed = true; clearTimeout(timeout); controller.abort(); };
  }, [loaded, key, requestKey]);
  useEffect(() => {
    const refresh = () => { if (!document.hidden) setRevision(value => value + 1); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  if (!loaded) return <p role="status">جارٍ تحميل المفضّلة…</p>;
  const current = data?.key === requestKey ? data : undefined;
  return <>
    <p className="fieldHint">محفوظات هذا المتصفح فقط؛ لا تحجز المخزون. تُراجع الأسعار والتوفّر عند فتح الصفحة أو تحديثها.</p>
    {!persistent && <p role="status" className="wishlistNotice">تخزين المتصفح غير متاح. المحفوظات مؤقتة وتُفقد عند إغلاق الصفحة.</p>}
    {!ids.length ? <EmptyState title="المفضّلة فارغة" description="اضغطي على القلب بجانب أي منتج ليظهر هنا." actionHref="/category/all" actionLabel="اكتشفي المنتجات" /> : <>
      <div className="wishlistToolbar"><p>{ids.length} منتجًا محفوظًا</p><button type="button" className="secondaryButton" onClick={() => setRevision(value => value + 1)}>تحديث الأسعار والتوفّر</button></div>
      {!current ? <p role="status">جارٍ التحقق من المنتجات المحفوظة…</p> : current.error ?
        <div className="emptyState" role="alert"><p>تعذّر تحميل المنتجات. محفوظاتك ما زالت موجودة.</p><button type="button" className="primaryButton" onClick={() => setRevision(value => value + 1)}>إعادة المحاولة</button></div> : <>
          {!!current.unavailableIds.length && <div className="wishlistNotice"><p>{current.unavailableIds.length} من المحفوظات لم تعد منشورة أو متاحة للعرض.</p>
            <button type="button" className="secondaryButton" onClick={() => remove(current.unavailableIds)}>إزالة هذه المحفوظات</button></div>}
          {current.products.length > 0 && <ProductGrid products={current.products} />}
        </>}
    </>}
  </>;
}
