import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
const ids = ['one', 'two'];
const removed: string[][] = [];
function mock(id: string, exports: unknown) { const path = require.resolve(id); require.cache[path] = { id: path, filename: path, loaded: true, exports } as NodeModule; }
mock('../src/components/WishlistProvider', { useWishlist: () => ({ ids: [...ids], loaded: true, persistent: true, remove: (values: string[]) => removed.push(values) }) });
mock('../src/components/ProductGrid', { ProductGrid: ({ products }: { products: { id: string }[] }) => createElement('div', { 'data-testid': 'products' }, products.map(p => p.id).join(',')) });
mock('../src/components/EmptyState', { EmptyState: () => createElement('p', null, 'empty') });
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

test('wishlist page discards stale requests, keeps saved IDs on errors and exposes explicit unavailable cleanup', async () => {
  const listeners = new Map<string, () => void>();
  Object.assign(globalThis, { window: { addEventListener: (name: string, fn: () => void) => listeners.set(name, fn), removeEventListener: (name: string) => listeners.delete(name) },
    document: { hidden: false, addEventListener: (name: string, fn: () => void) => listeners.set(name, fn), removeEventListener: (name: string) => listeners.delete(name) } });
  const originalFetch = globalThis.fetch;
  const pending: { resolve: (response: Response) => void; signal: AbortSignal }[] = [];
  globalThis.fetch = async (_url, init) => new Promise(resolve => pending.push({ resolve, signal: init?.signal as AbortSignal }));
  const { WishlistPageClient } = await import('../src/components/WishlistPageClient');
  let view!: ReactTestRenderer;
  await act(async () => { view = create(createElement(WishlistPageClient)); });
  try {
    ids.splice(0, 1);
    await act(async () => view.update(createElement(WishlistPageClient)));
    assert.equal(pending[0].signal.aborted, true);
    await act(async () => pending[1].resolve(new Response('', { status: 503 })));
    assert.equal(view.root.findAllByProps({ role: 'alert' }).length, 1);
    assert.deepEqual(ids, ['two']); assert.equal(removed.length, 0);
    await act(async () => pending[0].resolve(Response.json({ products: [{ id: 'one' }], unavailableIds: [] })));
    assert.equal(view.root.findAllByProps({ 'data-testid': 'products' }).length, 0);
    const retry = view.root.findAllByType('button').find(button => button.children.includes('إعادة المحاولة'))!;
    await act(async () => retry.props.onClick());
    await act(async () => pending[2].resolve(Response.json({ products: [], unavailableIds: ['two'] })));
    assert.equal(removed.length, 0, 'never silently delete hidden/deleted saved IDs');
    const cleanup = view.root.findAllByType('button').find(button => button.children.includes('إزالة هذه المحفوظات'))!;
    await act(async () => cleanup.props.onClick()); assert.deepEqual(removed, [['two']]);
    await act(async () => listeners.get('focus')?.());
    assert.equal(pending.length, 4);
    await act(async () => view.unmount()); assert.equal(pending[3].signal.aborted, true);
    assert.equal(listeners.size, 0);
  } finally { globalThis.fetch = originalFetch; }
});
