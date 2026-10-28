'use client';

import { useState } from 'react';
import { ImageUploadButton } from './ImageUploadButton';
import { MAX_UPLOAD_LABEL } from '@/features/admin/uploads/upload-constants';

function ImagePreview({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <p className="adminMuted" role="status">{failed ? 'تعذّر تحميل الصورة. اختَر صورة أخرى أو تحقّق من الرابط.' : 'لم تُحدّد صورة؛ ستظهر الصورة الافتراضية في المتجر.'}</p>;
  }
  return <img src={src} alt="معاينة صورة التصنيف" onError={() => setFailed(true)} style={{ display: 'block', width: 192, maxWidth: '100%', aspectRatio: '4 / 5', objectFit: 'contain', borderRadius: 12 }} />;
}

export function CategoryImageEditor({ imageUrl, onChange, onUploadingChange }: {
  imageUrl: string;
  onChange: (url: string) => void;
  onUploadingChange: (uploading: boolean) => void;
}) {
  const src = imageUrl.trim();
  return (
    <div className="adminField">
      <span>صورة التصنيف</span>
      <ImagePreview key={src} src={src} />
      <ImageUploadButton kind="banner" label="رفع صورة من الجهاز" onUploadingChange={onUploadingChange} onUploaded={(image) => onChange(image.secureUrl)} />
      <small>JPG، PNG، WebP أو AVIF، حتى {MAX_UPLOAD_LABEL}. اختَر صورة عمودية بنسبة 4:5. اضغط حفظ التصنيف لاعتماد التغيير.</small>
      {src && <button type="button" className="adminBtn adminBtnGhost adminBtnSm" onClick={() => onChange('')}>إزالة صورة التصنيف</button>}
      <details>
        <summary>استخدام رابط صورة بدل الرفع</summary>
        <label htmlFor="categorymanager-4">رابط الصورة أو المسار</label>
        <input id="categorymanager-4" value={imageUrl} onChange={(event) => onChange(event.target.value)} placeholder="https://…" />
      </details>
    </div>
  );
}
