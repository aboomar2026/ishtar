'use client';
import type { HeroContent, HeroLayout } from '@/features/hero/hero-config';
import { ImageUploadButton } from './ImageUploadButton';

export function HeroContentEditor({ value, layout, onChange }: { value: HeroContent; layout: HeroLayout; onChange: (value: HeroContent) => void }) {
  const banner = (index: number, patch: Partial<HeroContent['banners'][number]>) => onChange({ ...value, banners: value.banners.map((item, i) => i === index ? { ...item, ...patch } : item) });
  const product = (index: number, patch: Partial<HeroContent['products'][number]>) => onChange({ ...value, products: value.products.map((item, i) => i === index ? { ...item, ...patch } : item) });
  function move(index: number, offset: number) {
    const banners = [...value.banners];
    [banners[index], banners[index + offset]] = [banners[index + offset], banners[index]];
    onChange({ ...value, banners });
  }
  return <div>
    {value.banners.map((item, index) => <fieldset className="heroContentFields" key={index}><legend>{layout === 'campaign' ? `الشريحة ${index + 1}` : 'المحتوى الرئيسي'}</legend><div className="adminFormGrid two">
      <div className="adminField"><label htmlFor={`hero-title-${index}`}>العنوان الرئيسي</label><input id={`hero-title-${index}`} value={item.title} maxLength={180} onChange={e => banner(index, { title: e.target.value })} /></div>
      <div className="adminField"><label htmlFor={`hero-eyebrow-${index}`}>النص أعلى العنوان</label><input id={`hero-eyebrow-${index}`} value={item.eyebrow} maxLength={100} onChange={e => banner(index, { eyebrow: e.target.value })} /></div>
      <div className="adminField"><label htmlFor={`hero-description-${index}`}>الوصف</label><textarea id={`hero-description-${index}`} value={item.subtitle} maxLength={600} onChange={e => banner(index, { subtitle: e.target.value })} /></div>
      <div className="adminField"><label htmlFor={`hero-button-${index}`}>نص الزر الرئيسي</label><input id={`hero-button-${index}`} value={item.ctaLabel} maxLength={80} onChange={e => banner(index, { ctaLabel: e.target.value })} /><label htmlFor={`hero-link-${index}`}>رابط الزر والصورة</label><input id={`hero-link-${index}`} dir="ltr" value={item.href} onChange={e => banner(index, { href: e.target.value })} /></div>
      <div className="adminField"><label htmlFor={`hero-image-${index}`}>الصورة الرئيسية</label><input id={`hero-image-${index}`} dir="ltr" value={item.imageUrl} onChange={e => banner(index, { imageUrl: e.target.value })} /><ImageUploadButton kind="banner" label="رفع الصورة الرئيسية" onUploaded={image => banner(index, { imageUrl: image.secureUrl })} /></div>
      <div className="adminField"><label htmlFor={`hero-mobile-${index}`}>صورة الموبايل (اختيارية)</label><input id={`hero-mobile-${index}`} dir="ltr" value={item.mobileImageUrl} onChange={e => banner(index, { mobileImageUrl: e.target.value })} /><ImageUploadButton kind="banner" label="رفع صورة الموبايل" onUploaded={image => banner(index, { mobileImageUrl: image.secureUrl })} /></div>
      <div className="adminField"><label htmlFor={`hero-focus-${index}`}>مكان التركيز في الصورة</label><select id={`hero-focus-${index}`} value={item.focus} onChange={e => banner(index, { focus: e.target.value as typeof item.focus })}><option value="center">المنتصف</option><option value="top">الأعلى</option><option value="bottom">الأسفل</option><option value="right">اليمين</option><option value="left">اليسار</option></select></div>
    </div>{layout === 'campaign' && <div className="adminBtnRow"><button className="adminBtn adminBtnSm" type="button" disabled={index === 0} onClick={() => move(index, -1)}>تقديم الشريحة</button><button className="adminBtn adminBtnSm" type="button" disabled={index === value.banners.length - 1} onClick={() => move(index, 1)}>تأخير الشريحة</button></div>}{layout === 'campaign' && value.banners.length > 1 && <button className="adminBtn adminBtnSm" type="button" onClick={() => onChange({ ...value, banners: value.banners.filter((_, i) => i !== index) })}>حذف هذه الشريحة</button>}</fieldset>)}
    {layout === 'campaign' && value.banners.length < 4 && <button className="adminBtn" type="button" onClick={() => onChange({ ...value, banners: [...value.banners, { ...value.banners[0], title: 'حملة جديدة' }] })}>إضافة شريحة</button>}
    {layout !== 'campaign' && <fieldset className="heroContentFields"><legend>بطاقات الصور العائمة</legend>{value.products.map((item, index) => <div className="adminFormGrid two" key={index}>
      <div className="adminField"><label htmlFor={`hero-card-name-${index}`}>عنوان البطاقة {index + 1}</label><input id={`hero-card-name-${index}`} value={item.name} maxLength={100} onChange={e => product(index, { name: e.target.value })} /><label htmlFor={`hero-card-link-${index}`}>رابط البطاقة</label><input id={`hero-card-link-${index}`} dir="ltr" value={item.href} onChange={e => product(index, { href: e.target.value })} /></div>
      <div className="adminField"><label htmlFor={`hero-card-image-${index}`}>صورة البطاقة</label><input id={`hero-card-image-${index}`} dir="ltr" value={item.image} onChange={e => product(index, { image: e.target.value })} /><ImageUploadButton kind="banner" label="رفع صورة البطاقة" onUploaded={image => product(index, { image: image.secureUrl })} /><button className="adminBtn adminBtnSm" type="button" onClick={() => onChange({ ...value, products: value.products.filter((_, i) => i !== index) })}>حذف البطاقة</button></div>
    </div>)}{value.products.length < 2 && <button className="adminBtn adminBtnSm" type="button" onClick={() => onChange({ ...value, products: [...value.products, { name: 'مختارات عشتار', image: '', href: '/category/all' }] })}>إضافة بطاقة</button>}</fieldset>}
    <fieldset className="heroContentFields"><legend>الزر الإضافي وعبارات الثقة</legend><div className="adminFormGrid two">
      <div className="adminField"><label htmlFor="hero-secondary-label">نص الزر الإضافي (فارغ لإخفائه)</label><input id="hero-secondary-label" value={value.secondaryLabel} maxLength={100} onChange={e => onChange({ ...value, secondaryLabel: e.target.value })} /></div>
      <div className="adminField"><label htmlFor="hero-secondary-link">رابط الزر الإضافي</label><input id="hero-secondary-link" dir="ltr" value={value.secondaryHref} onChange={e => onChange({ ...value, secondaryHref: e.target.value })} /></div>
      {[0, 1, 2].map(index => <div className="adminField" key={index}><label htmlFor={`hero-trust-${index}`}>عبارة الثقة {index + 1}</label><input id={`hero-trust-${index}`} value={value.trustItems[index] || ''} maxLength={100} onChange={e => { const items = [0, 1, 2].map(i => value.trustItems[i] || ''); items[index] = e.target.value; onChange({ ...value, trustItems: items }); }} /></div>)}
    </div></fieldset>
  </div>;
}
