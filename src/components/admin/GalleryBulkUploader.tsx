'use client';

import { useState, useTransition } from 'react';
import { appendReviewedGalleryImage } from '@/features/admin/products/gallery-review.actions';
import { validateImageFile, type UploadResponse } from '@/features/admin/uploads/upload-constants';

type Product = { id: string; name: string };
const mappings: { filename: string; name: string }[] = [
  { filename: '01_pink_dress.jpg', name: 'فستان نسائي طويل مفصل ناعم' },
  { filename: '02_navy_jumpsuit.jpg', name: 'جمبسوت (Jumpsuit) نسائي طويل' },
  { filename: '03_olive_suit.jpg', name: 'طقم نسائي كلاسيكي' },
  { filename: '04_mauve_cape.jpg', name: 'عباية نسائية طويلة بقطعة علوية كاب' },
  { filename: '05_camel_suit.jpg', name: 'طقم نسائي أنيق' },
  { filename: '06_lavender_dress.jpg', name: 'فستان نسائي طويل' },
  { filename: '07_black_abaya.jpg', name: 'عباية نسائية مفصل سوداء' },
  { filename: '08_embroidered_abaya.jpg', name: 'عباية قطعتين مطرزة مع حزام خصر' },
  { filename: '09_teal_formal_suit.jpg', name: 'طقم نسائي رسمي قطعتين' },
  { filename: '10_button_tunic.jpg', name: 'تونيك نسائي طويل بأزرار أمامية' }
];
export function GalleryBulkUploader({ products }: { products: Product[] }) {
  const [files, setFiles] = useState<File[]>([]);
  const [approval, setApproval] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const matches = mappings.map(m => ({
    ...m,
    product: products.find(p => p.name.trim() === m.name),
    file: files.find(f => f.name === m.filename)
  }));
  const allMatched = matches.every(m => m.product && m.file) && files.length === 10 &&
    matches.every(m => m.file && !validateImageFile(m.file));
  function submit() {
    if (!approval || !allMatched || pending) return;
    startTransition(async () => {
      let done = 0;
      for (const m of matches) {
        if (!m.file || !m.product) return;
        setMessage('جارٍ إضافة الصور: ' + done + ' / 10');
        try {
          const body = new FormData();
          body.set('file', m.file);
          body.set('kind', 'product');
          const response = await fetch('/admin/api/uploads', { method: 'POST', body });
          const json = (await response.json()) as UploadResponse;
          if (!response.ok || !json.success) {
            setMessage('توقف الرفع عند ' + m.name + ': ' + (json.success ? 'فشل الطلب' : json.error) + '. تم حفظ ' + done + ' صور.');
            return;
          }
          const result = await appendReviewedGalleryImage(m.product.id, json.image.secureUrl, json.image.publicId);
          if (!result.ok) {
            setMessage('توقف الربط عند ' + m.name + ': ' + result.message + '. تم حفظ ' + done + ' صور.');
            return;
          }
          done += 1;
        } catch {
          setMessage('فشل الاتصال بعد إضافة ' + done + ' صور. لا تعيد الرفع قبل مراجعة المعارض.');
          return;
        }
      }
      setMessage('تمت إضافة 10 صور بنجاح. راجع صفحات المنتجات.');
      setFiles([]);
      setApproval(false);
    });
  }
  return <section className="adminCard" style={{ padding: 18, marginBottom: 24 }}>
    <h2>إضافة الصور العشر دفعة واحدة</h2>
    <p className="adminMuted">فكّي ضغط ملف الصور الجاهز، ثم اختاري ملفات JPG العشرة معًا. المطابقة تتم بالاسم الكامل للمنتج واسم الملف ولا تستبدل أي صورة أصلية.</p>
    <input aria-label="اختيار صور المنتجات العشرة" type="file" multiple accept="image/jpeg" disabled={pending}
      onChange={event => { setFiles(Array.from(event.target.files ?? [])); setApproval(false); setMessage(''); }} />
    <div style={{ marginTop: 12 }}>
      {matches.map(m => <div key={m.filename} style={{ padding: '5px 0' }}>
        {m.file && m.product ? '✓' : '—'} {m.name} · {m.filename} {m.product ? '' : '(المنتج غير مطابق)'}
      </div>)}
    </div>
    <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
      <input type="checkbox" checked={approval} disabled={pending || !allMatched} onChange={event => setApproval(event.target.checked)} />
      راجعت الصور العشر وقارنتها بالمنتجات الأصلية وأوافق على إضافتها إلى معارض المنتجات.
    </label>
    <button type="button" className="adminBtn adminBtnPrimary" disabled={!approval || !allMatched || pending}
      onClick={submit} style={{ marginTop: 12 }}>
      {pending ? 'جارٍ الرفع…' : 'رفع 10 صور إلى المعارض'}
    </button>
    {message && <p role="status">{message}</p>}
    {!allMatched && files.length > 0 && <p role="alert">لا يمكن المتابعة إلا بعد مطابقة المنتجات العشرة بالضبط.</p>}
  </section>;
}
