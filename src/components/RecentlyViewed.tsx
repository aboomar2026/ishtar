'use client';
import { useEffect, useState } from 'react';
import type { Product } from '@/lib/types';
import { brandStorageKeys } from '@/lib/brand-storage';
import { parseRecentProducts, recordRecentProduct } from '@/features/recent-products/recent-storage';
import { ProductGrid } from './ProductGrid';

const changed = 'ishtar:recent-products-changed';
let memory: string[] = [];
let persistent = true;
function read() {
  if (persistent) {
    try { memory = parseRecentProducts(localStorage.getItem(brandStorageKeys.recentProducts)); }
    catch { persistent = false; }
  }
  return memory;
}
function write(ids: string[]) {
  memory = ids;
  if (persistent) {
    try {
      if (ids.length) localStorage.setItem(brandStorageKeys.recentProducts, JSON.stringify(ids));
      else localStorage.removeItem(brandStorageKeys.recentProducts);
    }
    catch { persistent = false; }
  }
  window.dispatchEvent(new Event(changed));
}
export function RecordProductView({ id }: { id: string }) {
  useEffect(() => { write(recordRecentProduct(read(), id)); }, [id]);
  return null;
}
export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const [ids, setIds] = useState<string[]>([]);
  const [clearWarning, setClearWarning] = useState(false);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; products: Product[]; error?: boolean }>();
  useEffect(() => {
    const refresh = () => { setIds([...read()]); setRevision((n) => n + 1); };
    const storage = (event: StorageEvent) => {
      if (event.key === null || event.key === brandStorageKeys.recentProducts) refresh();
    };
    const visible = () => { if (!document.hidden) refresh(); };
    refresh();
    window.addEventListener(changed, refresh);
    window.addEventListener('storage', storage);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.removeEventListener(changed, refresh);
      window.removeEventListener('storage', storage);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', visible);
    };
  }, []);
  const visibleIds = ids.filter((id) => id !== excludeId);
  const idsJson = JSON.stringify(visibleIds);
  const key = `${idsJson}:${revision}`;
  useEffect(() => {
    if (idsJson === '[]') return;
    const controller = new AbortController();
    let disposed = false;
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    fetch('/api/catalog/saved-products', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: JSON.parse(idsJson) }), cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('catalog unavailable');
        const data = await response.json();
        if (!disposed) setResult({ key, products: data.products });
      }).catch(() => { if (!disposed) setResult({ key, products: [], error: true }); })
      .finally(() => window.clearTimeout(timeout));
    return () => { disposed = true; controller.abort(); window.clearTimeout(timeout); };
  }, [idsJson, key]);
  if (!visibleIds.length) return clearWarning ? <p role="status">أُخفي السجل لهذه الزيارة؛ تعذّر مسح التخزين المحفوظ. يمكنك مسح بيانات الموقع من إعدادات المتصفح.</p> : null;
  const current = result?.key === key ? result : undefined;
  return <section className="contentSection recentProducts" aria-labelledby={`recent-title-${excludeId ?? 'home'}`}>
    <div className="sectionHeader"><div><span className="eyebrow">Recently viewed</span>
      <h2 id={`recent-title-${excludeId ?? 'home'}`}>شاهدتِ مؤخرًا</h2></div>
      <button className="ghostButton" type="button" onClick={() => { write([]); setClearWarning(!persistent); }}>مسح السجل</button></div>
    {!persistent && <p>السجل مؤقت لهذه الزيارة لأن الحفظ على الجهاز غير متاح.</p>}
    {!current ? <p role="status">جارٍ تحميل المنتجات…</p> : current.error ?
      <div role="status"><p>تعذّر تحميل المنتجات.</p><button className="ghostButton" onClick={() => setRevision((n) => n + 1)}>إعادة المحاولة</button></div> :
      current.products.length ? <ProductGrid products={current.products.slice(0, 4)} /> : <p>المنتجات التي شاهدتِها لم تعد متاحة للعرض.</p>}
  </section>;
}
