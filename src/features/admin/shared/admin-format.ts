import type { ProductStockState } from '@/features/catalog/catalog.types';

export const ADMIN_CURRENCY = '₪';

const ARABIC_TRANSLITERATION: Record<string, string> = {
  'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a', 'ء': '', 'ئ': 'e', 'ؤ': 'o',
  'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh',
  'د': 'd', 'ذ': 'th', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh',
  'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh',
  'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
  'ه': 'h', 'ة': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
};

function transliterateArabic(input: string): string {
  return Array.from(input).map((char) => ARABIC_TRANSLITERATION[char] ?? char).join('');
}

/** Build a readable URL-safe slug from arbitrary text, including Arabic product names. */
export function slugify(input: string): string {
  const transliterated = transliterateArabic(input);
  const slug = transliterated
    .toString()
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  if (slug) return slug;
  return `product-${Date.now().toString(36)}`;
}

export function formatCurrency(value: number): string {
  return `${ADMIN_CURRENCY}${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Hebron'
  });
}

/** Stock state for a single variant given its quantity and low-stock threshold. */
export function variantStockState(quantity: number, lowStockThreshold: number): ProductStockState {
  if (quantity <= 0) return 'out-of-stock';
  if (quantity <= lowStockThreshold) return 'low-stock';
  return 'in-stock';
}

export const STOCK_STATE_LABEL: Record<ProductStockState, string> = {
  'in-stock': 'متوفر',
  'low-stock': 'مخزون منخفض',
  'out-of-stock': 'نفد المخزون'
};
