'use client';
import { IconPlay, IconPause, IconArrowLeft, IconSparkle } from '@/components/Icons';
import dynamic from 'next/dynamic';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { motion, useAnimate, useInView, useReducedMotion } from 'motion/react';
import { FALLBACK_BANNER, resolveHeroBanner, HeroCampaignSlide, HeroCopy, HeroScene, HeroProductRail, type HeroProps } from './HeroVisuals';

import { HeroAtmosphere, HeroBenefits } from './HeroAtmosphere';
import { heroPresentation } from '@/features/hero/hero-content';
import { HERO_LAYOUTS } from '@/features/hero/hero-config';
import { useHeroRotation } from './useHeroRotation';

const CampaignContext = createContext<(HeroProps & { content?: ReturnType<typeof heroPresentation>['content'] }) | null>(null);
function CampaignFallback() {
  const props = useContext(CampaignContext);
  if (!props) return null;
  return <HeroCampaignSlide banner={props.banners[0] ?? FALLBACK_BANNER} settings={props.settings} first fallbackImage={props.products[0]?.image} content={props.content} products={props.products} />;
}
const HeroCarousel = dynamic(() => import('./HeroCarousel'), { loading: CampaignFallback });

export function HeroView(props: HeroProps) {
  const { settings, preview = false } = props;
  const root = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const inView = useInView(root, { amount: .15 });
  const reduced = useReducedMotion();
  const [foreground, setForeground] = useState(true);
  const [effects, setEffects] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [height, setHeight] = useState<number>();
  const rotating = settings.mode === 'rotate' && !preview;
  const { layout, next } = useHeroRotation(settings.layout, rotating, !playing || !inView || !foreground || hovered || focused || reduced !== false);
  const selected = preview || !rotating ? settings.layout : layout;
  const presentation = heroPresentation({ ...settings, motion: effects ? settings.motion : 'none' }, selected, props.banners, props.products);
  useEffect(() => {
    const sync = () => setForeground(!document.hidden);
    sync(); document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);
  useEffect(() => {
    if (!rotating || !body.current) return;
    const observer = new ResizeObserver(() => setHeight(Math.ceil(body.current?.getBoundingClientRect().height || 0)));
    observer.observe(body.current);
    return () => observer.disconnect();
  }, [rotating, selected]);
  return <div ref={root} className="shopHeroSwitcher" onFocusCapture={event => {
    const contentFocused = !(event.target as HTMLElement).closest('[data-template-control]');
    setFocused(contentFocused);
    // Leaving content must not restart rotation unexpectedly for keyboard users.
    if (contentFocused) setPlaying(false);
  }} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}>
    <motion.div initial={false} animate={rotating && height ? { height } : undefined} transition={{ duration: reduced || !effects || settings.motion === 'none' ? 0 : .4 }} style={rotating ? { overflow: 'hidden' } : undefined}>
      <div ref={body} onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true); }} onPointerLeave={() => setHovered(false)}><motion.div key={selected} initial={reduced !== false || !effects || settings.motion === 'none' ? false : { opacity: .4 }} animate={{ opacity: 1 }} transition={{ duration: .35 }}><HeroLayoutView {...props} {...presentation} catalogProducts={props.products} /></motion.div></div>
    </motion.div>
    {(rotating || settings.motion !== 'none') && <div className="shopHeroTemplateControls" role="group" aria-label="تبديل تصميم الواجهة">
      {rotating && <><span>{HERO_LAYOUTS.find(item => item.value === selected)?.title}</span>
      <button data-template-control type="button" onClick={() => setPlaying(value => !value)} disabled={!!reduced} aria-pressed={playing && !reduced}>{playing && !reduced ? <IconPause size={18} weight="fill" /> : <IconPlay size={18} weight="fill" />}{playing && !reduced ? 'إيقاف تبديل التصميم' : 'تشغيل تبديل التصميم'}</button>
      <button data-template-control type="button" onClick={next}>التصميم التالي <IconArrowLeft size={20} /></button>
      </>}
      {settings.motion !== 'none' && !reduced && <button data-template-control type="button" aria-pressed={!effects} onClick={() => setEffects(value => !value)}><IconSparkle size={18} />{effects ? 'إيقاف المؤثرات' : 'تشغيل المؤثرات'}</button>}
      {rotating && <small>{reduced ? 'التبديل التلقائي متوقف حسب تفضيل تقليل الحركة' : !playing ? 'التبديل التلقائي متوقف مؤقتاً' : focused || hovered ? 'التبديل متوقف أثناء التفاعل مع الواجهة' : 'يتغير التصميم كل دقيقة أثناء المشاهدة'}</small>}
    </div>}
  </div>;
}

function HeroLayoutView({ settings, banners, products, content, catalogProducts = [], preview = false }: HeroProps & { content: ReturnType<typeof heroPresentation>['content'] }) {
  const [scope, animate] = useAnimate();
  const reduceMotion = useReducedMotion();
  const entered = useRef(false);
  const slides = banners.length ? banners : [FALLBACK_BANNER];
  const banner = slides[0];
  useEffect(() => {
    if (entered.current || reduceMotion !== false || settings.motion === 'none' || settings.layout === 'campaign') return;
    entered.current = true;
    const controls = animate('[data-hero-reveal]', { opacity: [0, 1], y: [26, 0] }, { duration: .7, delay: (index) => Math.min(index * .09, .5), ease: [.22, 1, .36, 1] });
    return () => { controls.complete(); };
  }, [animate, reduceMotion, scope, settings.motion, settings.layout]);
  return <div className="shopHeroHost">
    <section ref={scope} className={`shopHero shopHero--${settings.layout}`} data-motion={settings.motion} aria-label="مختارات عشتار" data-preview={preview || undefined}>
      <HeroAtmosphere settings={settings} />
      {settings.layout === 'campaign' ? <CampaignContext.Provider value={{ settings, banners: slides, products, content }}>
        <HeroCarousel settings={settings} banners={slides} products={products} preview={preview} content={content} />
      </CampaignContext.Provider> : <>
        <HeroCopy banner={resolveHeroBanner(banner, settings)} signature={settings.layout === 'signature'} content={content} />
        <HeroScene banner={banner} products={products} settings={settings} />
      </>}
      <HeroProductRail products={catalogProducts} />
      <HeroBenefits />
    </section>
  </div>;
}
