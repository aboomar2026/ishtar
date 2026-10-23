import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { parseRecentProducts, recordRecentProduct, RECENT_LIMIT } from '../src/features/recent-products/recent-storage';
import { brandStorageKeys } from '../src/lib/brand-storage';
function mock(id: string, exports: unknown) { const path = require.resolve(id); require.cache[path] = { id: path, filename: path, loaded: true, exports } as NodeModule; }
mock('../src/components/ProductGrid', { ProductGrid: ({ products }: { products: { id: string }[] }) => createElement('div', { 'data-testid': 'products' }, products.map(p => p.id).join(',')) });
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
test('recent history rejects malformed records, deduplicates, promotes revisits and caps IDs', () => {
  assert.deepEqual(parseRecentProducts('{'), []);
  assert.deepEqual(parseRecentProducts(JSON.stringify(['one', 'one', { name: 'private' }, 'two', '<bad>'])), ['one', 'two']);
  assert.deepEqual(recordRecentProduct(['one', 'two'], 'two'), ['two', 'one']);
  assert.deepEqual(recordRecentProduct(['one'], '<bad>'), ['one']);
  assert.equal(recordRecentProduct(Array.from({ length: 20 }, (_, n) => `p${n}`), 'new').length, RECENT_LIMIT);
  assert.notEqual(brandStorageKeys.recentProducts, brandStorageKeys.recentOrders);
});
test('recent rail excludes current product, rejects stale responses, clears and survives denied writes', async () => {
  const bus = new EventTarget(); const documentBus = new EventTarget();
  const disk = new Map([[brandStorageKeys.recentProducts, JSON.stringify(['current', 'one', 'two'])]]);
  let deny = false;
  Object.assign(globalThis, { window: { addEventListener: bus.addEventListener.bind(bus), removeEventListener: bus.removeEventListener.bind(bus), dispatchEvent: bus.dispatchEvent.bind(bus), setTimeout, clearTimeout },
    document: { hidden: false, addEventListener: documentBus.addEventListener.bind(documentBus), removeEventListener: documentBus.removeEventListener.bind(documentBus) },
    localStorage: { getItem: (key: string) => disk.get(key) ?? null, setItem: (key: string, value: string) => { if (deny) throw Error('quota'); disk.set(key, value); } } });
  const originalFetch = globalThis.fetch;
  const pending: { resolve: (response: Response) => void; signal: AbortSignal; ids: string[] }[] = [];
  globalThis.fetch = async (_url, init) => new Promise(resolve => pending.push({ resolve, signal: init?.signal as AbortSignal, ids: JSON.parse(init?.body as string).ids }));
  const { RecentlyViewed, RecordProductView } = await import('../src/components/RecentlyViewed');
  let view!: ReactTestRenderer; let tracker!: ReactTestRenderer;
  try {
    await act(async () => { view = create(createElement(RecentlyViewed, { excludeId: 'current' })); });
    assert.deepEqual(pending[0].ids, ['one', 'two']);
    await act(async () => { tracker = create(createElement(RecordProductView, { id: 'three' })); });
    assert.equal(pending[0].signal.aborted, true);
    await act(async () => pending[0].resolve(Response.json({ products: [{ id: 'stale' }] })));
    assert.equal(view.root.findAllByProps({ 'data-testid': 'products' }).length, 0);
    await act(async () => pending[1].resolve(Response.json({ products: [{ id: 'three' }] })));
    assert.deepEqual(view.root.findByProps({ 'data-testid': 'products' }).children, ['three']);
    deny = true;
    await act(async () => tracker.update(createElement(RecordProductView, { id: 'four' })));
    await act(async () => tracker.update(createElement(RecordProductView, { id: 'five' })));
    assert.deepEqual(pending.at(-1)?.ids, ['five', 'four', 'three', 'one', 'two']);
    await act(async () => view.root.findByType('button').props.onClick());
    assert.match(JSON.stringify(view.toJSON()), /تعذّر مسح التخزين/);
  } finally { await act(async () => { view?.unmount(); tracker?.unmount(); }); globalThis.fetch = originalFetch; }
});
