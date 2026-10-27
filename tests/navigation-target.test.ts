import assert from 'node:assert/strict';
import test from 'node:test';
import { pageNavigationTarget } from '../src/lib/navigation-target';

test('only page/query changes on the current origin need navigation feedback', () => {
  const current = 'https://ishtar.example/category/all?q=bag';
  assert.equal(pageNavigationTarget('/product/bag', current), '/product/bag');
  assert.equal(pageNavigationTarget('?q=perfume', current), '/category/all?q=perfume');
  for (const href of ['#details', current, 'https://other.example/product/bag', 'mailto:shop@example.invalid', 'tel:123', 'javascript:void(0)']) assert.equal(pageNavigationTarget(href, current), null);
  assert.equal(pageNavigationTarget('/collections/gifts#products', current), '/collections/gifts#products');
});
