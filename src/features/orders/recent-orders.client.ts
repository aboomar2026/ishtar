import { brandStorageKeys } from '@/lib/brand-storage';

export const RECENT_ORDERS_STORAGE_KEY = brandStorageKeys.recentOrders;
const MAX_RECENT_ORDERS = 20;

export type RecentOrder = {
  orderNumber: string;
  phone: string;
  customerName?: string;
  city?: string;
  area?: string;
  total?: number;
  deliveryFeeStatus?: 'PENDING' | 'SET' | 'FREE';
  createdAt: string;
};

function isBrowser() {
  return typeof window !== 'undefined';
}

function normalizeRecentOrder(value: unknown): RecentOrder | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<RecentOrder>;
  if (typeof candidate.orderNumber !== 'string' || !candidate.orderNumber.trim()) return null;
  if (typeof candidate.phone !== 'string' || !candidate.phone.trim()) return null;

  return {
    orderNumber: candidate.orderNumber.trim(),
    phone: candidate.phone.trim(),
    customerName: typeof candidate.customerName === 'string' ? candidate.customerName.trim() : undefined,
    city: typeof candidate.city === 'string' ? candidate.city.trim() : undefined,
    area: typeof candidate.area === 'string' ? candidate.area.trim() : undefined,
    total: typeof candidate.total === 'number' && Number.isFinite(candidate.total) ? candidate.total : undefined,
    deliveryFeeStatus: candidate.deliveryFeeStatus === 'PENDING' || candidate.deliveryFeeStatus === 'SET' || candidate.deliveryFeeStatus === 'FREE' ? candidate.deliveryFeeStatus : undefined,
    createdAt: typeof candidate.createdAt === 'string' && candidate.createdAt.trim() ? candidate.createdAt : new Date().toISOString()
  };
}

function readRawRecentOrders(): RecentOrder[] {
  if (!isBrowser()) return [];
  try {
    const stored = window.localStorage.getItem(RECENT_ORDERS_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeRecentOrder).filter((order): order is RecentOrder => order !== null);
  } catch {
    return [];
  }
}

function writeRecentOrders(orders: RecentOrder[]) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(RECENT_ORDERS_STORAGE_KEY, JSON.stringify(orders.slice(0, MAX_RECENT_ORDERS)));
  } catch {
    /* ignore storage quota/private mode errors */
  }
}

export function getRecentOrders(): RecentOrder[] {
  const seen = new Set<string>();
  return readRawRecentOrders()
    .filter((order) => {
      const key = order.orderNumber.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_RECENT_ORDERS);
}

export function saveRecentOrder(order: RecentOrder) {
  const normalized = normalizeRecentOrder(order);
  if (!normalized) return;

  const existing = getRecentOrders().filter(
    (item) => item.orderNumber.toLowerCase() !== normalized.orderNumber.toLowerCase()
  );
  writeRecentOrders([normalized, ...existing]);
}

export function removeRecentOrder(orderNumber: string): RecentOrder[] {
  const next = getRecentOrders().filter((order) => order.orderNumber.toLowerCase() !== orderNumber.trim().toLowerCase());
  writeRecentOrders(next);
  return next;
}

export function clearRecentOrders() {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(RECENT_ORDERS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
