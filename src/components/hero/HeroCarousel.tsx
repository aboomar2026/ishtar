'use client';
import { useCallback, useEffect, useState, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Fade from 'embla-carousel-fade';
import { animate, useReducedMotion } from 'motion/react';
import { HeroCampaignSlide, type HeroProps } from './HeroVisuals';

export default function HeroCarousel({ banners, settings, products, preview }: HeroProps) {
  const reduceMotion = useReducedMotion();
  const [emblaRef, api] = useEmblaCarousel({ direction: 'rtl', loop: banners.length > 1, duration: settings.motion === 'none' || reduceMotion ? 0 : 30 }, settings.transition === 'fade' ? [Fade()] : []);
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(settings.autoplay && !preview);
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
  useEffect(() => {
    if (!api || !playing || hovered || !visible || reduceMotion !== false || banners.length < 2) return;
    const timer = setInterval(() => api.scrollNext(), settings.interval * 1000);
    return () => clearInterval(timer);
  }, [api, playing, hovered, visible, reduceMotion, settings.interval, banners.length, selected]);
  useEffect(() => {
    if (!api || reduceMotion !== false || settings.motion === 'none') return;
    const elements = root.current?.querySelectorAll('.shopHeroSlide[aria-hidden="false"] [data-hero-reveal]');
    if (!elements?.length) return;
    const controls = animate(Array.from(elements), { opacity: [.2, 1], y: [8, 0] }, { duration: .38, delay: index => index * .045 });
    return () => { controls.complete(); };
  }, [api, selected, reduceMotion, settings.motion]);
  const move = (index: number) => { setPlaying(false); api?.scrollTo(index); };
  return <div className="shopHeroCarousel" ref={root} onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true); }} onPointerLeave={() => setHovered(false)} onFocusCapture={event => { if (!(event.target as HTMLElement).closest('[data-rotation-control]')) setPlaying(false); }} onPointerDown={event => { if (!(event.target as HTMLElement).closest('[data-rotation-control]')) setPlaying(false); }} role="group" aria-roledescription="عارض شرائح" aria-label="حملات المتجر">
    {banners.length > 1 && settings.autoplay && <button data-rotation-control type="button" className="shopHeroRotation" onClick={() => setPlaying(value => !value)} disabled={!!reduceMotion} aria-label={playing ? 'إيقاف التنقل التلقائي' : 'تشغيل التنقل التلقائي'}>{playing && !reduceMotion ? 'إيقاف مؤقت Ⅱ' : 'تشغيل تلقائي ▷'}</button>}
    <div className="shopHeroViewport" ref={emblaRef}>
      <div className="shopHeroTrack" aria-live={playing ? 'off' : 'polite'}>
        {banners.map((banner, index) => <div className="shopHeroSlide" key={banner.id} inert={index !== selected} aria-hidden={index !== selected} role="group" aria-roledescription="شريحة" aria-label={`${index + 1} من ${banners.length}`}>
          <HeroCampaignSlide banner={banner} settings={settings} first={index === 0} fallbackImage={products[0]?.image} />
        </div>)}
      </div>
    </div>
    {banners.length > 1 && <div className="shopHeroNavigation">
      <button type="button" className="shopHeroArrow" aria-label="الحملة السابقة" onClick={() => { setPlaying(false); api?.scrollPrev(); }}>→</button>
      <div className="shopHeroDots">{banners.map((banner, index) => <button key={banner.id} type="button" aria-label={`عرض الحملة ${index + 1}: ${banner.title}`} aria-current={index === selected ? 'true' : undefined} onClick={() => move(index)}><span /></button>)}</div>
      <span className="shopHeroCounter"><bdi>{selected + 1} / {banners.length}</bdi></span>
      <button type="button" className="shopHeroArrow" aria-label="الحملة التالية" onClick={() => { setPlaying(false); api?.scrollNext(); }}>←</button>
    </div>}
  </div>;
}
