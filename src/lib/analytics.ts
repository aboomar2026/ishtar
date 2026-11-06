// Only allow catalog data into GA. Never pass checkout forms or order receipts.
export const ANALYTICS_READY_EVENT = 'ishtar:analytics-ready';
export const COOKIELESS_CONSENT = { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' } as const;
export type AnalyticsItem = { item_id: string; item_variant?: string; price: number; quantity: number };
type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
export function validMeasurementId(value: string | undefined): value is string {
  return /^G-[A-Z0-9]{5,20}$/.test(value ?? '');
}
export function safeAnalyticsUrl(input: string): string {
  try {
    const url = new URL(input);
    url.hash = '';
    const campaign = new URLSearchParams();
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
      const value = url.searchParams.get(key);
      if (value && /^[a-zA-Z0-9_-]{1,80}$/.test(value) && !/\d{7}/.test(value)) campaign.set(key, value);
    }
    url.search = campaign.toString();
    return url.toString();
  } catch { return ''; }
}
export function analyticsPageTitle(path: string) {
  if (path.startsWith('/product/')) return 'Ishtar | Product';
  if (path.startsWith('/category/')) return 'Ishtar | Category';
  if (path.startsWith('/collections')) return 'Ishtar | Collections';
  return ({ '/': 'Ishtar | Home', '/cart': 'Ishtar | Cart', '/checkout': 'Ishtar | Checkout', '/order-success': 'Ishtar | Order received', '/track-order': 'Ishtar | Track order', '/privacy': 'Ishtar | Privacy' } as Record<string, string>)[path] ?? 'Ishtar';
}
export function getAnalyticsWindow(): AnalyticsWindow | undefined {
  if (typeof window === 'undefined' || !['www.ishtar.live', 'ishtar.live'].includes(window.location.hostname) || window.location.pathname.startsWith('/admin')) return;
  return window as AnalyticsWindow;
}
export function trackCommerce(event: 'add_to_cart' | 'view_item' | 'begin_checkout' | 'purchase', items: AnalyticsItem[], transactionId?: string, value?: number) {
  try {
    const target = getAnalyticsWindow();
    if (!target?.gtag || !items.length || (event === 'purchase' && !transactionId)) return false;
    const cleanItems = items.map(item => ({ item_id: item.item_id, ...(item.item_variant ? { item_variant: item.item_variant } : {}), price: item.price, quantity: item.quantity }));
    if (cleanItems.some(item => !Number.isFinite(item.price) || item.price < 0 || !Number.isInteger(item.quantity) || item.quantity < 1)) return false;
    target.gtag('event', event, { currency: 'ILS', value: value ?? Number(cleanItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)), items: cleanItems,
      ...(transactionId ? { transaction_id: transactionId } : {}), page_location: safeAnalyticsUrl(window.location.href), page_title: analyticsPageTitle(window.location.pathname) });
    return true;
  } catch { return false; /* Tracking must never interrupt shopping. */ }
}
