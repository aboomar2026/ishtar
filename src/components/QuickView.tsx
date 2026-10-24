'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Product } from '@/lib/types';
import { ProductDetailClient } from './ProductDetailClient';
import { IconX } from './Icons';

type Preview = Pick<Product, 'id' | 'name' | 'slug'>;
type Result = { product?: Product; error?: 'unavailable' | 'network' };
export function QuickView({ product, onClose, opener }: { product: Preview; onClose: () => void; opener?: HTMLElement | null }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [result, setResult] = useState<Result>();
  const [retry, setRetry] = useState(0);
  const [supported, setSupported] = useState(true);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || typeof dialog.showModal !== 'function') { setSupported(false); return; }
    const previous = opener ?? document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [opener]);
  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    fetch('/api/catalog/saved-products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
      body: JSON.stringify({ ids: [product.id] }), signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('catalog unavailable');
        const data = await response.json();
        const current = (data.products as Product[]).find(item => item.id === product.id);
        if (!disposed) setResult(current ? { product: current } : { error: 'unavailable' });
      }).catch(() => { if (!disposed) setResult({ error: 'network' }); })
      .finally(() => window.clearTimeout(timeout));
    return () => { disposed = true; controller.abort(); window.clearTimeout(timeout); };
  }, [product.id, retry]);
  const href = `/product/${encodeURIComponent(result?.product?.slug ?? product.slug)}`;
  if (!supported) return <div className="quickViewFallback" role="status">العرض السريع غير مدعوم في هذا المتصفح. <Link href={href} onClick={onClose}>افتحي صفحة المنتج</Link><button type="button" className="ghostButton" onClick={onClose}>إغلاق</button></div>;
  return <dialog ref={ref} className="quickViewDialog" aria-label={`عرض سريع: ${product.name}`}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
        'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]'
      )).filter(item => item.getClientRects().length > 0);
      const target = event.shiftKey ? items.at(-1) : items[0];
      const boundary = event.shiftKey ? items[0] : items.at(-1);
      if (target && (document.activeElement === boundary || !event.currentTarget.contains(document.activeElement))) {
        event.preventDefault(); target.focus();
      }
    }}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="quickViewSurface">
      <header className="quickViewHeader"><span className="eyebrow">نظرة أقرب</span>
        <button type="button" className="quickViewClose ghostButton" aria-label="إغلاق العرض السريع" onClick={onClose}><IconX size={22} /></button></header>
      {!result ? <p className="quickViewMessage" role="status">جارٍ تحميل تفاصيل المنتج…</p> : result.product ?
        <ProductDetailClient key={result.product.id} product={result.product} compact /> :
        <div className="quickViewMessage" role="status"><h2>{product.name}</h2><p>{result.error === 'unavailable' ? 'هذا المنتج لم يعد متاحًا للعرض.' : 'تعذّر تحميل المنتج. حاولي مجددًا أو افتحي صفحته.'}</p>
          {result.error === 'network' && <button type="button" className="ghostButton" onClick={() => { setResult(undefined); setRetry(value => value + 1); }}>إعادة المحاولة</button>}</div>}
      {result?.error !== 'unavailable' && <footer className="quickViewFooter"><Link className="ghostButton" href={href} onClick={onClose}>التفاصيل الكاملة للمنتج</Link></footer>}
    </div>
  </dialog>;
}
