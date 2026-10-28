import assert from 'node:assert/strict';
import test from 'node:test';
import { getCloudinaryResponsiveSource, getCloudinaryTransformedUrl, PRODUCT_CARD_IMAGE, PRODUCT_GALLERY_IMAGE, PRODUCT_THUMB_IMAGE } from '../src/lib/cloudinary-image';

const original = 'https://res.cloudinary.com/example/image/upload/v123/products/bag.jpg';

test('fit product cards, galleries and thumbnails never request incompatible gravity', () => {
  for (const options of [PRODUCT_CARD_IMAGE, PRODUCT_GALLERY_IMAGE, PRODUCT_THUMB_IMAGE]) {
    const url = getCloudinaryTransformedUrl(original, { ...options, crop: 'fit' });
    assert.match(url, /c_fit\/v123\/products\/bag.jpg$/);
    assert.doesNotMatch(url, /,g_/);
    assert.match(url, new RegExp(`w_${options.width},h_${options.height}`));
  }
});

test('limit also omits gravity, while fill preserves smart crop and explicit gravity', () => {
  assert.doesNotMatch(getCloudinaryTransformedUrl(original, { crop: 'limit' }), /,g_/);
  assert.match(getCloudinaryTransformedUrl(original), /c_fill,g_auto\//);
  assert.match(getCloudinaryTransformedUrl(original, { crop: 'fill', gravity: 'center' }), /c_fill,g_center\//);
});

test('non-Cloudinary product images and local fallback assets remain unchanged', () => {
  for (const url of ['/mock-products/gift-box.svg', 'https://images.pexels.com/photos/123/image.jpeg', '']) {
    assert.equal(getCloudinaryTransformedUrl(url, { crop: 'fit' }), url);
  }
});

test('responsive variants are bounded, deduplicated, stable and preserve fit safety', () => {
  const options = { ...PRODUCT_CARD_IMAGE, crop: 'fit' as const };
  const source = getCloudinaryResponsiveSource(original, options, [800, 480, 320, 480, 1600, -1], '230px');
  assert.equal(source.sizes, '230px');
  assert.deepEqual(source.srcSet?.split(', ').map(candidate => candidate.split(' ').at(-1)), ['320w', '480w', '800w']);
  assert.match(source.srcSet!, /w_320,h_400,c_fit/);
  assert.doesNotMatch(source.srcSet!, /g_auto|w_1600/);
  assert.equal(source.src, getCloudinaryTransformedUrl(original, options));
  assert.deepEqual(source, getCloudinaryResponsiveSource(original, options, [320, 480, 800], '230px'));
});

test('only HTTPS Cloudinary image uploads are transformed; no bogus external srcset', () => {
  for (const url of ['https://res.cloudinary.com.evil.invalid/image/upload/file.jpg', 'https://example.invalid/res.cloudinary.com/image/upload/file.jpg', '/mock-products/gift-box.svg', 'https://res.cloudinary.com/demo/video/upload/file.mp4']) {
    assert.equal(getCloudinaryTransformedUrl(url), url);
    assert.deepEqual(getCloudinaryResponsiveSource(url, PRODUCT_CARD_IMAGE, [320, 800], '230px'), { src: url });
  }
});
