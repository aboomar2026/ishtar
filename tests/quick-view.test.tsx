import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement, forwardRef, type ComponentProps } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import type { Product, CartLine } from '../src/lib/types';
function mock(id: string, exports: unknown) { const path = require.resolve(id); require.cache[path] = { id: path, filename: path, loaded: true, exports } as NodeModule; }
mock('next/link', { __esModule: true, default: forwardRef<HTMLAnchorElement, ComponentProps<'a'>>(function TestLink(props, ref) { return createElement('a', { ...props, ref }); }) });
mock('../src/components/WishlistButton', { WishlistButton: () => null });
let accepted = true;
const additions: CartLine[] = [];
mock('../src/components/CartProvider', { useCart: () => ({ isCartLoaded: true, addToCart: (line: CartLine) => { additions.push(line); return accepted; } }) });
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const variant = (id: string, color: string, size: string | undefined, price: number, quantity: number) => ({ id, productId: 'p', sku: id, colorName: color, colorValue: color, size, price, quantity, lowStockThreshold: 1, isActive: true });
const product: Product = { id: 'p', slug: 'product', categoryId: 'c', name: 'منتج حديث', description: '', details: [], basePrice: 20, price: 20, currency: '₪', reviewCount: 0, soldCount: 0, viewCount: 0, tags: [], isFeatured: false, isNewArrival: false, isBestSeller: false, images: [], image: '/mock-products/gift-box.svg', totalStock: 6, stockState: 'in-stock', isOutOfStock: false, variants: [variant('red-m', 'red', 'M', 20, 2), variant('red-l', 'red', 'L', 25, 0), variant('blue-default', 'blue', undefined, 35, 3), variant('blue-l', 'blue', 'L', 40, 1)] };

test('shared product controls select actual variants/prices, reset quantity and reject sold-out/cart-limit additions', async () => {
  const { ProductDetailClient } = await import('../src/components/ProductDetailClient');
  let view!: ReactTestRenderer;
  await act(async () => { view = create(createElement(ProductDetailClient, { product, compact: true })); });
  const button = (text: string) => view.root.findAllByType('button').find(b => b.children.includes(text))!;
  try {
    assert.equal(button('L').props.disabled, true);
    await act(async () => button('blue').props.onClick());
    const defaultSize = button('مقاس موحد');
    assert.equal(defaultSize.props['aria-pressed'], true, 'default-size variants remain selected in mixed-size catalogues');
    assert.match(JSON.stringify(view.toJSON()), /35/);
    await act(async () => view.root.findByProps({ 'aria-label': 'زيادة الكمية' }).props.onClick());
    assert.equal(view.root.findByProps({ 'aria-label': 'الكمية' }).props.value, '2');
    await act(async () => button('L').props.onClick());
    assert.equal(view.root.findByProps({ 'aria-label': 'الكمية' }).props.value, '1');
    await act(async () => button('أضيفي للسلة').props.onClick());
    assert.equal(additions.length, 1);
    assert.deepEqual({ id: additions[0].variantId, price: additions[0].unitPrice, quantity: additions[0].quantity, max: additions[0].maxQuantity }, { id: 'blue-l', price: 40, quantity: 1, max: 1 });
    accepted = false;
    await act(async () => view.root.findByProps({ className: 'stickyAddButton' }).props.onClick());
    assert.match(JSON.stringify(view.root.findByProps({ role: 'alert' }).children), /للكمية المتاحة/);
    await act(async () => view.update(createElement(ProductDetailClient, { product: { ...product, isOutOfStock: true }, compact: true })));
    assert.equal(button('نفدت الكمية').props.disabled, true);
    const count = additions.length;
    await act(async () => button('نفدت الكمية').props.onClick());
    assert.equal(additions.length, count);
  } finally { await act(async () => view.unmount()); accepted = true; additions.length = 0; }
});

test('quick view loads current data, retries network errors, blocks unpublished products and cleans up modal/request state', async () => {
  const originalFetch = globalThis.fetch;
  const pending: { resolve: (response: Response) => void; signal: AbortSignal; ids: string[] }[] = [];
  globalThis.fetch = async (_url, init) => new Promise(resolve => pending.push({ resolve, signal: init?.signal as AbortSignal, ids: JSON.parse(init?.body as string).ids }));
  const body = { style: { overflow: 'auto' } };
  let restored = 0, opened = 0, closed = 0, onClose = 0;
  Object.assign(globalThis, { window: { setTimeout, clearTimeout }, document: { body, activeElement: { isConnected: true, focus: () => restored++ } } });
  const { QuickView } = await import('../src/components/QuickView');
  const modal = { showModal: () => opened++, close: () => closed++ };
  let view!: ReactTestRenderer;
  await act(async () => { view = create(createElement(QuickView, { product: { ...product, name: 'بطاقة قديمة' }, onClose: () => onClose++ }), { createNodeMock: element => element.type === 'dialog' ? modal : null }); });
  try {
    assert.equal(opened, 1); assert.equal(body.style.overflow, 'hidden');
    assert.deepEqual(pending[0].ids, ['p']);
    assert.equal(view.root.findAllByProps({ className: 'stickyAddButton' }).length, 0, 'no add control while loading');
    await act(async () => pending[0].resolve(new Response('', { status: 503 })));
    const retry = view.root.findAllByType('button').find(b => b.children.includes('إعادة المحاولة'))!;
    await act(async () => retry.props.onClick());
    assert.equal(pending[0].signal.aborted, true);
    await act(async () => pending[1].resolve(Response.json({ products: [product] })));
    assert.equal(view.root.findByType('h2').children[0], 'منتج حديث');
    assert.equal(view.root.findByType('a').props.href, '/product/product');
    await act(async () => view.root.findByType('dialog').props.onCancel({ preventDefault() {} }));
    assert.equal(onClose, 1);
    await act(async () => view.unmount());
    assert.equal(body.style.overflow, 'auto'); assert.equal(closed, 1); assert.equal(restored, 1);
    await act(async () => { view = create(createElement(QuickView, { product, onClose: () => {} }), { createNodeMock: element => element.type === 'dialog' ? modal : null }); });
    await act(async () => pending[2].resolve(Response.json({ products: [], unavailableIds: ['p'] })));
    assert.match(JSON.stringify(view.toJSON()), /لم يعد متاحًا/);
    assert.equal(view.root.findAllByType('a').length, 0);
    assert.equal(view.root.findAllByProps({ className: 'stickyAddButton' }).length, 0);
    await act(async () => view.unmount());
    await act(async () => { view = create(createElement(QuickView, { product, onClose: () => {} }), { createNodeMock: element => element.type === 'dialog' ? modal : null }); });
    await act(async () => view.unmount());
    assert.equal(pending[3].signal.aborted, true);
    await act(async () => pending[3].resolve(Response.json({ products: [product] })));
    assert.equal(additions.length, 0, 'loading/closing a preview never adds merchandise');
  } finally { await act(async () => view.unmount()); globalThis.fetch = originalFetch; }
});
