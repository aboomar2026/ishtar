type ShareCapabilities = {
  share?: (data: { title: string; url: string }) => Promise<void>;
  copy?: (url: string) => Promise<void>;
};
export async function shareProduct(title: string, url: string, capabilities: ShareCapabilities): Promise<'shared' | 'copied' | 'cancelled' | 'manual'> {
  if (capabilities.share) {
    try { await capabilities.share({ title, url }); return 'shared'; }
    catch (error) { if (error instanceof Error && error.name === 'AbortError') return 'cancelled'; }
  }
  if (capabilities.copy) {
    try { await capabilities.copy(url); return 'copied'; } catch { /* Offer selectable URL. */ }
  }
  return 'manual';
}
