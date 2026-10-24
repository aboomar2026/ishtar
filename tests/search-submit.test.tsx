import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement, forwardRef, type ComponentProps } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

const events: string[] = [];
const moduleId = require.resolve('next/navigation');
require.cache[moduleId] = { id: moduleId, filename: moduleId, loaded: true, exports: { useRouter: () => ({ push: (url: string) => events.push(url) }) } } as NodeModule;
const linkId = require.resolve('next/link');
require.cache[linkId] = { id: linkId, filename: linkId, loaded: true, exports: { __esModule: true, default: forwardRef<HTMLAnchorElement, ComponentProps<'a'>>(function TestLink(props, ref) { return createElement('a', { ...props, ref }); }) } } as NodeModule;
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

test('search submit blurs before navigation; clearing keeps typing available and blank submits do not navigate', async () => {
  const { SearchBar } = await import('../src/components/SearchBar');
  let view!: ReactTestRenderer;
  await act(async () => { view = create(createElement(SearchBar), { createNodeMock: element => element.type === 'input' ? { blur: () => events.push('blur'), focus: () => events.push('focus') } : null }); });
  try {
    const input = () => view.root.findByType('input');
    assert.equal(input().props.type, 'search'); assert.equal(input().props.enterKeyHint, 'search');
    await act(async () => input().props.onChange({ target: { value: '  عطر ورد  ' } }));
    await act(async () => view.root.findByType('form').props.onSubmit({ preventDefault() {} }));
    assert.deepEqual(events, ['blur', `/category/all?q=${encodeURIComponent('عطر ورد')}`]);
    events.length = 0;
    await act(async () => view.root.findByProps({ 'aria-label': 'مسح البحث' }).props.onClick());
    assert.equal(input().props.value, ''); assert.deepEqual(events, ['focus']);
    events.length = 0;
    await act(async () => input().props.onChange({ target: { value: '  ' } }));
    await act(async () => view.root.findByType('form').props.onSubmit({ preventDefault() {} }));
    assert.deepEqual(events, []);
  } finally { await act(async () => view.unmount()); }
});

test('suggestions debounce, cancel stale replies, navigate by keyboard and recover from errors', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  events.length = 0;
  const originalFetch = globalThis.fetch;
  const pending: { resolve: (response: Response) => void; signal: AbortSignal; url: string }[] = [];
  globalThis.fetch = async (url, init) => new Promise(resolve => pending.push({ resolve, signal: init?.signal as AbortSignal, url: String(url) }));
  const { SearchBar } = await import('../src/components/SearchBar');
  let view!: ReactTestRenderer;
  const change = async (value: string) => act(async () => view.root.findByType('input').props.onChange({ target: { value } }));
  const tick = async (ms: number) => act(async () => t.mock.timers.tick(ms));
  const key = async (key: string) => act(async () => view.root.findByType('input').props.onKeyDown({ key, nativeEvent: {}, preventDefault() {} }));
  const product = (name: string) => ({ id: name, name, slug: name, image: '/test.svg', price: 25, available: true });
  try {
    await act(async () => { view = create(createElement(SearchBar), { createNodeMock: element => element.type === 'input' ? { blur: () => events.push('blur'), focus() {} } : { scrollIntoView() {} } }); });
    await change('ع'); await tick(400); assert.equal(pending.length, 0);
    await change('عطر'); await tick(299); assert.equal(pending.length, 0);
    await tick(1); assert.equal(pending.length, 1);
    await change('شنط'); assert.equal(pending[0].signal.aborted, true); await tick(300);
    await act(async () => pending[1].resolve(Response.json({ products: [product('bag'), product('bag-two')] })));
    await act(async () => pending[0].resolve(Response.json({ products: [product('stale')] })));
    assert.equal(view.root.findAll(node => node.type === 'a' && node.props.role === 'option').length, 2);
    assert.equal(view.root.findAllByProps({ href: '/product/stale' }).length, 0);
    await key('ArrowDown'); assert.match(view.root.findByType('input').props['aria-activedescendant'], /-0$/);
    await key('ArrowUp'); assert.match(view.root.findByType('input').props['aria-activedescendant'], /-1$/);
    await key('Escape'); assert.equal(view.root.findByType('input').props['aria-expanded'], false);
    await key('ArrowDown'); await key('Enter');
    assert.deepEqual(events, ['blur', '/product/bag']);
    assert.equal(view.root.findByType('input').props['aria-expanded'], false);
    await change('zz'); await tick(300);
    await act(async () => pending[2].resolve(new Response('', { status: 503 })));
    assert.match(view.root.findByProps({ role: 'status' }).children.join(''), /تعذّر/);
    await change('none'); await tick(300);
    await act(async () => pending[3].resolve(Response.json({ products: [] })));
    assert.match(view.root.findByProps({ role: 'status' }).children.join(''), /لا توجد/);
    await change('next'); await tick(300);
    await act(async () => view.unmount()); assert.equal(pending[4].signal.aborted, true);
  } finally { globalThis.fetch = originalFetch; }
});

test('collection suggestions are distinguished and keyboard navigation opens the collection', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ products: [], collections: [{ id: 'gift', name: 'هدية بمحبة', slug: 'with-love', image: '/mock-products/gift-box.svg' }] });
  events.length = 0;
  const { SearchBar } = await import('../src/components/SearchBar');
  let view!: ReactTestRenderer;
  try {
    await act(async () => { view = create(createElement(SearchBar), { createNodeMock: element => element.type === 'input' ? { blur: () => events.push('blur'), focus() {} } : { scrollIntoView() {} } }); });
    await act(async () => view.root.findByType('input').props.onChange({ target: { value: 'هدية' } }));
    await act(async () => t.mock.timers.tick(300));
    assert.equal(view.root.findByProps({ href: '/collections/with-love' }).props.role, 'option');
    assert.match(view.root.findByType('small').children.join(''), /مجموعة/);
    for (const key of ['ArrowDown', 'Enter']) await act(async () => view.root.findByType('input').props.onKeyDown({ key, nativeEvent: {}, preventDefault() {} }));
    assert.deepEqual(events, ['blur', '/collections/with-love']);
  } finally { if (view) await act(async () => view.unmount()); globalThis.fetch = originalFetch; }
});
