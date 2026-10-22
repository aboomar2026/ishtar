'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { HERO_LAYOUTS, type HeroSettings } from '@/features/hero/hero-config';
import { saveHeroSettingsAction } from '@/features/hero/hero.actions';
import type { CatalogBanner } from '@/features/catalog/catalog.types';
import { HeroView } from '@/components/hero/HeroView';
import type { HeroProduct } from '@/components/hero/HeroVisuals';
import { ImageUploadButton } from './ImageUploadButton';

export function HeroEditor({ initial, banners, products }: { initial: HeroSettings; banners: CatalogBanner[]; products: HeroProduct[] }) {
  const [settings, setSettings] = useState(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [device, setDevice] = useState<'desktop' | 'mobile'>('mobile');
  const [replay, setReplay] = useState(0);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const dirty = JSON.stringify(settings) !== saved;
  function patch(value: Partial<HeroSettings>) { setSettings(previous => ({ ...previous, ...value })); setMessage(''); }
  function media(id: string, value: Partial<HeroSettings['media'][string]>) {
    patch({ media: { ...settings.media, [id]: { ...(settings.media[id] ?? { mobileImageUrl: '', focus: 'center' }), ...value } } });
  }
  function save() {
    const snapshot = settings;
    startTransition(async () => {
      try {
        const result = await saveHeroSettingsAction(snapshot);
        setMessage(result.message);
        if (result.ok) { setSaved(JSON.stringify(snapshot)); router.refresh(); }
      } catch { setMessage('تعذر الحفظ. تعديلاتك موجودة هنا؛ حاول مجدداً.'); }
    });
  }
  return <section className="adminCard heroEditor" aria-labelledby="hero-editor-title">
    <div className="adminCardHeader"><div><h2 id="hero-editor-title">تصميم واجهة المتجر</h2><p className="adminMuted">اختَر قالباً، جرّب الحركة، ثم احفظ. المعاينة لا تغيّر المتجر قبل الحفظ.</p></div><span className="adminBadge">{dirty ? 'تعديلات غير محفوظة' : 'الإعدادات المحفوظة'}</span></div>
    <fieldset className="heroLayoutPicker" disabled={pending}><legend>قالب الواجهة</legend>{HERO_LAYOUTS.map(layout => <label className={`heroLayoutChoice ${settings.layout === layout.value ? 'isSelected' : ''}`} key={layout.value}>
      <input type="radio" name="hero-layout" value={layout.value} checked={settings.layout === layout.value} onChange={() => patch({ layout: layout.value })} />
      <span className={`heroLayoutMini heroLayoutMini--${layout.value}`} aria-hidden="true"><i /><i /><i /></span><strong>{layout.title}</strong><span>{layout.description}</span>
    </label>)}</fieldset>
    <fieldset disabled={pending} className="heroControlsFieldset"><legend>الحركة والعرض</legend><div className="adminFormGrid two">
      <div className="adminField"><label htmlFor="hero-motion">مستوى الحركة</label><select id="hero-motion" value={settings.motion} onChange={e => patch({ motion: e.target.value as HeroSettings['motion'] })}><option value="calm">هادئة — دخول متتابع</option><option value="lively">حيوية — دخول وطفو خفيف على الكمبيوتر</option><option value="none">بدون مؤثرات إضافية</option></select></div>
      {settings.layout === 'campaign' && <>
        <div className="adminField"><label htmlFor="hero-transition">انتقال الشرائح</label><select id="hero-transition" value={settings.transition} onChange={e => patch({ transition: e.target.value as HeroSettings['transition'] })}><option value="slide">انزلاق مع السحب</option><option value="fade">تلاشي ناعم</option></select></div>
        <div className="adminField"><label className="adminCheck"><input type="checkbox" checked={settings.autoplay} onChange={e => patch({ autoplay: e.target.checked })} />تشغيل تلقائي</label></div>
        {settings.autoplay && <div className="adminField"><label htmlFor="hero-interval">مدة الشريحة بالثواني</label><input id="hero-interval" type="number" min="5" max="12" value={settings.interval} onChange={e => patch({ interval: Number(e.target.value) })} /></div>}
      </>}
    </div></fieldset>
    <p className="adminMuted">المحتوى والصور الرئيسية من بنرات «الصفحة الرئيسية - الواجهة» النشطة ضمن موعدها، حسب ترتيب العرض. القالبان الثابتان يستخدمان الأول؛ السلايدر يعرض أول أربعة. أضف البنرات أو عدّلها أسفل هذه الصفحة.</p>
    {!banners.length && <p className="adminAlert isInfo">لا توجد بنرات واجهة نشطة الآن. سيظهر نص عشتار الافتراضي مع صور المنتجات. أضف بنر واجهة لتخصيص النص والصورة.</p>}
    {banners.map(banner => <details className="heroMediaDetails" key={banner.id}><summary>صورة الموبايل ونقطة التركيز — {banner.title}</summary><div className="adminFormGrid two">
      <div className="adminField"><label htmlFor={`hero-mobile-${banner.id}`}>صورة الموبايل (اختيارية)</label><input id={`hero-mobile-${banner.id}`} type="text" value={settings.media[banner.id]?.mobileImageUrl || ''} placeholder="https://…" onChange={e => media(banner.id, { mobileImageUrl: e.target.value })} /><ImageUploadButton kind="banner" label="رفع صورة الموبايل" onUploaded={image => media(banner.id, { mobileImageUrl: image.secureUrl })} /><small>صورة عمودية أو مربعة بدون كتابة مدمجة. اتركه فارغاً لاستخدام الصورة الرئيسية.</small></div>
      <div className="adminField"><label htmlFor={`hero-focus-${banner.id}`}>مكان التركيز في الصورة</label><select id={`hero-focus-${banner.id}`} value={settings.media[banner.id]?.focus || 'center'} onChange={e => media(banner.id, { focus: e.target.value as HeroSettings['media'][string]['focus'] })}><option value="center">المنتصف</option><option value="top">الأعلى</option><option value="bottom">الأسفل</option><option value="right">اليمين</option><option value="left">اليسار</option></select></div>
    </div></details>)}
    <div className="heroPreviewToolbar"><strong>معاينة غير منشورة</strong><div className="adminBtnRow"><button type="button" className="adminBtn adminBtnSm" aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}>موبايل</button><button type="button" className="adminBtn adminBtnSm" aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}>كمبيوتر</button><button type="button" className="adminBtn adminBtnSm" onClick={() => setReplay(value => value + 1)}>إعادة مشاهدة الحركة ↻</button></div></div>
    <div className="heroPreviewScroll"><div className={`heroPreviewCanvas heroPreviewCanvas--${device}`}><div className="heroPreviewHeader">عشتار <span>معاينة {device === 'mobile' ? 'الموبايل' : 'الكمبيوتر'}</span></div><div onClickCapture={event => { if ((event.target as HTMLElement).closest('a')) event.preventDefault(); }}><HeroView key={`${replay}-${settings.layout}-${settings.motion}-${settings.transition}-${device}`} settings={settings} banners={banners.map(banner => device === 'mobile' && settings.media[banner.id]?.mobileImageUrl ? { ...banner, imageUrl: settings.media[banner.id].mobileImageUrl } : banner)} products={products} preview /></div><div className="heroPreviewFooter">تسوّقي حسب الستايل · المنتجات تبدأ هنا</div></div></div>
    <div className="adminBtnRow"><button type="button" className="adminBtn adminBtnPrimary" disabled={pending || !dirty} onClick={save}>{pending ? 'جارٍ الحفظ…' : 'حفظ تصميم الواجهة'}</button><button type="button" className="adminBtn adminBtnGhost" disabled={pending || !dirty} onClick={() => { setSettings(JSON.parse(saved)); setMessage(''); }}>إلغاء التغييرات</button></div>
    {message && <p role="status" className="adminAlert">{message}</p>}
  </section>;
}
