export const WISHLIST_LIMIT = 50;
export function validProductId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
}
export function sanitizeWishlist(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter(validProductId))].slice(0, WISHLIST_LIMIT) : [];
}
export function parseWishlist(raw: string | null): string[] {
  if (!raw || raw.length > 12000) return [];
  try { return sanitizeWishlist(JSON.parse(raw)); } catch { return []; }
}
