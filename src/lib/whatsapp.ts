export type WhatsAppContext =
  | { kind: 'general' | 'cart' }
  | { kind: 'order'; orderNumber: string }
  | { kind: 'product'; name: string; url?: string; sku?: string };

/** Click-to-chat only: no SDK, tracking, automatic sends or customer details. */
export function whatsappHref(number: string, context: WhatsAppContext = { kind: 'general' }): string | undefined {
  const digits = number.replace(/[+\s()-]/g, '');
  if (!/^[1-9]\d{6,14}$/.test(digits)) return undefined;
  let text = 'مرحباً، أود الاستفسار عن المتجر.';
  if (context.kind === 'cart') text = 'مرحباً، أحتاج مساعدة بخصوص سلة التسوق وإتمام الطلب.';
  if (context.kind === 'order') text = `مرحباً، أود الاستفسار عن طلبي رقم: ${context.orderNumber}`;
  if (context.kind === 'product') {
    text = `مرحباً، أود الاستفسار عن المنتج: ${context.name}`;
    if (context.sku) text += `\nرمز المنتج: ${context.sku}`;
    if (context.url) {
      try {
        const url = new URL(context.url);
        if (url.protocol === 'https:' || url.protocol === 'http:') {
          // Never forward query strings, fragments or credentials to WhatsApp.
          text += `\n${url.origin}${url.pathname}`;
        }
      } catch { /* A product name is enough when no public origin is configured. */ }
    }
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
