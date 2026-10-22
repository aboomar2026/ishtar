'use client';
import { useState } from 'react';
import { HeroView } from './HeroView';
import type { HeroProps } from './HeroVisuals';
import { HERO_LAYOUTS } from '@/features/hero/hero-config';

export function HeroReview({ settings: initial, banners, products }: HeroProps) {
  const [settings, setSettings] = useState(initial);
  const [width, setWidth] = useState(375);
  const [replay, setReplay] = useState(0);
  return <main className="heroReviewPage" dir="rtl">
    <h1>مراجعة الهيرو</h1><p>معاينة تجريبية على هذه الصفحة فقط؛ لا تحفظ إعدادات ولا تغيّر بيانات المتجر.</p>
    <div className="heroReviewControls">
      <label>القالب<select value={settings.layout} onChange={e => setSettings({ ...settings, layout: e.target.value as typeof settings.layout })}>{HERO_LAYOUTS.map(item => <option value={item.value} key={item.value}>{item.title}</option>)}</select></label>
      <label>العرض<select value={width} onChange={e => setWidth(Number(e.target.value))}>{[320,375,430,768,1024].map(size => <option key={size} value={size}>{size}px</option>)}</select></label>
      <label>الحركة<select value={settings.motion} onChange={e => setSettings({ ...settings, motion: e.target.value as typeof settings.motion })}><option value="calm">هادئة</option><option value="lively">حيوية</option><option value="none">بدون مؤثرات</option></select></label>
      <label>الانتقال<select value={settings.transition} onChange={e => setSettings({ ...settings, transition: e.target.value as typeof settings.transition })}><option value="slide">انزلاق</option><option value="fade">تلاشي</option></select></label>
      <label><input type="checkbox" checked={settings.autoplay} onChange={e => setSettings({ ...settings, autoplay: e.target.checked })} />تلقائي</label>
      <button type="button" onClick={() => setReplay(value => value + 1)}>إعادة الحركة</button>
    </div>
    <div className="heroReviewScroll"><div className="heroReviewCanvas" style={{ width }}><HeroView key={`${settings.layout}-${settings.motion}-${settings.transition}-${settings.autoplay}-${width}-${replay}`} settings={settings} banners={banners} products={products} /><div className="heroPreviewFooter">تسوّقي حسب الستايل · بداية المنتجات</div></div></div>
  </main>;
}
