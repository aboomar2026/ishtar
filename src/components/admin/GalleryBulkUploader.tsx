'use client';

import { useState, useTransition } from 'react';
import { appendReviewedGalleryImage } from '@/features/admin/products/gallery-review.actions';
import { validateImageFile, type UploadResponse } from '@/features/admin/uploads/upload-constants';

type Product = { id: string; name: string; slug: string; image: string | null };
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
  const [overrides, setOverrides] = useState<Record<string,string>>({});
  const [confirmed, setConfirmed] = useState<Record<string,boolean>>({});
  const [search, setSearch] = useState<Record<string,string>>({});
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const matches = mappings.map(m => ({
    ...m,
    product: products.find(p => p.id === overrides[m.filename]) ?? products.find(p => p.name.trim() === m.name),
    file: files.find(f => f.name === m.filename)
  }));
  const allMatched = matches.every(m => m.product && m.file && confirmed[m.filename]) && new Set(matches.map(m => m.product?.id)).size === 10 && files.length === 10 &&
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
      setConfirmed({});
    });
  }
  return <section className="adminCard" style={{ padding: 18, marginBottom: 24 }}>
    <h2>إضافة الصور العشر دفعة واحدة</h2>
    <p className="adminMuted">اختاري ملفات JPG العشرة. ابحثي عن المنتج الصحيح عند الحاجة، ثم أكدي مطابقة كل صورة باستخدام الصورة الأصلية ومعرّف المنتج. لن تُستبدل الصور الرئيسية.</p>
    <input aria-label="اختيار صور المنتجات العشرة" type="file" multiple accept="image/jpeg" disabled={pending}
      onChange={event => { setFiles(Array.from(event.target.files ?? [])); setApproval(false); setConfirmed({}); setMessage(''); }} />
    <div style={{ marginTop: 12 }}>
      {matches.map(m => {
        const candidates = products.filter(p => {
          const q = (search[m.filename] ?? '').trim().toLocaleLowerCase();
          return !q || (p.name + ' ' + p.slug).toLocaleLowerCase().includes(q);
        }).slice(0, 35);
        return <div key={m.filename} style={{ padding: 12, marginBottom: 12, border: '1px solid #e4d5d2', borderRadius: 12 }}>
          <strong>{m.file && m.product && confirmed[m.filename] ? '✓' : '○'} {m.name}</strong> · <span dir="ltr">{m.filename}</span>
          <div className="adminMuted">المطابقة تعتمد على معرّف المنتج، وليس نص الاسم. راجع الصورة الأصلية قبل التأكيد.</div>
          <div style={{display:'flex',gap:12,alignItems:'center',marginTop:10,flexWrap:'wrap'}}>
            {m.file && <img src={URL.createObjectURL(m.file)} alt={'الصورة المولدة '+m.name} width={85} height={105} style={{objectFit:'cover',borderRadius:8}} />}
            {m.product?.image ? <img src={m.product.image} alt={'الصورة الأصلية '+m.product.name} width={85} height={105} style={{objectFit:'cover',borderRadius:8}} /> : <span>لم يتم اختيار المنتج</span>}
            <div style={{flex:'1 1 230px'}}>
              <div>المنتج المحدد: <strong>{m.product?.name ?? 'غير محدد'}</strong></div>
              <input type="search" placeholder="ابحث باسم المنتج أو الرابط..." value={search[m.filename] ?? ''} disabled={pending}
                onChange={e=>setSearch(prev=>({...prev,[m.filename]:e.target.value}))} style={{width:'100%',padding:8,marginTop:6}} />
              <select aria-label={'اختيار المنتج لـ '+m.name} value={m.product?.id ?? ''} disabled={pending}
                onChange={e=>{setOverrides(prev=>({...prev,[m.filename]:e.target.value}));setConfirmed(prev=>({...prev,[m.filename]:false}));setApproval(false);}}
                style={{width:'100%',padding:8,marginTop:6}}>
                <option value="">اختر المنتج الصحيح</option>
                {m.product && !candidates.some(p=>p.id===m.product?.id) && <option value={m.product.id}>{m.product.name} (المحدد)</option>}
                {candidates.map(p=><option key={p.id} value={p.id}>{p.name} — {p.slug}</option>)}
              </select>
              {m.product && <a href={'/admin/products/'+m.product.id+'/edit'} target="_blank" rel="noreferrer">فتح المنتج للتحقق</a>}
            </div>
          </div>
          <label style={{display:'flex',alignItems:'center',gap:8,marginTop:10}}>
            <input type="checkbox" checked={!!confirmed[m.filename]} disabled={!m.product || !m.file || pending}
              onChange={e=>{setConfirmed(prev=>({...prev,[m.filename]:e.target.checked}));setApproval(false);}} />
            أؤكد أن الصورة المولدة تخص هذا المنتج تحديدًا
          </label>
        </div>;
      })}
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
    {!allMatched && files.length > 0 && <p role="alert">تأكد من اختيار المنتج الصحيح لكل صورة، دون تكرار نفس المنتج.</p>}
  </section>;
}
