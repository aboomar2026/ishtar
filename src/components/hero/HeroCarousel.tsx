'use client';
import { useCallback, useEffect, useState, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Fade from 'embla-carousel-fade';
import { animate, motion, useReducedMotion } from 'motion/react';
import { HeroCampaignSlide, resolveHeroBanner, type HeroProps } from './HeroVisuals';

export default function HeroCarousel({ banners, settings, products }: HeroProps) {
  const reduceMotion = useReducedMotion();
  const [emblaRef, api] = useEmblaCarousel({ direction: 'rtl', loop: banners.length > 1, duration: settings.motion === 'none' || reduceMotion ? 0 : 30 }, settings.transition === 'fade' ? [Fade()] : []);
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(settings.autoplay);
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const select = useCallback(() => { if (api) setSelected(api.selectedScrollSnap()); }, [api]);
  useEffect(() => {
    if (!api) return;
    api.on('select', select).on('reInit', select);
    return () => { api.off('select', select).off('reInit', select); };
  }, [api, select]);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let intersecting = false;
    const sync = () => setVisible(intersecting && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => { intersecting = entry.isIntersecting; sync(); }, { threshold: .25 });
    observer.observe(element);
    document.addEventListener('visibilitychange', sync);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', sync); };
  }, []);
  const advancing = !!api && playing && !hovered && visible && reduceMotion === false && banners.length > 1;
  useEffect(() => {
    if (!advancing || !api) return;
    const timer = setInterval(() => api.scrollNext(), settings.interval * 1000);
    return () => clearInterval(timer);
  }, [api, advancing, settings.interval, selected]);
  useEffect(() => {
    if (!api || reduceMotion !== false || settings.motion === 'none') return;
    const elements = root.current?.querySelectorAll('.shopHeroSlide[aria-hidden="false"] [data-hero-reveal]');
    if (!elements?.length) return;
    const controls = animate(Array.from(elements), { opacity: [.2, 1], y: [24, 0] }, { duration: .65, delay: index => index * .075, ease: [.22, 1, .36, 1] });
    return () => { controls.complete(); };
  }, [api, selected, reduceMotion, settings.motion]);
  const move = (index: number) => { setPlaying(false); api?.scrollTo(index); };
  return <div className="shopHeroCarousel" ref={root} onFocusCapture={event => { if (!(event.target as HTMLElement).closest('[data-rotation-control]')) setPlaying(false); }} onPointerDown={event => { if (!(event.target as HTMLElement).closest('[data-rotation-control]')) setPlaying(false); }} role="group" aria-roledescription="عارض شرائح" aria-label="حملات المتجر">
    {banners.length > 1 && <motion.button data-rotation-control type="button" className="shopHeroRotation" whileTap={reduceMotion ? undefined : { scale: .94 }} onClick={() => setPlaying(value => !value)} disabled={!!reduceMotion} aria-pressed={playing && !reduceMotion} aria-label={playing && !reduceMotion ? 'إيقاف التنقل التلقائي' : 'تشغيل التنقل التلقائي'}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">{playing && !reduceMotion ? <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></> : <path d="M7 4v16l13-8z" />}</svg>
      <span>{playing && !reduceMotion ? 'إيقاف مؤقت' : 'تشغيل تلقائي'}</span>
    </motion.button>}
    <div className="shopHeroViewport" ref={emblaRef} onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true); }} onPointerLeave={() => setHovered(false)}>
      <div className="shopHeroTrack" aria-live={playing ? 'off' : 'polite'}>
        {banners.map((banner, index) => <div className="shopHeroSlide" key={banner.id} inert={index !== selected} aria-hidden={index !== selected} role="group" aria-roledescription="شريحة" aria-label={`${index + 1} من ${banners.length}`}>
          <HeroCampaignSlide banner={banner} settings={settings} first={index === 0} active={index === selected} fallbackImage={products[0]?.image} />
        </div>)}
      </div>
    </div>
    {banners.length > 1 && <div className="shopHeroNavigation">
      {settings.motion !== 'none' && !reduceMotion && <div className="shopHeroProgress" aria-hidden="true"><motion.span key={`${selected}-${advancing}`} initial={{ scaleX: 0 }} animate={{ scaleX: advancing ? 1 : 0 }} transition={{ duration: advancing ? settings.interval : 0, ease: 'linear' }} /></div>}
      <button type="button" className="shopHeroArrow" aria-label="الحملة السابقة" onClick={() => { setPlaying(false); api?.scrollPrev(); }}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="m9 5 7 7-7 7" /></svg></button>
      <div className="shopHeroDots">{banners.map((banner, index) => <button key={banner.id} type="button" aria-label={`عرض الحملة ${index + 1}: ${resolveHeroBanner(banner, settings).title}`} aria-current={index === selected ? 'true' : undefined} onClick={() => move(index)}><span /></button>)}</div>
      <span className="shopHeroCounter"><bdi>{selected + 1} / {banners.length}</bdi></span>
      <button type="button" className="shopHeroArrow" aria-label="الحملة التالية" onClick={() => { setPlaying(false); api?.scrollNext(); }}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="m15 5-7 7 7 7" /></svg></button>
    </div>}
  </div>;
}
