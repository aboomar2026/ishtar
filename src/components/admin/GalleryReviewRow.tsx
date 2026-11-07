'use client';

import { useState, useTransition } from 'react';
import { appendReviewedGalleryImage } from '@/features/admin/products/gallery-review.actions';
import { validateImageFile, type UploadResponse } from '@/features/admin/uploads/upload-constants';

type Props = { productId: string; productName: string; imageCount: number; primaryUrl: string | null };
export function GalleryReviewRow({ productId, productName, imageCount, primaryUrl }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, startTransition] = useTransition();
  async function save() {
    if (!file || !checked) return;
    const error = validateImageFile(file);
    if (error) { setNotice(error); return; }
    startTransition(async () => {
      setNotice('جارٍ رفع الصورة…');
      try {
        const data = new FormData();
        data.set('file', file);
        data.set('kind', 'product');
        const response = await fetch('/admin/api/uploads', { method: 'POST', body: data });
        const uploaded = (await response.json()) as UploadResponse;
        if (!response.ok || !uploaded.success) {
          setNotice(uploaded.success ? 'فشل رفع الصورة.' : uploaded.error);
          return;
        }
        const result = await appendReviewedGalleryImage(productId, uploaded.image.secureUrl, uploaded.image.publicId);
        setNotice(result.message);
        if (result.ok) { setFile(null); setPreview(null); setChecked(false); }
      } catch {
        setNotice('فشل الاتصال أثناء حفظ الصورة.');
      }
    });
  }
  return (
    <div className="adminCard" style={{ padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'start' }}>
        {primaryUrl ? <img src={primaryUrl} alt={productName} width={92} height={120} style={{ objectFit: 'cover', borderRadius: 8 }} /> : null}
        <div style={{ flex: '1 1 260px' }}>
          <strong>{productName}</strong>
          <p className="adminMuted">عدد الصور الحالية: {imageCount} · ستبقى الصورة الرئيسية كما هي</p>
          <label>الصورة الجديدة (JPG / PNG / WebP / AVIF بحد أقصى 5MB)
            <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy}
              onChange={e => {
                const selected = e.target.files?.[0] ?? null;
                setFile(selected); setChecked(false); setNotice('');
                setPreview(old => { if (old) URL.revokeObjectURL(old); return selected ? URL.createObjectURL(selected) : null; });
              }} />
          </label>
        </div>
        {preview ? <img src={preview} alt="معاينة الصورة المقترحة" width={110} height={140} style={{ objectFit: 'cover', borderRadius: 8 }} /> : null}
      </div>
      {file ? (
        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} disabled={busy} />
            فحصت الصورة وتأكدت أنها تمثل نفس المنتج ولا تضيف تفاصيل مضللة.
          </label>
          <button type="button" className="adminBtn adminBtnPrimary" disabled={!checked || busy} onClick={save}
            style={{ marginTop: 10 }}>{busy ? 'جارٍ الحفظ…' : 'اعتماد وإضافة للمعرض'}</button>
        </div>
      ) : null}
      {notice ? <p role="status">{notice}</p> : null}
    </div>
  );
}
