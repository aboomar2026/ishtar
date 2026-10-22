import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

const previousKey = '11111111-1111-4111-8111-111111111111';
const storage = new Map<string, string>();
const browserStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => { storage.set(key, value); },
  removeItem: (key: string) => { storage.delete(key); }
};
let cleared = 0;
const navigations: string[] = [];
const submissions: { requestKey: string; lines: unknown[] }[] = [];
let receipt: { orderNumber: string } | null = { orderNumber: 'OLD-ORDER' };
let lookupFails = false;
let submitSucceeds = false;
const router = { push: (href: string) => { navigations.push(href); } };
const cart = {
  lines: [{ variantId: 'new-variant', name: 'منتج جديد', quantity: 1, unitPrice: 30, maxQuantity: 5 }],
  subtotal: 30, total: 30, deliveryFee: 0, isCartLoaded: true,
  refreshing: false, cartError: null, refreshCart: async () => true,
  clearCart: () => { cleared += 1; }
};

// Mount the real client component with controlled router, storage and server-action boundaries.
function mockModule(id: string, exports: unknown) {
  const filename = require.resolve(id);
  require.cache[filename] = { id: filename, filename, loaded: true, exports } as NodeModule;
}
mockModule('next/navigation', { useRouter: () => router });
mockModule('next/link', { __esModule: true, default: ({ href, children }: { href: string; children: React.ReactNode }) => createElement('a', { href }, children) });
mockModule('../src/components/CartProvider', { useCart: () => cart });
mockModule('../src/features/orders/order.actions', {
  recoverCheckoutAction: async () => { if (lookupFails) throw new Error('offline'); return receipt; },
  createCodOrderAction: async (input: { requestKey: string; lines: unknown[] }) => {
    submissions.push(input);
    if (submitSucceeds) return { ok: true, orderNumber: 'NEW-ORDER', orderId: 'new-order-id', total: 30 };
    return { ok: false, error: 'بيانات اختبار', fieldErrors: { fullName: 'الاسم مطلوب' } };
  }
});
Object.assign(globalThis, { window: { localStorage: browserStorage }, sessionStorage: browserStorage, IS_REACT_ACT_ENVIRONMENT: true });

test('checkout recovery never treats a previous receipt as a newly submitted cart', async (t) => {
  const { CheckoutForm } = await import('../src/components/CheckoutForm');
  const { brandStorageKeys } = await import('../src/lib/brand-storage');
  let view: ReactTestRenderer;
  async function mount() {
    storage.clear(); cleared = 0; navigations.length = 0; submissions.length = 0;
    storage.set(`${brandStorageKeys.shipping}:attempt`, JSON.stringify({ key: previousKey }));
    await act(async () => { view = create(createElement(CheckoutForm)); });
  }
  await t.test('a committed old attempt preserves the current cart and does not redirect automatically', async () => {
    await mount();
    assert.equal(cleared, 0);
    assert.deepEqual(navigations, []);
    assert.match(JSON.stringify(view!.toJSON()), /OLD-ORDER/);
    assert.equal(submissions.length, 0);
    await act(async () => { view!.unmount(); });
  });
  await t.test('explicitly continuing a new cart uses a fresh attempt key', async () => {
    await mount();
    const button = view!.root.findAllByType('button').find((node) => node.children.join('') === 'متابعة طلب جديد بالسلة الحالية');
    assert.ok(button);
    await act(async () => { button.props.onClick(); });
    assert.equal(cleared, 0);
    assert.equal(browserStorage.getItem(`${brandStorageKeys.shipping}:attempt`), null);
    await act(async () => { await view!.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
    assert.equal(submissions.length, 1);
    assert.notEqual(submissions[0].requestKey, previousKey);
    assert.deepEqual(submissions[0].lines, [{ variantId: 'new-variant', quantity: 1 }]);
    await act(async () => { view!.unmount(); });
  });
  await t.test('an unresolved attempt keeps its original key when retried', async () => {
    receipt = null;
    await mount();
    await act(async () => { await view!.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
    assert.equal(submissions[0].requestKey, previousKey);
    assert.equal(cleared, 0);
    await act(async () => { view!.unmount(); });
  });
  await t.test('a failed receipt lookup cannot start another attempt or clear the cart', async () => {
    lookupFails = true;
    await mount();
    assert.equal(view!.root.findAllByType('form').length, 0);
    assert.equal(cleared, 0);
    assert.deepEqual(navigations, []);
    assert.equal(JSON.parse(browserStorage.getItem(`${brandStorageKeys.shipping}:attempt`)!).key, previousKey);
    lookupFails = false;
    receipt = { orderNumber: 'OLD-ORDER' };
    await act(async () => { await view!.root.findByType('button').props.onClick(); });
    assert.equal(cleared, 0);
    assert.deepEqual(navigations, []);
    assert.match(JSON.stringify(view!.toJSON()), /OLD-ORDER/);
    await act(async () => { view!.unmount(); });
  });
  await t.test('a newly confirmed submission still clears the cart and opens its own receipt', async () => {
    receipt = null;
    submitSucceeds = true;
    await mount();
    await act(async () => { await view!.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
    assert.equal(cleared, 1);
    assert.deepEqual(navigations, ['/order-success?order=NEW-ORDER']);
    assert.equal(browserStorage.getItem(`${brandStorageKeys.shipping}:attempt`), null);
    await act(async () => { view!.unmount(); });
  });
});
