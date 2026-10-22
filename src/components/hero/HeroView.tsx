'use client';
import dynamic from 'next/dynamic';
import { createContext, useContext, useEffect, useRef } from 'react';
import { useAnimate, useReducedMotion } from 'motion/react';
import { FALLBACK_BANNER, resolveHeroBanner, HeroCampaignSlide, HeroCopy, HeroScene, type HeroProps } from './HeroVisuals';

const CampaignContext = createContext<HeroProps | null>(null);
function CampaignFallback() {
  const props = useContext(CampaignContext);
  if (!props) return null;
  return <HeroCampaignSlide banner={props.banners[0] ?? FALLBACK_BANNER} settings={props.settings} first fallbackImage={props.products[0]?.image} />;
}
const HeroCarousel = dynamic(() => import('./HeroCarousel'), { loading: CampaignFallback });

export function HeroView({ settings, banners, products, preview = false }: HeroProps) {
  const [scope, animate] = useAnimate();
  const reduceMotion = useReducedMotion();
  const entered = useRef(false);
  const slides = banners.length ? banners : [FALLBACK_BANNER];
  const banner = slides[0];
  useEffect(() => {
    if (entered.current || reduceMotion !== false || settings.motion === 'none' || settings.layout === 'campaign') return;
    entered.current = true;
    const controls = animate('[data-hero-reveal]', { opacity: [0, 1], y: [14, 0] }, { duration: .48, delay: (index) => Math.min(index * .065, .4), ease: [.22, 1, .36, 1] });
    return () => { controls.complete(); };
  }, [animate, reduceMotion, scope, settings.motion, settings.layout]);
  return <div className="shopHeroHost">
    <section ref={scope} className={`shopHero shopHero--${settings.layout}`} data-motion={settings.motion} aria-label="مختارات عشتار" data-preview={preview || undefined}>
      {settings.layout === 'campaign' ? <CampaignContext.Provider value={{ settings, banners: slides, products }}>
        <HeroCarousel settings={settings} banners={slides} products={products} preview={preview} />
      </CampaignContext.Provider> : <>
        <HeroCopy banner={resolveHeroBanner(banner, settings)} signature={settings.layout === 'signature'} />
        <HeroScene banner={banner} products={products} settings={settings} />
      </>}
    </section>
  </div>;
}
