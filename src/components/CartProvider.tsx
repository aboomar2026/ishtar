'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CartLine } from '@/lib/types';
import { calcLineTotal, calcOrderTotals } from '@/features/orders/order-pricing';

type AddToCartInput = CartLine;

type CartContextValue = {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  addToCart: (input: AddToCartInput) => void;
  updateQuantity: (index: number, quantity: number) => void;
  removeLine: (index: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = 'bab-al-hara-cart-v2';

function getLinePrice(line: CartLine) {
  return calcLineTotal(line.unitPrice, line.quantity);
}

function sanitizeLine(line: CartLine): CartLine | null {
  if (!line.productId || !line.variantId || !line.slug || !line.name || !line.unitPrice) return null;
  return {
    ...line,
    quantity: Math.max(1, Number(line.quantity) || 1),
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

  useEffect(() => {
    setLines(readInitialCart());
    setIsCartLoaded(true);
  }, []);

  useEffect(() => {
    if (!isCartLoaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [isCartLoaded, lines]);

  const addToCart = useCallback((input: AddToCartInput) => {
    const sanitized = sanitizeLine(input);
    if (!sanitized) return;

    setLines((current) => {
      const existingIndex = current.findIndex((line) => line.variantId === sanitized.variantId);

      if (existingIndex >= 0) {
        return current.map((line, index) =>
          index === existingIndex ? { ...line, quantity: line.quantity + sanitized.quantity } : line
        );
      }

      return [...current, sanitized];
    });
  }, []);

  const updateQuantity = useCallback((index: number, quantity: number) => {
    setLines((current) =>
      current
        .map((line, lineIndex) => (lineIndex === index ? { ...line, quantity } : line))
        .filter((line) => line.quantity > 0)
    );
  }, []);

  const removeLine = useCallback((index: number) => {
    setLines((current) => current.filter((_, lineIndex) => lineIndex !== index));
  }, []);

  const clearCart = useCallback(() => setLines([]), []);

  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + getLinePrice(line), 0), [lines]);
  const itemCount = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);
  const totals = calcOrderTotals(subtotal);
  const deliveryFee = totals.deliveryFee;
  const total = totals.total;

  const value = useMemo(
    () => ({ lines, itemCount, subtotal, deliveryFee, total, addToCart, updateQuantity, removeLine, clearCart }),
    [lines, itemCount, subtotal, deliveryFee, total, addToCart, updateQuantity, removeLine, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used inside CartProvider');
  return value;
}
