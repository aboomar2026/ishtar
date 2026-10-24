import { brand } from '@/lib/brand';
import type { CatalogBanner } from '@/features/catalog/catalog.types';
import type { HeroContent, HeroLayout, HeroSettings } from './hero-config';
type Product = { image: string; name: string; href: string };

// Read legacy banner settings until an admin explicitly customizes this template.
export function getHeroContent(settings: HeroSettings, layout: HeroLayout, banners: CatalogBanner[], products: Product[]): HeroContent {
  const saved = settings.profiles[layout];
  if (saved) return saved;
  const source = banners.length ? banners : [{ id: 'default', title: brand.copy.heroTitle }];
  return {
    banners: source.slice(0, layout === 'campaign' ? 4 : 1).map(banner => {
      const value = banner as CatalogBanner;
      return {
        title: settings.copySource === 'banners' ? value.title : brand.copy.heroTitle,
        subtitle: settings.copySource === 'banners' ? value.subtitle || '' : brand.copy.heroSubtitle,
        eyebrow: settings.copySource === 'banners' ? value.eyebrow || brand.copy.heroEyebrow : brand.copy.heroEyebrow,
        ctaLabel: settings.copySource === 'banners' ? value.ctaLabel || brand.copy.heroCta : brand.copy.heroCta,
        href: value.href || '/category/new-in', imageUrl: value.imageUrl || products[0]?.image || '',
        mobileImageUrl: settings.media[value.id]?.mobileImageUrl || '', focus: settings.media[value.id]?.focus || 'center'
      };
    }),
    products: products.filter(product => product.image !== (banners[0]?.imageUrl || products[0]?.image)).slice(0, 2),
    secondaryLabel: brand.copy.heroSecondaryCta, secondaryHref: '/category/all', trustItems: [...brand.copy.heroTrustItems]
  };
}
export function heroPresentation(settings: HeroSettings, layout: HeroLayout, banners: CatalogBanner[], products: Product[]) {
  const content = getHeroContent(settings, layout, banners, products);
  const slides = [...content.banners];
  // A single campaign banner must still become a useful slider when real products exist.
  if (layout === 'campaign' && settings.productSlides) {
    for (const product of products) {
      if (slides.length >= 4) break;
      if (!product.image || !product.href.startsWith('/product/') || slides.some(slide => slide.imageUrl === product.image || slide.href === product.href)) continue;
      slides.push({ title: product.name, subtitle: 'تفاصيل مختارة لتكمّل إطلالتك. اكتشفي المنتج واختاري ما يناسبك.', eyebrow: 'ISHTAR · PRODUCT SPOTLIGHT', ctaLabel: 'اكتشفي المنتج', href: product.href, imageUrl: product.image, mobileImageUrl: '', focus: 'center' });
    }
  }
  const resolvedBanners: CatalogBanner[] = slides.map((banner, index) => ({ ...banner, id: `hero-${layout}-${index}`, placement: 'HOME_HERO' }));
  return {
    content, banners: resolvedBanners, products: content.products,
    settings: { ...settings, layout, copySource: 'banners' as const, media: Object.fromEntries(slides.map((banner, index) => [`hero-${layout}-${index}`, { mobileImageUrl: banner.mobileImageUrl, focus: banner.focus }])) }
  };
}
