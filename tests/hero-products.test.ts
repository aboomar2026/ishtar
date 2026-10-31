import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveHeroProducts, shuffleHeroProducts } from '../src/features/hero/hero-products';
import { parseHeroSettings, heroSettingsSchema, storefrontHeroSettings } from '../src/features/hero/hero-config';
import { heroPresentation } from '../src/features/hero/hero-content';
const products = [1,2,3,4,5].map(id => ({name: `منتج ${id}`, image: `/p-${id}.jpg`, href: `/product/p-${id}`}));
test('random slots vary with the request pool without mutating or duplicating products', () => {
  const shuffled = shuffleHeroProducts(products, () => 0);
  assert.notDeepEqual(shuffled, products);
  assert.deepEqual(new Set(shuffled), new Set(products));
  assert.equal(products[0].href, '/product/p-1');
  assert.notDeepEqual(resolveHeroProducts(shuffled, [null,null,null]), resolveHeroProducts(products, [null,null,null]));
  assert.equal(new Set(resolveHeroProducts(shuffled, [null,null,null])).size, 3);
});
test('any subset of slots stays pinned, including later slots; random slots never take their products', () => {
  for(let mask=0;mask<8;mask++) {
    const slots = products.slice(0,3).map((p,i) => mask & (1<<i) ? p.href : null);
    const selected = resolveHeroProducts([...products].reverse(), slots);
    selected.forEach((product,i) => { if(slots[i]) assert.equal(product?.href,slots[i]); });
    assert.equal(new Set(selected.map(p=>p?.href)).size,3);
  }
  assert.deepEqual(resolveHeroProducts([], [null,null,null]), [undefined,undefined,undefined]);
  const unavailable = resolveHeroProducts(products, ['/product/unavailable',products[0].href,products[0].href]);
  assert.equal(unavailable[1]?.href,products[0].href);
  assert.equal(new Set(unavailable.map(p=>p?.href)).size,3);
  assert.equal(resolveHeroProducts([products[0]], [null,null,products[0].href])[2],products[0]);
});
test('legacy settings start dark; pins replace old fixed artwork across presentations and preserve campaign copy links', () => {
  const legacy = parseHeroSettings({layout:'classic'});
  assert.equal(storefrontHeroSettings(legacy).layout,'signature');
  assert.deepEqual(legacy.productSlots,[null,null,null]);
  const settings = {...legacy,productSlots:[products[3].href,null,products[0].href]};
  for(const layout of ['classic','signature','campaign'] as const) {
    const result=heroPresentation(settings,layout,[],products);
    assert.equal(result.mainProduct,products[3]);
    assert.equal(result.products[1],products[0]);
    assert.equal(result.banners[0].href,'/category/new-in');
  }
  for (const productSlots of [[null],['javascript:alert(1)',null,null],['https://evil.example',null,null]]) {
    assert.equal(heroSettingsSchema.safeParse({productSlots}).success,false);
  }
});
