'use client';

import { getCartAvailability } from '@/features/orders/cart.actions';
import { brandStorageKeys } from '@/lib/brand-storage';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { CartLine } from '@/lib/types';
import { calcLineTotal, calcOrderTotals } from '@/features/orders/order-pricing';

type AddToCartInput = CartLine;

type CartContextValue = {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  addToCart: (input: AddToCartInput) => boolean;
  updateQuantity: (index: number, quantity: number) => void;
  removeLine: (index: number) => void;
  clearCart: () => void;
  isCartLoaded: boolean;
  refreshing: boolean;
  cartError: string | null;
  refreshCart: () => Promise<boolean>;
  undoRemove: () => void;
  canUndo: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = brandStorageKeys.cart;

function getLinePrice(line: CartLine) {
  return calcLineTotal(line.unitPrice, line.quantity);
}

function sanitizeLine(line: CartLine): CartLine | null {
  if (!line.productId || !line.variantId || !line.slug || !line.name || !Number.isFinite(Number(line.unitPrice)) || Number(line.unitPrice) < 0) return null;
  return {
    ...line,
    quantity: Math.min(999, Math.max(1, Math.floor(Number(line.quantity)) || 1)),
    unitPrice: Number(line.unitPrice),
    compareAtPrice: line.compareAtPrice ? Number(line.compareAtPrice) : undefined
  };
}

function readInitialCart() {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as CartLine[];
    return parsed.map(sanitizeLine).filter((line): line is CartLine => Boolean(line));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [isCartLoaded, setIsCartLoaded] = useState(false);
  const requestRef = useRef(0);
  const [refreshing, setRefreshing] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [removed, setRemoved] = useState<CartLine | null>(null);
  const ids = lines.map((line) => line.variantId).sort().join(',');
  const refreshCart = useCallback(async () => {
    const request = ++requestRef.current;
    if (!ids) { setCartError(null); setRefreshing(false); return true; }
    setRefreshing(true);
    try {
      const availability = await getCartAvailability(ids.split(','));
      if (request !== requestRef.current) return false;
      const byId = new Map(availability.map((variant) => [variant.id, variant]));
      setLines((current) => current.map((line) => {
        const variant = byId.get(line.variantId);
        if (!variant) return { ...line, maxQuantity: 0 };
        return { ...line, maxQuantity: variant.quantity, quantity: variant.quantity > 0 ? Math.min(line.quantity, variant.quantity) : line.quantity, unitPrice: variant.price, compareAtPrice: variant.compareAtPrice };
      }));
      setCartError(null);
      return true;
    } catch { if (request !== requestRef.current) return false; setCartError('تعذر تحديث الأسعار والمخزون. تحققي من الاتصال ثم أعيدي المحاولة.'); return false; }
    finally { if (request === requestRef.current) setRefreshing(false); }
  }, [ids]);
  useEffect(() => {
    if (!isCartLoaded) return;
    void refreshCart();
    const onFocus = () => { void refreshCart(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [isCartLoaded, refreshCart]);

  useEffect(() => {
    setLines(readInitialCart());
    setIsCartLoaded(true);
  }, []);

  useEffect(() => {
    if (!isCartLoaded) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines)); }
    catch { setCartError('تعذر حفظ السلة على هذا الجهاز. ستبقى متاحة خلال الجلسة الحالية.'); }
  }, [isCartLoaded, lines]);

  const addToCart = useCallback((input: AddToCartInput) => {
    const sanitized = sanitizeLine(input);
    if (!sanitized) return false;
    const existing = lines.find((line) => line.variantId === sanitized.variantId);
    const max = sanitized.maxQuantity ?? existing?.maxQuantity ?? 999;
    if (max <= 0 || (existing && existing.quantity >= max)) return false;

    setLines((current) => {
      const existingIndex = current.findIndex((line) => line.variantId === sanitized.variantId);

      if (existingIndex >= 0) {
        return current.map((line, index) =>
          index === existingIndex ? { ...line, quantity: Math.min(sanitized.maxQuantity ?? 999, line.quantity + sanitized.quantity), maxQuantity: sanitized.maxQuantity ?? line.maxQuantity } : line
        );
      }

      return [...current, { ...sanitized, quantity: Math.min(sanitized.quantity, max) }];
    });
    return true;
  }, [lines]);

  const updateQuantity = useCallback((index: number, quantity: number) => {
    setLines((current) =>
      current
        .map((line, lineIndex) => (lineIndex === index ? { ...line, quantity: Math.min(Math.max(1, line.maxQuantity ?? 999), Math.max(1, Math.floor(quantity))) } : line))
        .filter((line) => line.quantity > 0 || line.maxQuantity === 0)
    );
  }, []);

  const removeLine = useCallback((index: number) => {
    setRemoved(lines[index] ?? null);
    setLines((current) => current.filter((_, lineIndex) => lineIndex !== index));
  }, [lines]);
  const undoRemove = useCallback(() => {
    if (removed) { setLines((current) => current.some((line) => line.variantId === removed.variantId) ? current : [...current, removed]); setRemoved(null); }
  }, [removed]);

  const clearCart = useCallback(() => { setLines([]); setRemoved(null); }, []);

  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + getLinePrice(line), 0), [lines]);
  const itemCount = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);
  const totals = calcOrderTotals(subtotal);
  const deliveryFee = totals.deliveryFee;
  const total = totals.total;

  const value = useMemo(
    () => ({ lines, itemCount, subtotal, deliveryFee, total, addToCart, updateQuantity, removeLine, clearCart, isCartLoaded, refreshing, cartError, refreshCart, undoRemove, canUndo: Boolean(removed) }),
    [lines, itemCount, subtotal, deliveryFee, total, addToCart, updateQuantity, removeLine, clearCart, isCartLoaded, refreshing, cartError, refreshCart, undoRemove, removed]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used inside CartProvider');
  return value;
}
