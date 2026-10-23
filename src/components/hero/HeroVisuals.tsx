'use client';
import { IconArrowLeft, IconCheck, IconSparkle, IconStar } from '@/components/Icons';
import Link from 'next/link';
import { motion } from 'motion/react';
import { useHeroMotion } from './useHeroMotion';
import { useState } from 'react';
import type { CatalogBanner } from '@/features/catalog/catalog.types';
import { brand } from '@/lib/brand';
import { getCloudinaryTransformedUrl } from '@/lib/cloudinary-image';
import { heroHref, type HeroContent, type HeroSettings } from '@/features/hero/hero-config';

export type HeroProduct = { image: string; name: string; href: string };
export type HeroProps = { settings: HeroSettings; banners: CatalogBanner[]; products: HeroProduct[]; preview?: boolean; content?: HeroContent; catalogProducts?: HeroProduct[] };
export const FALLBACK_BANNER: CatalogBanner = { id: 'default', title: brand.copy.heroTitle, subtitle: brand.copy.heroSubtitle, eyebrow: brand.copy.heroEyebrow, ctaLabel: brand.copy.heroCta, href: '/category/new-in', placement: 'HOME_HERO' };

export function resolveHeroBanner(banner: CatalogBanner, settings: HeroSettings): CatalogBanner {
  if (settings.copySource === 'banners') return banner;
  return { ...banner, title: brand.copy.heroTitle, subtitle: brand.copy.heroSubtitle, eyebrow: brand.copy.heroEyebrow, ctaLabel: brand.copy.heroCta };
}

export function HeroImage({ src, mobile, focus = 'center', priority = false, alt = '', contain = false, thumbnail = false, sizes = '(max-width: 700px) 90vw, 45vw' }: { src?: string; mobile?: string; focus?: string; priority?: boolean; alt?: string; contain?: boolean; thumbnail?: boolean; sizes?: string }) {
  const [failed, setFailed] = useState(false);
  const transform = (url: string, width: number) => getCloudinaryTransformedUrl(url, { width, height: Math.round(width * .9), crop: 'limit' });
  const fallback = '/mock-products/bag-camel.svg';
  const widths = thumbnail ? [96, 192, 320] : [480, 800, 1200];
  return <picture>
    {mobile && !failed && <source media="(max-width: 700px)" srcSet={`${transform(mobile, 480)} 480w, ${transform(mobile, 800)} 800w`} sizes={sizes} />}
    <img src={failed ? fallback : transform(src || fallback, widths[2])} srcSet={failed ? undefined : widths.map(width => `${transform(src || fallback, width)} ${width}w`).join(', ')} sizes={sizes} alt={alt} width="1200" height="1080" loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" onError={() => { if (!failed) setFailed(true); }} style={{ objectPosition: focus, objectFit: contain ? 'contain' : 'cover' }} />
  </picture>;
}

export function HeroCopy({ banner, heading = 'h1', signature = false, content }: { banner: CatalogBanner; heading?: 'h1' | 'h2'; signature?: boolean; content?: HeroContent }) {
  const Heading = heading;
  return <div className="shopHeroCopy">
    <span className="shopHeroEyebrow" data-hero-reveal>{content ? banner.eyebrow : banner.eyebrow || brand.copy.heroEyebrow}</span>
    <Heading data-hero-reveal>{signature ? <>{banner.title.split(' ').slice(0, -1).join(' ')} <span className="shopHeroTitleAccent">{banner.title.split(' ').at(-1)}</span></> : banner.title}</Heading>
    {banner.subtitle && <p data-hero-reveal>{banner.subtitle}</p>}
    <div className="shopHeroActions" data-hero-reveal>
      <Link className="shopHeroButton" href={heroHref(banner.href)}>{banner.ctaLabel || brand.copy.heroCta}<IconArrowLeft size={24} weight="bold" /></Link>
      {(!content || content.secondaryLabel) && <Link className="shopHeroSecondary" href={heroHref(content?.secondaryHref || '/category/all')}>{content?.secondaryLabel ?? brand.copy.heroSecondaryCta}</Link>}
    </div>
    <div className="shopHeroTags" data-hero-reveal>{(content?.trustItems ?? brand.copy.heroTrustItems).filter(Boolean).map(item => <span key={item}><IconCheck size={15} weight="bold" />{item}</span>)}</div>
  </div>;
}

export function HeroScene({ banner, products, settings, active = true, priority = true }: { banner: CatalogBanner; products: HeroProduct[]; settings: HeroSettings; active?: boolean; priority?: boolean }) {
  const { ref, enabled, lively } = useHeroMotion(settings);
  const moving = enabled && active;
  const media = settings.media[banner.id];
  const main = { image: banner.imageUrl || products[0]?.image, name: resolveHeroBanner(banner, settings).title, href: heroHref(banner.href) };
  const extras = products.filter(product => product.image !== main.image).slice(0, 2);
  return <div className="shopHeroScene" ref={ref}>
    <span className="shopHeroSceneStamp"><IconStar size={16} weight="fill" /> ISHTAR EDIT</span>
    <motion.div className="shopHeroHalo" aria-hidden="true" initial={false} animate={moving ? { rotate: [-16, 10, -16], scale: [1, 1.07, 1] } : { rotate: -16, scale: 1 }} transition={moving ? { duration: 12, repeat: Infinity, ease: 'easeInOut' } : { duration: .2 }} />
    <motion.div className="shopHeroMainMotion" initial={false} animate={moving ? { y: [0, lively ? -18 : -8, 0], rotate: [0, lively ? -2 : -1, 0] } : { y: 0, rotate: 0 }} transition={moving ? { duration: lively ? 4.8 : 6.5, repeat: Infinity, ease: 'easeInOut' } : { duration: .2 }}>
    <Link className="shopHeroProduct shopHeroProductMain" href={main.href} data-hero-reveal aria-label={main.name}>
      <HeroImage key={main.image} src={main.image} mobile={media?.mobileImageUrl} focus={media?.focus} priority={priority} />
    </Link>
    </motion.div>
    <span className="shopHeroSceneSpark"><IconSparkle size={42} weight="duotone" /></span>
    {extras.map((product, index) => <motion.div className={`shopHeroFloat shopHeroFloat${index + 1}`} key={product.href} initial={false} animate={moving ? { y: [0, (index ? 1 : -1) * (lively ? 22 : 11), 0], rotate: [0, index ? -3 : 3, 0] } : { y: 0, rotate: 0 }} transition={moving ? { duration: lively ? 4.2 + index : 6 + index, repeat: Infinity, ease: 'easeInOut', delay: index * .35 } : { duration: .2 }}>
      <Link className="shopHeroProduct" href={product.href} aria-label={product.name}>
        <HeroImage key={product.image} src={product.image} alt="" sizes="(max-width: 700px) 30vw, 15vw" />
        <span className="shopHeroProductCaption">{product.name}</span>
      </Link>
    </motion.div>)}
  </div>;
}

export function HeroCampaignSlide({ banner, settings, first, active = first, fallbackImage, content, products = [] }: { banner: CatalogBanner; settings: HeroSettings; first: boolean; active?: boolean; fallbackImage?: string; content?: HeroContent; products?: HeroProduct[] }) {
  const copy = resolveHeroBanner(banner, settings);
  return <div className="shopHeroCampaignSlide">
    <HeroCopy banner={copy} heading={first ? 'h1' : 'h2'} content={content} />
    <div className="shopHeroCampaignArtwork">
      <HeroScene banner={{ ...banner, imageUrl: banner.imageUrl || fallbackImage }} products={products} settings={settings} active={active} priority={first} />
    </div>
  </div>;
}

export function HeroProductRail({ products }: { products: HeroProduct[] }) {
  if (!products.length) return null;
  return <div className="shopHeroProductRail" role="group" aria-label="اكتشفي منتجات عشتار">
    <span className="shopHeroRailLabel"><IconSparkle size={20} /> اختاري تفصيلك</span>
    <div>{products.slice(0, 4).map(product => <Link href={heroHref(product.href)} key={product.href} className="shopHeroRailCard"><span className="shopHeroRailImage"><HeroImage src={product.image} sizes="64px" thumbnail /></span><span>{product.name}</span><IconArrowLeft size={18} /></Link>)}</div>
  </div>;
}
