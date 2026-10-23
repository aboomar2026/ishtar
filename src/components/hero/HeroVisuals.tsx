'use client';
import Link from 'next/link';
import { motion } from 'motion/react';
import { useHeroMotion } from './useHeroMotion';
import { useState, type CSSProperties } from 'react';
import type { CatalogBanner } from '@/features/catalog/catalog.types';
import { brand } from '@/lib/brand';
import { getCloudinaryTransformedUrl } from '@/lib/cloudinary-image';
import { heroHref, type HeroSettings } from '@/features/hero/hero-config';

export type HeroProduct = { image: string; name: string; href: string };
export type HeroProps = { settings: HeroSettings; banners: CatalogBanner[]; products: HeroProduct[]; preview?: boolean };
export const FALLBACK_BANNER: CatalogBanner = { id: 'default', title: brand.copy.heroTitle, subtitle: brand.copy.heroSubtitle, eyebrow: brand.copy.heroEyebrow, ctaLabel: brand.copy.heroCta, href: '/category/new-in', placement: 'HOME_HERO' };

export function resolveHeroBanner(banner: CatalogBanner, settings: HeroSettings): CatalogBanner {
  if (settings.copySource === 'banners') return banner;
  return { ...banner, title: brand.copy.heroTitle, subtitle: brand.copy.heroSubtitle, eyebrow: brand.copy.heroEyebrow, ctaLabel: brand.copy.heroCta };
}

export function HeroImage({ src, mobile, focus = 'center', priority = false, alt = '', contain = false, sizes = '(max-width: 700px) 90vw, 45vw' }: { src?: string; mobile?: string; focus?: string; priority?: boolean; alt?: string; contain?: boolean; sizes?: string }) {
  const [failed, setFailed] = useState(false);
  const transform = (url: string, width: number) => getCloudinaryTransformedUrl(url, { width, height: Math.round(width * .9), crop: 'limit' });
  const fallback = '/mock-products/bag-camel.svg';
  return <picture>
    {mobile && !failed && <source media="(max-width: 700px)" srcSet={`${transform(mobile, 480)} 480w, ${transform(mobile, 800)} 800w`} sizes={sizes} />}
    <img src={failed ? fallback : transform(src || fallback, 1200)} srcSet={failed ? undefined : `${transform(src || fallback, 480)} 480w, ${transform(src || fallback, 800)} 800w, ${transform(src || fallback, 1200)} 1200w`} sizes={sizes} alt={alt} width="1200" height="1080" loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" onError={() => { if (!failed) setFailed(true); }} style={{ objectPosition: focus, objectFit: contain ? 'contain' : 'cover' }} />
  </picture>;
}

export function HeroCopy({ banner, heading = 'h1', signature = false }: { banner: CatalogBanner; heading?: 'h1' | 'h2'; signature?: boolean }) {
  const Heading = heading;
  return <div className="shopHeroCopy">
    <span className="shopHeroEyebrow" data-hero-reveal>{banner.eyebrow || brand.copy.heroEyebrow}</span>
    <Heading data-hero-reveal>{signature ? <>{banner.title.split(' ').slice(0, -1).join(' ')} <span className="shopHeroTitleAccent">{banner.title.split(' ').at(-1)}</span></> : banner.title}</Heading>
    {banner.subtitle && <p data-hero-reveal>{banner.subtitle}</p>}
    <div className="shopHeroActions" data-hero-reveal>
      <Link className="shopHeroButton" href={heroHref(banner.href)}>{banner.ctaLabel || brand.copy.heroCta}<span aria-hidden="true">←</span></Link>
      <Link className="shopHeroSecondary" href="/category/all">{brand.copy.heroSecondaryCta}</Link>
    </div>
    <div className="shopHeroTags" data-hero-reveal>{brand.copy.heroTrustItems.map(item => <span key={item}>{item}</span>)}</div>
  </div>;
}

export function HeroScene({ banner, products, settings }: { banner: CatalogBanner; products: HeroProduct[]; settings: HeroSettings }) {
  const { ref, enabled, lively } = useHeroMotion(settings);
  const media = settings.media[banner.id];
  const main = { image: banner.imageUrl || products[0]?.image, name: resolveHeroBanner(banner, settings).title, href: heroHref(banner.href) };
  const extras = products.filter(product => product.image !== main.image).slice(0, 2);
  return <div className="shopHeroScene" ref={ref}>
    <motion.div className="shopHeroHalo" aria-hidden="true" initial={false} animate={enabled ? { rotate: [-16, 10, -16], scale: [1, 1.07, 1] } : { rotate: -16, scale: 1 }} transition={enabled ? { duration: 12, repeat: Infinity, ease: 'easeInOut' } : { duration: .2 }} />
    <motion.div className="shopHeroMainMotion" initial={false} animate={enabled ? { y: [0, lively ? -12 : -6, 0], rotate: [0, lively ? -2 : -1, 0] } : { y: 0, rotate: 0 }} transition={enabled ? { duration: lively ? 4.8 : 6.5, repeat: Infinity, ease: 'easeInOut' } : { duration: .2 }}>
    <Link className="shopHeroProduct shopHeroProductMain" href={main.href} data-hero-reveal aria-label={main.name}>
      <HeroImage key={main.image} src={main.image} mobile={media?.mobileImageUrl} focus={media?.focus} priority />
    </Link>
    </motion.div>
    {extras.map((product, index) => <motion.div className={`shopHeroFloat shopHeroFloat${index + 1}`} key={product.href} initial={false} animate={enabled ? { y: [0, (index ? 1 : -1) * (lively ? 16 : 9), 0], rotate: [0, index ? -3 : 3, 0] } : { y: 0, rotate: 0 }} transition={enabled ? { duration: lively ? 4.2 + index : 6 + index, repeat: Infinity, ease: 'easeInOut', delay: index * .35 } : { duration: .2 }}>
      <Link className="shopHeroProduct" href={product.href} aria-label={product.name}>
        <HeroImage src={product.image} alt="" sizes="(max-width: 700px) 30vw, 15vw" />
        <span className="shopHeroProductCaption">{product.name}</span>
      </Link>
    </motion.div>)}
  </div>;
}

export function HeroCampaignSlide({ banner, settings, first, active = first, fallbackImage }: { banner: CatalogBanner; settings: HeroSettings; first: boolean; active?: boolean; fallbackImage?: string }) {
  const media = settings.media[banner.id];
  const copy = resolveHeroBanner(banner, settings);
  const { ref, enabled, lively } = useHeroMotion(settings);
  return <div className="shopHeroCampaignSlide" style={{ '--hero-focus': media?.focus || 'center' } as CSSProperties}>
    <HeroCopy banner={copy} heading={first ? 'h1' : 'h2'} />
    <Link className="shopHeroCampaignImage" href={heroHref(banner.href)} aria-label={copy.title}>
      <motion.div ref={ref} className="shopHeroImageMotion" initial={false} animate={enabled && active ? { scale: [1.02, lively ? 1.1 : 1.055], x: [0, lively ? -8 : -3] } : { scale: 1, x: 0 }} transition={enabled && active ? { duration: settings.interval + 1, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' } : { duration: .25 }}>
      <HeroImage key={banner.imageUrl} src={banner.imageUrl || fallbackImage} mobile={media?.mobileImageUrl} focus={media?.focus} priority={first} />
      </motion.div>
    </Link>
  </div>;
}
