'use client';
import dynamic from 'next/dynamic';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { motion, useAnimate, useReducedMotion } from 'motion/react';
import { FALLBACK_BANNER, resolveHeroBanner, HeroCampaignSlide, HeroCopy, HeroScene, HeroProductRail, type HeroProps } from './HeroVisuals';

import { HeroAtmosphere, HeroBenefits } from './HeroAtmosphere';
import { heroPresentation } from '@/features/hero/hero-content';
import { storefrontHeroSettings } from '@/features/hero/hero-config';
import { useHeroRotation } from './useHeroRotation';

const CampaignContext = createContext<(HeroProps & { content?: ReturnType<typeof heroPresentation>['content'] }) | null>(null);
function CampaignFallback() {
  const props = useContext(CampaignContext);
  if (!props) return null;
  return <HeroCampaignSlide banner={props.banners[0] ?? FALLBACK_BANNER} settings={props.settings} first fallbackImage={props.products[0]?.image} content={props.content} mainProduct={props.mainProduct} products={props.products} />;
}
const HeroCarousel = dynamic(() => import('./HeroCarousel'), { loading: CampaignFallback });

export function HeroView(props: HeroProps) {
  const { preview = false } = props;
  const settings = preview ? props.settings : storefrontHeroSettings(props.settings);
  const body = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [foreground, setForeground] = useState(true);
  const [keyboardFocused, setKeyboardFocused] = useState(false);
  const [height, setHeight] = useState<number>();
  const rotating = !preview;
  const { layout } = useHeroRotation(settings.layout, rotating, !foreground || keyboardFocused || reduced !== false);
  const selected = preview || !rotating ? settings.layout : layout;
  const presentation = heroPresentation(settings, selected, props.banners, props.products);
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
  return <div className="shopHeroSwitcher" onFocusCapture={event => {
    // Touch/mouse focus must not silently freeze the public rotation. Keep a
    // focused keyboard link stable, then resume automatically when focus leaves.
    setKeyboardFocused((event.target as HTMLElement).matches(':focus-visible'));
  }} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setKeyboardFocused(false); }}>
    <motion.div initial={false} animate={rotating && height ? { height } : undefined} transition={{ duration: reduced || settings.motion === 'none' ? 0 : .4 }} style={rotating ? { overflow: 'hidden' } : undefined}>
      <div ref={body}><motion.div key={selected} initial={reduced !== false || settings.motion === 'none' ? false : { opacity: .4 }} animate={{ opacity: 1 }} transition={{ duration: .35 }}><HeroLayoutView {...props} {...presentation} catalogProducts={props.products} /></motion.div></div>
    </motion.div>
  </div>;
}

function HeroLayoutView({ settings, banners, products, content, mainProduct, catalogProducts = [], preview = false }: HeroProps & { content: ReturnType<typeof heroPresentation>['content'] }) {
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
      {settings.layout === 'campaign' ? <CampaignContext.Provider value={{ settings, banners: slides, products, mainProduct, content }}>
        <HeroCarousel settings={settings} banners={slides} products={products} preview={preview} mainProduct={mainProduct} content={content} />
      </CampaignContext.Provider> : <>
        <HeroCopy banner={resolveHeroBanner(banner, settings)} signature={settings.layout === 'signature'} content={content} />
        <HeroScene banner={banner} products={products} mainProduct={mainProduct} settings={settings} />
      </>}
      <HeroProductRail products={catalogProducts} />
      <HeroBenefits />
    </section>
  </div>;
}
