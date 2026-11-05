import assert from 'node:assert/strict';
import test from 'node:test';
import { ANALYTICS_CONSENT_KEY, analyticsPageTitle, safeAnalyticsUrl, trackCommerce, validMeasurementId } from '../src/lib/analytics';

test('analytics strips order numbers, customer/search query strings and fragments, retaining safe campaign attribution', () => {
  assert.equal(safeAnalyticsUrl('https://www.ishtar.live/order-success?order=PRIVATE&phone=0591234567&utm_source=instagram#address'), 'https://www.ishtar.live/order-success?utm_source=instagram');
  assert.equal(safeAnalyticsUrl('https://www.ishtar.live/category/all?q=customer%40example.com&utm_campaign=0591234567'), 'https://www.ishtar.live/category/all');
  assert.equal(safeAnalyticsUrl('broken url'), '');
  assert.equal(analyticsPageTitle('/track-order'), 'Ishtar | Track order');
  assert.equal(validMeasurementId('G-ABCDE12345'), true);
  assert.equal(validMeasurementId('G-<script>'), false);
});

test('commerce only tracks consenting production visitors and whitelists item data', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const events: unknown[][] = [];
  let consent = 'denied';
  const location = { hostname: 'www.ishtar.live', pathname: '/checkout', href: 'https://www.ishtar.live/checkout?phone=PRIVATE' };
  const mock = { location, localStorage: { getItem: (key: string) => key === ANALYTICS_CONSENT_KEY ? consent : null }, gtag: (...args: unknown[]) => events.push(args) };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: mock });
  try {
    const item = { item_id: 'product-1', item_variant: 'variant-1', price: 20, quantity: 2, customerName: 'PRIVATE' };
    assert.equal(trackCommerce('add_to_cart', [item]), false);
    consent = 'granted';
    assert.equal(trackCommerce('add_to_cart', [item]), true);
    assert.equal(JSON.stringify(events).includes('PRIVATE'), false);
    assert.equal((events[0][2] as { value: number }).value, 40);
    assert.equal(trackCommerce('purchase', [item]), false);
    location.hostname = 'preview.vercel.app';
    assert.equal(trackCommerce('add_to_cart', [item]), false);
    location.hostname = 'www.ishtar.live'; location.pathname = '/admin/orders';
    assert.equal(trackCommerce('add_to_cart', [item]), false);
    assert.equal(events.length, 1);
  } finally {
    if (original) Object.defineProperty(globalThis, 'window', original);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
