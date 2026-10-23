'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { HERO_LAYOUTS, type HeroLayout, type HeroSettings } from '@/features/hero/hero-config';
import { saveHeroSettingsAction } from '@/features/hero/hero.actions';
import type { CatalogBanner } from '@/features/catalog/catalog.types';
import { HeroView } from '@/components/hero/HeroView';
import type { HeroProduct } from '@/components/hero/HeroVisuals';
import { HeroContentEditor } from './HeroContentEditor';
import { getHeroContent } from '@/features/hero/hero-content';

export function HeroEditor({ initial, banners, products }: { initial: HeroSettings; banners: CatalogBanner[]; products: HeroProduct[] }) {
  const [settings, setSettings] = useState(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [editingLayout, setEditingLayout] = useState<HeroLayout>(initial.layout);
  const content = getHeroContent(settings, editingLayout, banners, products);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('mobile');
  const [replay, setReplay] = useState(0);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const dirty = JSON.stringify(settings) !== saved;
  function patch(value: Partial<HeroSettings>) { setSettings(previous => ({ ...previous, ...value })); setMessage(''); }
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
    <div className="adminCardHeader"><div><h2 id="hero-editor-title">تصميم واجهة المتجر</h2><p className="adminMuted">اختَر تصميماً ثابتاً أو تبديلاً كل دقيقة، وخصّص محتوى كل تصميم ثم احفظ. المعاينة لا تغيّر المتجر قبل الحفظ.</p></div><span className="adminBadge">{dirty ? 'تعديلات غير محفوظة' : 'الإعدادات المحفوظة'}</span></div>
    <fieldset disabled={pending} className="heroControlsFieldset"><legend>طريقة عرض الواجهة</legend><div className="adminField"><label htmlFor="hero-mode">طريقة العرض</label><select id="hero-mode" value={settings.mode} onChange={e => patch({ mode: e.target.value as HeroSettings['mode'] })}><option value="fixed">تصميم ثابت</option><option value="rotate">تبديل التصاميم الثلاثة كل دقيقة</option></select><small>التبديل يبدأ بالتصميم المحدد أدناه ويكرر التصاميم بالترتيب. يتوقف أثناء التفاعل أو إخفاء الصفحة، ويحترم تقليل الحركة.</small></div></fieldset>
    <fieldset className="heroLayoutPicker" disabled={pending}><legend>{settings.mode === 'rotate' ? 'التصميم الأول في الدورة' : 'التصميم الثابت'}</legend>{HERO_LAYOUTS.map(layout => <label className={`heroLayoutChoice ${settings.layout === layout.value ? 'isSelected' : ''}`} key={layout.value}>
      <input type="radio" name="hero-layout" value={layout.value} checked={settings.layout === layout.value} onChange={() => { patch({ layout: layout.value }); setEditingLayout(layout.value); }} />
      <span className={`heroLayoutMini heroLayoutMini--${layout.value}`} aria-hidden="true"><i /><i /><i /></span><strong>{layout.title}</strong><span>{layout.description}</span>
    </label>)}</fieldset>
    <fieldset disabled={pending} className="heroControlsFieldset"><legend>الحركة والعرض</legend><div className="adminFormGrid two">
      <div className="adminField"><label htmlFor="hero-motion">مستوى الحركة</label><select id="hero-motion" value={settings.motion} onChange={e => patch({ motion: e.target.value as HeroSettings['motion'] })}><option value="calm">هادئة — دخول متتابع</option><option value="lively">حيوية — دخول وطفو واضح على الموبايل والكمبيوتر</option><option value="none">بدون مؤثرات إضافية</option></select></div>
      {(settings.layout === 'campaign' || settings.mode === 'rotate' || editingLayout === 'campaign') && <>
        <div className="adminField"><label htmlFor="hero-transition">انتقال الشرائح</label><select id="hero-transition" value={settings.transition} onChange={e => patch({ transition: e.target.value as HeroSettings['transition'] })}><option value="slide">انزلاق مع السحب</option><option value="fade">تلاشي ناعم</option></select></div>
        <div className="adminField"><label className="adminCheck"><input type="checkbox" checked={settings.autoplay} onChange={e => patch({ autoplay: e.target.checked })} />تشغيل شرائح الحملات تلقائياً</label></div>
        {settings.autoplay && <div className="adminField"><label htmlFor="hero-interval">مدة شريحة الحملة بالثواني</label><input id="hero-interval" type="number" min="5" max="12" value={settings.interval} onChange={e => patch({ interval: Number(e.target.value) })} /></div>}
      </>}
    </div></fieldset>
    <fieldset disabled={pending} className="heroControlsFieldset"><legend>محتوى مستقل لكل تصميم</legend>
      <div className="adminField"><label htmlFor="hero-edit-layout">التصميم الذي تريد تعديل محتواه ومعاينته</label><select id="hero-edit-layout" value={editingLayout} onChange={e => setEditingLayout(e.target.value as HeroLayout)}>{HERO_LAYOUTS.map(item => <option key={item.value} value={item.value}>{item.title}</option>)}</select><small>تعديل هذا المحتوى لا يغيّر محتوى التصميمين الآخرين. المحتوى الحالي يُستخدم كبداية حتى تخصّص هذا التصميم.</small></div>
      <HeroContentEditor key={editingLayout} value={content} layout={editingLayout} onChange={value => patch({ profiles: { ...settings.profiles, [editingLayout]: value } })} />
    </fieldset>
    <div className="heroPreviewToolbar"><strong>معاينة التصميم المحدد — غير منشورة</strong><div className="adminBtnRow"><button type="button" className="adminBtn adminBtnSm" aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}>موبايل</button><button type="button" className="adminBtn adminBtnSm" aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}>كمبيوتر</button><button type="button" className="adminBtn adminBtnSm" onClick={() => setReplay(value => value + 1)}>إعادة مشاهدة الحركة ↻</button></div></div>
    <div className="heroPreviewScroll"><div className={`heroPreviewCanvas heroPreviewCanvas--${device}`}><div className="heroPreviewHeader">عشتار <span>معاينة {device === 'mobile' ? 'الموبايل' : 'الكمبيوتر'}</span></div><div onClickCapture={event => { if ((event.target as HTMLElement).closest('a')) event.preventDefault(); }}><HeroView key={`${replay}-${editingLayout}-${settings.motion}-${settings.transition}-${device}`} settings={{ ...settings, layout: editingLayout, profiles: device === 'mobile' ? { ...settings.profiles, [editingLayout]: { ...content, banners: content.banners.map(item => ({ ...item, imageUrl: item.mobileImageUrl || item.imageUrl })) } } : settings.profiles }} banners={banners} products={products} preview /></div><div className="heroPreviewFooter">تسوّقي حسب الستايل · المنتجات تبدأ هنا</div></div></div>
    <div className="adminBtnRow"><button type="button" className="adminBtn adminBtnPrimary" disabled={pending || !dirty} onClick={save}>{pending ? 'جارٍ الحفظ…' : 'حفظ تصميم الواجهة'}</button><button type="button" className="adminBtn adminBtnGhost" disabled={pending || !dirty} onClick={() => { setSettings(JSON.parse(saved)); setMessage(''); }}>إلغاء التغييرات</button></div>
    {message && <p role="status" className="adminAlert">{message}</p>}
  </section>;
}
