import { validProductId } from '@/features/wishlist/wishlist-storage';

export const RECENT_LIMIT = 12;
export function parseRecentProducts(raw: string | null): string[] {
  if (!raw || raw.length > 12000) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? [...new Set(value.filter(validProductId))].slice(0, RECENT_LIMIT) : [];
  } catch { return []; }
}
export function recordRecentProduct(ids: string[], id: string): string[] {
  return validProductId(id) ? [id, ...ids.filter((previous) => previous !== id)].slice(0, RECENT_LIMIT) : ids;
}
