import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';
import { HeroView } from '../src/components/hero/HeroView';
import HeroCarousel from '../src/components/hero/HeroCarousel';
import { getHeroContent, heroPresentation } from '../src/features/hero/hero-content';
import { DEFAULT_HERO_SETTINGS } from '../src/features/hero/hero-config';
import { HeroImage, resolveHeroBanner } from '../src/components/hero/HeroVisuals';
import type { CatalogBanner } from '../src/features/catalog/catalog.types';

const banners: CatalogBanner[] = [1, 2].map(id => ({ id: String(id), placement: 'HOME_HERO', title: `حملة ${id}`, subtitle: 'وصف من الأدمن', href: `/category/campaign-${id}`, ctaLabel: 'تسوقي الحملة', imageUrl: `/mock-products/bag-camel.svg` }));
test('static heroes render admin copy, usable links and one page heading before hydration', () => {
  for (const layout of ['classic', 'signature'] as const) {
    const html = renderToStaticMarkup(createElement(HeroView, { settings: { ...DEFAULT_HERO_SETTINGS, layout, copySource: 'banners' }, banners, products: [], preview: true }));
    assert.match(html, /حملة 1/);
    assert.match(html, /وصف من الأدمن/);
    assert.match(html, /href="\/category\/campaign-1"/);
    assert.equal((html.match(/<h1/g) ?? []).length, 1);
    assert.doesNotMatch(html, /حملة 2/);
  }
});
test('carousel renders first campaign on the server and keeps hidden campaigns out of tab order', () => {
  const html = renderToStaticMarkup(createElement(HeroCarousel, { settings: { ...DEFAULT_HERO_SETTINGS, layout: 'campaign' }, banners, products: [], preview: true }));
  assert.equal((html.match(/<h1/g) ?? []).length, 1);
  assert.match(html, /inert="" aria-hidden="true"/);
  assert.match(html, /الحملة التالية/);
  const single = renderToStaticMarkup(createElement(HeroCarousel, { settings: DEFAULT_HERO_SETTINGS, banners: [banners[0]], products: [] }));
  assert.doesNotMatch(single, /الحملة التالية|تشغيل تلقائي/);
});
test('mobile art direction and first-image priority are rendered before JavaScript', () => {
  const html = renderToStaticMarkup(createElement(HeroImage, { src: banners[0].imageUrl, mobile: '/mobile.webp', priority: true, focus: 'top' }));
  assert.match(html, /media="\(max-width: 700px\)" srcSet="\/mobile.webp 480w, \/mobile.webp 800w"/);
  assert.match(html, /fetchPriority="high"/);
  assert.match(html, /object-position:top/);
});

test('existing legacy banner copy stays hidden until admin explicitly selects banner copy', () => {
  const legacy = { ...banners[0], title: 'Legacy store title' };
  assert.notEqual(resolveHeroBanner(legacy, DEFAULT_HERO_SETTINGS).title, legacy.title);
  assert.equal(resolveHeroBanner(legacy, { ...DEFAULT_HERO_SETTINGS, copySource: 'banners' }).title, legacy.title);
  assert.equal(resolveHeroBanner(legacy, DEFAULT_HERO_SETTINGS).imageUrl, legacy.imageUrl);
});

test('carousel exposes a working play control even when autoplay initially starts off', () => {
  const html = renderToStaticMarkup(createElement(HeroCarousel, { settings: { ...DEFAULT_HERO_SETTINGS, autoplay: false }, banners, products: [], preview: true }));
  assert.match(html, /aria-label="تشغيل التنقل التلقائي"/);
  assert.match(html, /aria-pressed="false"/);
  assert.match(html, /shopHeroProgress/);
});

test('stored template content replaces legacy copy, images, links and trust items independently', () => {
  const content = getHeroContent(DEFAULT_HERO_SETTINGS, 'signature', banners, []);
  const signature = { ...content, banners: [{ ...content.banners[0], title: 'عنوان مستقل', subtitle: 'وصف مستقل', imageUrl: '/signature.jpg', mobileImageUrl: '/signature-mobile.jpg', href: '/category/gifts' }], secondaryLabel: 'رابط مستقل', secondaryHref: '/category/all', trustItems: ['عبارة مستقلة'] };
  const settings = { ...DEFAULT_HERO_SETTINGS, layout: 'signature' as const, profiles: { signature } };
  const html = renderToStaticMarkup(createElement(HeroView, { settings, banners, products: [], preview: true }));
  assert.match(html, /عنوان مستقل/);
  assert.match(html, /وصف مستقل/);
  assert.match(html, /signature-mobile.jpg/);
  assert.match(html, /href="\/category\/gifts"/);
  assert.match(html, /عبارة مستقلة/);
  assert.match(html, /رابط مستقل/);
  const classic = renderToStaticMarkup(createElement(HeroView, { settings: { ...settings, layout: 'classic' }, banners, products: [], preview: true }));
  assert.doesNotMatch(classic, /عنوان مستقل|signature-mobile.jpg|عبارة مستقلة/);
});

test('a single banner produces real product slides with navigation and independent product links', () => {
  const products = [1, 2, 3, 4].map(id => ({ name: `منتج ${id}`, image: `/product-${id}.jpg`, href: `/product/product-${id}` }));
  const presentation = heroPresentation(DEFAULT_HERO_SETTINGS, 'campaign', [banners[0]], products);
  assert.equal(presentation.banners.length, 4);
  assert.equal(presentation.banners[0].title, getHeroContent(DEFAULT_HERO_SETTINGS, 'campaign', [banners[0]], products).banners[0].title);
  assert.deepEqual(presentation.banners.slice(1).map(banner => banner.href), products.slice(0, 3).map(product => product.href));
  const html = renderToStaticMarkup(createElement(HeroCarousel, { ...presentation, products }));
  assert.match(html, /الحملة التالية/);
  assert.match(html, /إيقاف التنقل التلقائي/);
  assert.match(html, /href="\/product\/product-1"/);
  assert.equal((html.match(/<h1/g) ?? []).length, 1);
  const disabled = heroPresentation({ ...DEFAULT_HERO_SETTINGS, productSlides: false }, 'campaign', [banners[0]], products);
  assert.equal(disabled.banners.length, 1);
  const duplicates = heroPresentation(DEFAULT_HERO_SETTINGS, 'campaign', [banners[0]], [products[0], products[0]]);
  assert.equal(duplicates.banners.length, 2);
});

test('hero atmosphere is decorative and product discovery links exist without hydration', () => {
  const products = [1, 2].map(id => ({ name: `منتج ${id}`, image: `/product-${id}.jpg`, href: `/product/product-${id}` }));
  const html = renderToStaticMarkup(createElement(HeroView, { settings: DEFAULT_HERO_SETTINGS, banners, products }));
  assert.match(html, /shopHeroAtmosphere[^>]*aria-hidden="true"/);
  assert.match(html, /ACCESSORIES/);
  assert.match(html, /href="\/product\/product-2"/);
  assert.match(html, /الدفع عند الاستلام/);
  assert.doesNotMatch(html.replace(/<[^>]*>/g, ''), /توصيل مجاني|5\.0|عملاء سعداء/);
});

test('server-rendered hero starts dark and links each pinned image to its matching product', () => {
  const products = [1, 2, 3, 4].map(id => ({ name: `منتج ${id}`, image: `/product-${id}.jpg`, href: `/product/product-${id}` }));
  const settings = { ...DEFAULT_HERO_SETTINGS, layout: 'classic' as const, productSlots: [products[3].href, null, products[0].href] };
  const html = renderToStaticMarkup(createElement(HeroView, { settings, banners, products }));
  assert.match(html, /shopHero--signature/);
  const main = html.match(/<a[^>]*shopHeroProductMain[^>]*>[\s\S]*?<\/a>/)?.[0];
  assert.ok(main);
  assert.match(main, /href="\/product\/product-4"/);
  assert.match(main, /src="\/product-4.jpg"/);
  const third = html.match(/shopHeroFloat2[\s\S]*?<\/a>/)?.[0];
  assert.ok(third);
  assert.match(third, /href="\/product\/product-1"/);
});
