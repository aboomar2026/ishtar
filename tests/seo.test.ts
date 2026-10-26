import assert from 'node:assert/strict';
import test from 'node:test';
import { absoluteUrl, buildPageMetadata, catalogPath, categorySeoPath, hasCatalogFacets, isIndexingEnabled, plainDescription, serializeJsonLd } from '../src/lib/seo';
import { breadcrumbData, productData, storeData } from '../src/lib/structured-data';
import { mapProductDetail } from '../src/features/catalog/catalog.mappers';

process.env.NEXT_PUBLIC_SITE_URL = 'https://ishtar.example';

test('canonical paths encode Arabic slugs, strip tracking and retain real pagination', () => {
  assert.equal(catalogPath('product', 'حقيبة أنيقة'), '/product/%D8%AD%D9%82%D9%8A%D8%A8%D8%A9%20%D8%A3%D9%86%D9%8A%D9%82%D8%A9');
  assert.equal(categorySeoPath('all', 1), '/category/all');
  assert.equal(categorySeoPath('all', 2), '/category/all?page=2');
  assert.equal(buildPageMetadata({ title: 'Test', path: '/category/all?page=2' }).alternates?.canonical, 'https://ishtar.example/category/all?page=2');
  assert.equal(absoluteUrl('javascript:alert(1)'), undefined);
});

test('all search, sort, stock and price facets are excluded from indexing', () => {
  for (const key of ['q', 'sort', 'availability', 'minPrice', 'maxPrice']) assert.equal(hasCatalogFacets({ [key]: ['0'] }), true);
  assert.equal(hasCatalogFacets({ page: '2', utm_source: 'newsletter', q: '' }), false);
});

test('preview and missing canonical configuration cannot be indexed', () => {
  const site = new URL('https://ishtar.example');
  for (const CONTEXT of ['deploy-preview', 'branch-deploy', 'dev']) assert.equal(isIndexingEnabled(site, { CONTEXT }), false);
  assert.equal(isIndexingEnabled(site, { SEO_NOINDEX: 'true' }), false);
  assert.equal(isIndexingEnabled(site, { CONTEXT: 'production' }), true);
  const previous = process.env.NEXT_PUBLIC_SITE_URL;
  const previousUrl = process.env.URL;
  delete process.env.NEXT_PUBLIC_SITE_URL; delete process.env.URL;
  assert.equal(isIndexingEnabled(), false);
  process.env.NEXT_PUBLIC_SITE_URL = previous;
  if (previousUrl !== undefined) process.env.URL = previousUrl;
});

test('descriptions have useful fallback; Open Graph and Twitter share the canonical title and image', () => {
  assert.equal(plainDescription(' <b>حقيبة</b>   جميلة '), 'حقيبة جميلة');
  assert.ok(plainDescription(' ').length);
  const metadata = buildPageMetadata({ title: 'حقيبة | عشتار', description: 'وصف حقيبة', path: '/product/bag', image: '/photo.jpg' });
  assert.equal(metadata.openGraph?.url, 'https://ishtar.example/product/bag');
  assert.equal(metadata.twitter?.title, metadata.title);
  assert.equal((metadata.robots as { index: boolean }).index, true);
  assert.equal((buildPageMetadata({ title: 'Empty', path: '/category/empty', noindex: true }).robots as { index: boolean }).index, false);
});

test('JSON-LD serializes hostile CMS text without creating script elements', () => {
  const data = { name: '</script><script>alert("x")</script>&\u2028\u2029' };
  const value = serializeJsonLd(data);
  assert.ok(!value.includes('<') && !value.includes('&'));
  assert.deepEqual(JSON.parse(value), data);
});

test('product markup reports selectable variant prices/stock and omits unverified ratings and policy claims', () => {
  const product = mapProductDetail({ id: 'bag', categoryId: 'bags', slug: 'bag', name: 'حقيبة', subtitle: null,
    description: 'حقيبة يومية', details: [], careInstructions: null, brand: null, basePrice: 999, compareAtPrice: null,
    isFeatured: false, isNewArrival: false, isBestSeller: false, rating: 5, reviewCount: 100, soldCount: 10, viewCount: 0, tags: [],
    images: [{ id: 'photo', url: '/photo.jpg', alt: null, sortOrder: 0, isPrimary: true }],
    variants: [
      { id: 'red', productId: 'bag', sku: 'RED', colorName: 'أحمر', colorValue: null, size: null, price: 25, compareAtPrice: null, quantity: 2, lowStockThreshold: 5, isActive: true },
      { id: 'blue', productId: 'bag', sku: 'BLUE', colorName: 'أزرق', colorValue: null, size: null, price: 10, compareAtPrice: null, quantity: 0, lowStockThreshold: 5, isActive: true },
      { id: 'hidden', productId: 'bag', sku: 'HIDDEN', colorName: null, colorValue: null, size: null, price: 1, compareAtPrice: null, quantity: 100, lowStockThreshold: 5, isActive: false }
    ] });
  const data = productData(product)!;
  assert.equal(data['@type'], 'Product');
  assert.equal(data.offers?.length, 2);
  assert.deepEqual(data.offers?.map((offer) => [offer.price, offer.priceCurrency, offer.availability]), [
    ['25.00', 'ILS', 'https://schema.org/InStock'], ['10.00', 'ILS', 'https://schema.org/OutOfStock']
  ]);
  assert.deepEqual(data.image, ['https://ishtar.example/photo.jpg']);
  assert.ok(!('aggregateRating' in data) && !JSON.stringify(data).includes('shippingDetails'));
  assert.equal(storeData()?.['@graph'][0]['@type'], 'OnlineStore');
  assert.deepEqual(storeData()?.['@graph'][0].sameAs, [
    'https://www.instagram.com/ishtarr_3/',
    'https://www.facebook.com/profile.php?id=61591305881099',
    'https://www.tiktok.com/@ishtarr_3'
  ]);
  assert.equal(breadcrumbData([{ name: 'الرئيسية', path: '/' }])?.itemListElement[0].position, 1);
});
