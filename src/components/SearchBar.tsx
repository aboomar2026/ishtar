'use client';

import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconSearch, IconX } from './Icons';
import { normalizeSuggestionQuery, SEARCH_QUERY_LIMIT, type SearchSuggestion } from '@/features/catalog/search-suggestions';
import { FALLBACK_PRODUCT_IMAGE } from '@/features/catalog/catalog.utils';
import { getCloudinaryTransformedUrl } from '@/lib/cloudinary-image';

export function SearchBar({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [response, setResponse] = useState<{ query: string; products: SearchSuggestion[]; collections?: Pick<SearchSuggestion, 'id' | 'name' | 'slug' | 'image'>[]; failed?: boolean }>();
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const id = useId();
  const term = normalizeSuggestionQuery(query);
  const visible = open && term.length >= 2;
  const current = response?.query === term ? response : undefined;
  const products = [...(current?.collections ?? []).map(c => ({ ...c, price: 0, available: true, kind: 'collection' })), ...(current?.products ?? []).map(p => ({ ...p, kind: 'product' }))];
  const resultHref = (p: typeof products[number]) => `/${p.kind === 'collection' ? 'collections' : 'product'}/${encodeURIComponent(p.slug)}`;
  const loading = visible && !current;

  useEffect(() => {
    if (!visible) return;
    let disposed = false;
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout>;
    const debounce = setTimeout(async () => {
      timeout = setTimeout(() => controller.abort(), 7000);
      try {
        const result = await fetch(`/api/catalog/suggestions?q=${encodeURIComponent(term)}`, { signal: controller.signal, cache: 'no-store' });
        if (!result.ok) throw new Error('unavailable');
        const body = await result.json();
        if (!Array.isArray(body.products) || body.products.length > 6 || body.products.some((p: SearchSuggestion) =>
          !p || typeof p.id !== 'string' || typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.image !== 'string' || !Number.isFinite(p.price) || typeof p.available !== 'boolean')) throw new Error('invalid');
        if (body.collections !== undefined && (!Array.isArray(body.collections) || body.collections.length > 2 || body.collections.some((c: Pick<SearchSuggestion, 'id' | 'name' | 'slug' | 'image'>) => !c || ['id','name','slug','image'].some(key => typeof c[key as keyof typeof c] !== 'string')))) throw new Error('invalid');
        if (!disposed) setResponse({ query: term, products: body.products, collections: body.collections ?? [] });
      } catch { if (!disposed) setResponse({ query: term, products: [], failed: true }); }
      finally { clearTimeout(timeout); }
    }, 300);
    return () => { disposed = true; clearTimeout(debounce); clearTimeout(timeout); controller.abort(); };
  }, [term, visible]);

  function dismiss() { setOpen(false); setActive(-1); }
  function navigate(href: string) { dismiss(); inputRef.current?.blur(); router.push(href); }
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!term) return;
    navigate(`/category/all?q=${encodeURIComponent(term)}`);
  }
  function select(index: number) { setActive(index); optionRefs.current[index]?.scrollIntoView({ block: 'nearest' }); }

  return <form className={`searchBar ${compact ? 'compact' : ''}`} onSubmit={onSubmit} role="search"
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) dismiss(); }}>
    <IconSearch size={18} />
    <input ref={inputRef} type="search" enterKeyHint="search" maxLength={SEARCH_QUERY_LIMIT} value={query}
      role="combobox" aria-autocomplete="list" aria-expanded={visible} aria-controls={visible ? id : undefined}
      aria-activedescendant={visible && products[active] ? `${id}-${active}` : undefined}
      autoComplete="off" onFocus={() => setOpen(true)}
      onChange={event => { setQuery(event.target.value); setActive(-1); setOpen(true); }}
      onKeyDown={event => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Enter' && visible && products[active]) { event.preventDefault(); navigate(resultHref(products[active])); }
        else if (event.key === 'Escape') { event.preventDefault(); dismiss(); }
        else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && products.length && term.length >= 2) {
          event.preventDefault(); setOpen(true);
          select(event.key === 'ArrowDown' ? (active + 1) % products.length : (active < 0 ? products.length - 1 : (active + products.length - 1) % products.length));
        }
      }} aria-label="البحث في جميع المنتجات" placeholder="ابحثي عن شنط، عطور، هدايا..." />
    {query && <button type="button" className="searchClear" aria-label="مسح البحث" onClick={() => {
      setQuery(''); setResponse(undefined); dismiss(); inputRef.current?.focus();
    }}><IconX size={16} /></button>}
    <button type="submit" className="searchSubmit">بحث</button>
    {visible && <div className="searchSuggestions">
      <p className="searchSuggestionStatus" role="status">{loading ? 'جارٍ البحث…' : current?.failed ? 'تعذّر تحميل الاقتراحات؛ يمكنك البحث في جميع المنتجات.' : products.length ? `${products.length} اقتراحات — استخدمي الأسهم ثم Enter لفتح النتيجة.` : 'لا توجد اقتراحات مطابقة. جرّبي كلمة أخرى.'}</p>
      <ul id={id} role="listbox" aria-label="اقتراحات المنتجات" aria-busy={loading}>
        {products.map((product, index) => <li role="presentation" key={`${product.kind}-${product.id}`}>
          <Link ref={node => { optionRefs.current[index] = node; }} id={`${id}-${index}`} role="option" aria-selected={active === index}
            href={resultHref(product)} tabIndex={-1} className="searchSuggestion"
            onMouseDown={event => event.preventDefault()} onClick={() => { dismiss(); inputRef.current?.blur(); }}>
            <img src={getCloudinaryTransformedUrl(product.image, { width: 96, height: 96, crop: 'fit' })} alt="" width={48} height={48}
              onError={event => { if (!event.currentTarget.src.endsWith(FALLBACK_PRODUCT_IMAGE)) event.currentTarget.src = FALLBACK_PRODUCT_IMAGE; }} />
            <span><strong>{product.name}</strong><small>{product.kind === 'collection' ? 'مجموعة · اكتشفي المنتجات' : product.available ? `₪${product.price.toLocaleString('en-US')}` : 'غير متوفر حاليًا'}</small></span>
          </Link>
        </li>)}
      </ul>
      <Link className="searchAllResults" href={`/category/all?q=${encodeURIComponent(term)}`} onClick={() => { dismiss(); inputRef.current?.blur(); }}>عرض جميع النتائج</Link>
    </div>}
  </form>;
}
