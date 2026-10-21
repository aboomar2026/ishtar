/** Accept Arabic and Persian keyboards without silently discarding digits. */
export function normalizeDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => String(
    digit.charCodeAt(0) - (digit >= '۰' ? 0x06f0 : 0x0660)
  ));
}

export function formatMoney(value: number, currency = '₪'): string {
  return `${currency}${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)}`;
}
