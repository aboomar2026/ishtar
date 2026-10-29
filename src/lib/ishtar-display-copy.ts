/** Display-safe replacement for obsolete storefront branding in editable copy.
 * Keep URLs, customer-entered text, and image assets untouched.
 * Database cleanup is independently documented in scripts/sql.
 */
export function ishtarDisplayCopy(value: string | null | undefined): string {
  if (!value) return value ?? '';
  return value
    .replace(/سعد\s*سنتر/gu, 'عشتار')
    .replace(/saad[\s-]*center/giu, 'ISHTAR')
    .replace(/باب\s*الحارة/gu, 'عشتار')
    .replace(/bab[\s-]*al[\s-]*hara/giu, 'ISHTAR');
}
