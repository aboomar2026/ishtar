import assert from 'node:assert/strict';
import test from 'node:test';
import { getCloudinaryTransformedUrl, PRODUCT_CARD_IMAGE, PRODUCT_GALLERY_IMAGE, PRODUCT_THUMB_IMAGE } from '../src/lib/cloudinary-image';

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
