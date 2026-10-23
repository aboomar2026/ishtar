import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement, Fragment } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { parseWishlist, sanitizeWishlist, WISHLIST_LIMIT } from '../src/features/wishlist/wishlist-storage';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
process.env.NEXT_PUBLIC_STORE_BRAND = 'ishtar';

test('wishlist storage is bounded, deduplicated and rejects corrupted or non-ID data', () => {
  assert.deepEqual(parseWishlist('{broken'), []);
  assert.deepEqual(parseWishlist(JSON.stringify(['one', 'one', '<script>', 2, 'two'])), ['one', 'two']);
  assert.deepEqual(parseWishlist('x'.repeat(12001)), []);
  assert.equal(sanitizeWishlist(Array.from({ length: 80 }, (_, i) => `id-${i}`)).length, WISHLIST_LIMIT);
});

function browser(initial: string | null = null) {
  const values = new Map<string, string>();
  const handlers = new Map<string, (event: { key: string | null; newValue: string | null }) => void>();
  let failRead = false, failWrite = false;
  const storage = { getItem: (key: string) => { if (failRead) throw new Error('read denied'); return values.get(key) ?? null; },
    setItem: (key: string, value: string) => { if (failWrite) throw new Error('quota denied'); values.set(key, value); } };
  const key = 'ishtar:wishlist:v1';
  if (initial) values.set(key, initial);
  Object.assign(globalThis, { window: { localStorage: storage, addEventListener: (name: string, fn: (event: { key: string | null; newValue: string | null }) => void) => handlers.set(name, fn), removeEventListener: (name: string) => handlers.delete(name) } });
  return { values, handlers, key, denyRead: () => { failRead = true; }, denyWrite: () => { failWrite = true; } };
}

test('provider synchronizes views/tabs, reads the newest storage and enforces the cap without eviction', async () => {
  const env = browser('["one"]');
  const { WishlistProvider, useWishlist } = await import('../src/components/WishlistProvider');
  let first!: ReturnType<typeof useWishlist>, second!: ReturnType<typeof useWishlist>;
  function First() { first = useWishlist(); return null; }
  function Second() { second = useWishlist(); return null; }
  let view!: ReactTestRenderer;
  await act(async () => { view = create(createElement(WishlistProvider, null, createElement(Fragment, null, createElement(First), createElement(Second)))); });
  try {
    assert.equal(first.loaded, true); assert.deepEqual(first.ids, ['one']);
    await act(async () => { first.toggle('two'); first.toggle('three'); });
    assert.deepEqual(second.ids, ['three', 'two', 'one']);
    assert.deepEqual(JSON.parse(env.values.get(env.key)!), second.ids);
    env.values.set(env.key, '["external"]');
    await act(async () => first.toggle('local'));
    assert.deepEqual(second.ids, ['local', 'external'], 'do not overwrite an unseen update from another tab');
    await act(async () => env.handlers.get('storage')?.({ key: env.key, newValue: '["other"]' }));
    assert.deepEqual(first.ids, ['other']);
    await act(async () => env.handlers.get('storage')?.({ key: 'another-brand:wishlist:v1', newValue: '[]' }));
    assert.deepEqual(first.ids, ['other']);
    const full = Array.from({ length: WISHLIST_LIMIT }, (_, i) => `full-${i}`);
    env.values.set(env.key, JSON.stringify(full));
    await act(async () => env.handlers.get('storage')?.({ key: env.key, newValue: JSON.stringify(full) }));
    await act(async () => first.toggle('extra'));
    assert.deepEqual(first.ids, full);
    await act(async () => first.remove(['full-0', 'full-1'])); assert.equal(first.ids.length, 48);
    await act(async () => env.handlers.get('storage')?.({ key: null, newValue: null })); assert.deepEqual(first.ids, []);
  } finally { await act(async () => view.unmount()); }
  assert.equal(env.handlers.size, 0);
});

test('denied reads and quota errors preserve multiple in-session saves without claiming persistence', async () => {
  const { WishlistProvider, useWishlist } = await import('../src/components/WishlistProvider');
  for (const mode of ['read', 'write']) {
    const env = browser(); if (mode === 'read') env.denyRead(); else env.denyWrite();
    let state!: ReturnType<typeof useWishlist>;
    function Probe() { state = useWishlist(); return null; }
    let view!: ReactTestRenderer;
    await act(async () => { view = create(createElement(WishlistProvider, null, createElement(Probe))); });
    try {
      await act(async () => state.toggle('one')); await act(async () => state.toggle('two'));
      assert.deepEqual(state.ids, ['two', 'one']); assert.equal(state.persistent, false);
      assert.equal(env.values.size, 0);
      await act(async () => state.toggle('one')); assert.deepEqual(state.ids, ['two']);
    } finally { await act(async () => view.unmount()); }
  }
});
