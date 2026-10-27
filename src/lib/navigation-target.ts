/** Only same-tab page changes need an application navigation indicator. */
export function pageNavigationTarget(href: string, current: string): string | null {
  try {
    const from = new URL(current);
    const to = new URL(href, from);
    if (!['http:', 'https:'].includes(to.protocol) || to.origin !== from.origin) return null;
    if (to.pathname === from.pathname && to.search === from.search) return null;
    return `${to.pathname}${to.search}${to.hash}`;
  } catch { return null; }
}
