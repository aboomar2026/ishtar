import assert from 'node:assert/strict';
import test from 'node:test';
import { shareProduct } from '../src/lib/share-product';

test('native sharing passes only product title and URL; cancel does not copy', async () => {
  const url = 'https://shop.example/product/a';
  let copied = false;
  assert.equal(await shareProduct('اسم', url, { share: async (data) => { assert.deepEqual(data, { title: 'اسم', url }); } }), 'shared');
  assert.equal(await shareProduct('اسم', url, { share: async () => { throw new DOMException('cancel', 'AbortError'); }, copy: async () => { copied = true; } }), 'cancelled');
  assert.equal(copied, false);
});
test('unavailable or failing native sharing falls back honestly to clipboard/manual copy', async () => {
  let copied = '';
  assert.equal(await shareProduct('اسم', 'https://shop.example/product/a', { share: async () => { throw Error('denied'); }, copy: async (url) => { copied = url; } }), 'copied');
  assert.equal(copied, 'https://shop.example/product/a');
  assert.equal(await shareProduct('اسم', copied, { copy: async () => { throw Error('denied'); } }), 'manual');
  assert.equal(await shareProduct('اسم', copied, {}), 'manual');
});
