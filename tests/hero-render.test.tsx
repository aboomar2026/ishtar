import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import test from 'node:test';
import { HeroView } from '../src/components/hero/HeroView';
import HeroCarousel from '../src/components/hero/HeroCarousel';
import { DEFAULT_HERO_SETTINGS } from '../src/features/hero/hero-config';
import { HeroImage } from '../src/components/hero/HeroVisuals';
import type { CatalogBanner } from '../src/features/catalog/catalog.types';

const banners: CatalogBanner[] = [1, 2].map(id => ({ id: String(id), placement: 'HOME_HERO', title: `حملة ${id}`, subtitle: 'وصف من الأدمن', href: `/category/campaign-${id}`, ctaLabel: 'تسوقي الحملة', imageUrl: `/mock-products/bag-camel.svg` }));
test('static heroes render admin copy, usable links and one page heading before hydration', () => {
  for (const layout of ['classic', 'signature'] as const) {
    const html = renderToStaticMarkup(createElement(HeroView, { settings: { ...DEFAULT_HERO_SETTINGS, layout }, banners, products: [] }));
    assert.match(html, /حملة 1/);
    assert.match(html, /وصف من الأدمن/);
    assert.match(html, /href="\/category\/campaign-1"/);
    assert.equal((html.match(/<h1/g) ?? []).length, 1);
    assert.doesNotMatch(html, /حملة 2/);
  }
});
test('carousel renders first campaign on the server and keeps hidden campaigns out of tab order', () => {
  const html = renderToStaticMarkup(createElement(HeroCarousel, { settings: { ...DEFAULT_HERO_SETTINGS, layout: 'campaign' }, banners, products: [] }));
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
