'use client';

import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { pageNavigationTarget } from '@/lib/navigation-target';

type Options = { scroll?: boolean };
type Navigation = { push: (href: string, options?: Options) => void; replace: (href: string, options?: Options) => void };
const NavigationContext = createContext<Navigation | null>(null);

// Only this tiny observer needs searchParams/Suspense. Page content stays outside
// a new loading boundary so missing products/categories retain real HTTP 404s.
function CommitObserver({ onCommit }: { onCommit: (key: string) => void }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const key = `${pathname}${search.size ? `?${search}` : ''}`;
  useEffect(() => onCommit(key), [key, onCommit]);
  return null;
}

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [transitionPending, startTransition] = useTransition();
  const [nativePending, setNativePending] = useState(false);
  const [destination, setDestination] = useState<{ href: string }>();
  const [slow, setSlow] = useState(false);
  const renderedKey = useRef('');
  const pending = transitionPending || nativePending;
  const navigate = useCallback((href: string, replace: boolean, options?: Options) => {
    const target = pageNavigationTarget(href, window.location.href);
    if (!target) { (replace ? router.replace : router.push)(href, options); return; }
    setNativePending(false);
    setSlow(false);
    setDestination({ href: target });
    startTransition(() => { (replace ? router.replace : router.push)(target, options); });
  }, [router]);
  const navigation = useMemo<Navigation>(() => ({
    push: (href, options) => navigate(href, false, options),
    replace: (href, options) => navigate(href, true, options),
  }), [navigate]);
  const committed = useCallback((key: string) => { renderedKey.current = key; setNativePending(false); }, []);

  useEffect(() => {
    if (!pending) { setSlow(false); return; }
    const timer = window.setTimeout(() => setSlow(true), 12000);
    return () => window.clearTimeout(timer);
  }, [pending, destination]);

  useEffect(() => {
    function beginNative(href: string) {
      const target = pageNavigationTarget(href, window.location.href);
      if (!target) return;
      setDestination({ href: target }); setSlow(false); setNativePending(true);
    }
    function click(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (!anchor || anchor.hasAttribute('data-navigation-managed') || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return;
      beginNative(anchor.href);
    }
    function popstate() {
      const key = `${window.location.pathname}${window.location.search}`;
      if (key === renderedKey.current) return;
      setDestination({ href: `${key}${window.location.hash}` }); setSlow(false); setNativePending(true);
    }
    const restored = () => setNativePending(false);
    document.addEventListener('click', click);
    window.addEventListener('popstate', popstate);
    window.addEventListener('pageshow', restored);
    return () => { document.removeEventListener('click', click); window.removeEventListener('popstate', popstate); window.removeEventListener('pageshow', restored); };
  }, []);

  return <NavigationContext.Provider value={navigation}>
    <Suspense fallback={null}><CommitObserver onCommit={committed} /></Suspense>
    {children}
    {pending && <div className="navigationFeedback" data-testid="navigation-feedback">
      <div className="navigationProgress" aria-hidden="true"><span /></div>
      <div className="navigationNotice">
        <span className="ishtarSpinner" aria-hidden="true" />
        <div role="status" aria-live="polite" aria-atomic="true"><strong>{slow ? 'الانتقال أطول من المعتاد' : 'جارٍ فتح الصفحة…'}</strong>
          {slow && <p>قد يكون الاتصال بطيئًا. تحققي من الإنترنت أو أعيدي المحاولة.</p>}</div>
        {slow && <button type="button" className="ghostButton" onClick={() => { if (destination) window.location.assign(destination.href); }}>إعادة المحاولة</button>}
      </div>
    </div>}
  </NavigationContext.Provider>;
}

export function useNavigation() { return useContext(NavigationContext); }

/** Wrap explicit push/replace only. Background refresh/polling stays quiet. */
export function useNavigationRouter() {
  const router = useRouter();
  const navigation = useNavigation();
  return useMemo(() => navigation ? { ...router, ...navigation } : router, [router, navigation]);
}
