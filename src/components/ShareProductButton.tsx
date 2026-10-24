'use client';
import { useState } from 'react';
import { IconShare } from './Icons';
import { shareProduct } from '@/lib/share-product';

export function ShareProductButton({ name, path, canonicalOrigin }: { name: string; path: string; canonicalOrigin?: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  async function handleShare() {
    if (busy) return;
    setBusy(true); setMessage(''); setManualUrl('');
    const url = new URL(path, canonicalOrigin || window.location.origin).href;
    const result = await shareProduct(name, url, {
      share: navigator.share?.bind(navigator),
      copy: navigator.clipboard?.writeText.bind(navigator.clipboard)
    });
    if (result === 'copied') setMessage('تم نسخ رابط المنتج');
    if (result === 'manual') { setMessage('يمكنك تحديد الرابط ونسخه يدويًا'); setManualUrl(url); }
    setBusy(false);
  }
  return <div className="productShare">
    <button type="button" className="ghostButton" disabled={busy} onClick={handleShare}><IconShare /> مشاركة المنتج</button>
    <span role="status">{message}</span>
    {manualUrl && <label>رابط المنتج<input dir="ltr" readOnly value={manualUrl} onFocus={(event) => event.target.select()} /></label>}
  </div>;
}
