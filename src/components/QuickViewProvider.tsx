'use client';
import dynamic from 'next/dynamic';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { Product } from '@/lib/types';

const QuickView = dynamic(() => import('./QuickView').then(module => module.QuickView), {
  ssr: false,
  loading: () => <div className="quickViewFallback loadingSkeletonCaption" role="status"><span className="ishtarSpinner" aria-hidden="true" />جارٍ فتح العرض السريع…</div>,
});
type Preview = Pick<Product, 'id' | 'name' | 'slug'>;
const QuickViewContext = createContext<{ openQuickView: (product: Preview) => void } | null>(null);
export function QuickViewProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [selection, setSelection] = useState<{ product: Preview; pathname: string; opener: HTMLElement | null }>();
  const openQuickView = useCallback((product: Preview) => setSelection({ product: { id: product.id, name: product.name, slug: product.slug }, pathname, opener: document.activeElement as HTMLElement | null }), [pathname]);
  useEffect(() => {
    if (selection && selection.pathname !== pathname) setSelection(undefined);
  }, [pathname, selection]);
  const close = useCallback(() => setSelection(undefined), []);
  const value = useMemo(() => ({ openQuickView }), [openQuickView]);
  return <QuickViewContext.Provider value={value}>{children}
    {selection && selection.pathname === pathname && <QuickView key={selection.product.id} product={selection.product} onClose={close} opener={selection.opener} />}
  </QuickViewContext.Provider>;
}
export function useQuickView() {
  const context = useContext(QuickViewContext);
  if (!context) throw new Error('QuickViewProvider is required');
  return context;
}
