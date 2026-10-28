'use client';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { brandStorageKeys } from '@/lib/brand-storage';
import { parseWishlist, validProductId, WISHLIST_LIMIT } from '@/features/wishlist/wishlist-storage';
import { IconX } from './Icons';

type WishlistValue = { ids: string[]; loaded: boolean; persistent: boolean; toggle: (id: string) => void; remove: (ids: string[]) => void };
const WishlistContext = createContext<WishlistValue | null>(null);
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [persistent, setPersistent] = useState(true);
  const [message, setMessage] = useState('');
  const current = useRef<string[]>([]);
  const canPersist = useRef(true);
  const update = (next: string[]) => { current.current = next; setIds(next); };
  useEffect(() => {
    try { update(parseWishlist(window.localStorage.getItem(brandStorageKeys.wishlist))); }
    catch { canPersist.current = false; setPersistent(false); }
    setLoaded(true);
    const sync = (event: StorageEvent) => {
      if (canPersist.current && (event.key === brandStorageKeys.wishlist || event.key === null)) update(parseWishlist(event.newValue));
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(''), 5000); return () => clearTimeout(timer); }, [message]);

  function latest() {
    if (canPersist.current) try { return parseWishlist(window.localStorage.getItem(brandStorageKeys.wishlist)); }
    catch { canPersist.current = false; setPersistent(false); }
    return current.current;
  }
  function commit(next: string[], feedback: string) {
    if (canPersist.current) try { window.localStorage.setItem(brandStorageKeys.wishlist, JSON.stringify(next)); }
    catch { canPersist.current = false; setPersistent(false); }
    update(next);
    setMessage(feedback + (canPersist.current ? '' : ' الحفظ متاح لهذه الجلسة فقط؛ تخزين المتصفح غير متاح.'));
  }
  const value = useMemo<WishlistValue>(() => ({ ids, loaded, persistent,
    toggle(id) {
      if (!loaded || !validProductId(id)) return;
      const before = latest();
      if (before.includes(id)) commit(before.filter(item => item !== id), 'أُزيل المنتج من المفضّلة.');
      else if (before.length >= WISHLIST_LIMIT) setMessage(`المفضّلة ممتلئة (${WISHLIST_LIMIT} منتجًا). أزيلي منتجًا لحفظ غيره.`);
      else commit([id, ...before], 'حُفظ المنتج في المفضّلة.');
    },
    remove(toRemove) { if (loaded) { const removed = new Set(toRemove); commit(latest().filter(id => !removed.has(id)), 'تم تحديث المفضّلة.'); } }
  // Mutation helpers read refs/storage synchronously, so rapid actions use the latest list.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [ids, loaded, persistent]);
  return <WishlistContext.Provider value={value}>{children}<div className="wishlistFeedback" role="status" aria-live="polite">
    {message && <><span>{message}</span><button type="button" aria-label="إغلاق إشعار المفضّلة" onClick={() => setMessage('')}><IconX size={18} /></button></>}
  </div></WishlistContext.Provider>;
}
export function useWishlist() {
  const value = useContext(WishlistContext);
  if (!value) throw new Error('WishlistProvider is required');
  return value;
}
