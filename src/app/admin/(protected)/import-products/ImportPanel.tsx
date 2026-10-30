'use client';
import { useState } from 'react';
import Link from 'next/link';

type Outcome = { name: string; slug?: string; result: string };
export function ImportPanel() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [error, setError] = useState('');
  async function run() {
    setError('');
    let entries: unknown[];
    try {
      const parsed: unknown = JSON.parse(text);
      entries = Array.isArray(parsed) ? parsed : [parsed];
      if (!entries.length || entries.length > 150) throw new Error();
    } catch { setError('أدخل بيانات منتج أو قائمة منتجات بصيغة JSON صحيحة.'); return; }
    setBusy(true);
    setOutcomes([]);
    try {
      for (const item of entries) {
        const response = await fetch('/admin/api/import-products', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item)
        });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || 'تعذر استيراد المنتج.');
        const name = typeof item === 'object' && item && 'name' in item ? String(item.name) : data.slug;
        setOutcomes(previous => [...previous, { name, slug: data.slug, result: data.result === 'existing' ? 'موجود مسبقًا — بدون تغيير' : 'تمت الإضافة بالصور والمخزون' }]);
      }
      setText('');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'تعذر الاستيراد.'); }
    finally { setBusy(false); }
  }
  return <main className="space-y-6 p-6" dir="rtl">
    <h1 className="text-2xl font-semibold">استيراد المنتجات بالصور</h1>
    <p>إضافة المنتجات وصورها إلى الكتالوج باستخدام إعدادات المتجر الحالية. إعادة إرسال نفس المنتج لا تغيّر بياناته ولا تكرّره.</p>
    <label htmlFor="catalog-import">بيانات المنتجات</label>
    <textarea id="catalog-import" wrap="off" spellCheck={false} value={text} onChange={e => setText(e.target.value)} disabled={busy} rows={8} className="block w-full rounded border p-3 font-mono text-sm" dir="ltr" />
    <button type="button" disabled={busy || !text.trim()} onClick={run} className="rounded bg-[#582e42] px-6 py-3 text-white disabled:opacity-50">{busy ? 'جارٍ الاستيراد…' : 'استيراد المنتجات'}</button>
    <div aria-live="polite" role="status">{busy ? 'جارٍ رفع الصور وحفظ المنتج…' : outcomes.length ? `اكتمل: ${outcomes.length}` : ''}</div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <ul>{outcomes.map((o, i) => <li key={i}>{o.name} — {o.result} {o.slug && <Link href={`/product/${o.slug}`}>عرض المنتج</Link>}</li>)}</ul>
    <Link href="/admin/products">إدارة المنتجات</Link>
  </main>;
}
