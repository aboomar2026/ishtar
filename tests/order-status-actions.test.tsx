import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

function mockModule(id: string, exports: unknown) {
  const filename = require.resolve(id);
  require.cache[filename] = { id: filename, filename, loaded: true, exports } as NodeModule;
}
type Result = { ok: true } | { ok: false; message: string };
const calls: unknown[][] = [];
let finish!: (result: Result) => void;
let refreshes = 0;
let throwNetworkError = false;
mockModule('next/navigation', { useRouter: () => ({ refresh() { refreshes++; } }) });
mockModule('../src/features/admin/orders/order-admin.actions', {
  updateOrderStatusAction: (...args: unknown[]) => { if (throwNetworkError) throw new Error('network'); calls.push(args); return new Promise<Result>(resolve => { finish = resolve; }); },
});
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

test('cancellation uses visible confirmation, accepts blank reason, blocks duplicate submits and surfaces failures', async () => {
  const { OrderStatusActions } = await import('../src/components/admin/OrderStatusActions');
  let view!: ReactTestRenderer;
  const button = (text: string) => view.root.findAllByType('button').find(n => n.children.join('') === text)!;
  await act(async () => { view = create(createElement(OrderStatusActions, { orderId: 'test-only', status: 'PENDING', deliveryFeeStatus: 'PENDING' })); });
  try {
    await act(async () => button('إلغاء الطلب').props.onClick());
    assert.equal(calls.length, 0, 'opening confirmation must not mutate an order');
    assert.equal(view.root.findByType('textarea').props.value, '');
    await act(async () => button('تراجع').props.onClick());
    assert.equal(calls.length, 0);
    assert.equal(view.root.findAllByType('fieldset').length, 0);
    await act(async () => button('إلغاء الطلب').props.onClick());
    await act(async () => {
      const confirm = button('تأكيد إلغاء الطلب');
      confirm.props.onClick();
      confirm.props.onClick();
    });
    assert.deepEqual(calls, [['test-only', 'CANCELED', undefined]]);
    assert.equal(view.root.findByType('fieldset').props.disabled, true);
    await act(async () => finish({ ok: false, message: 'تعذر الحفظ' }));
    assert.equal(view.root.findByProps({ role: 'alert' }).children.join(''), 'تعذر الحفظ');
    assert.equal(refreshes, 0);
    await act(async () => view.root.findByType('textarea').props.onChange({ target: { value: '  طلبت الزبونة الإلغاء  ' } }));
    await act(async () => { button('تأكيد إلغاء الطلب').props.onClick(); });
    assert.deepEqual(calls[1], ['test-only', 'CANCELED', 'طلبت الزبونة الإلغاء']);
    await act(async () => finish({ ok: true }));
    assert.equal(refreshes, 1);
    assert.equal(view.root.findAllByType('fieldset').length, 0);
    assert.match(view.root.findByProps({ role: 'status' }).children.join(''), /تم إلغاء الطلب/);
  } finally { await act(async () => view.unmount()); }
});

test('network errors remain visible and do not claim successful cancellation', async () => {
  const { OrderStatusActions } = await import('../src/components/admin/OrderStatusActions');
  throwNetworkError = true;
  const previousRefreshes = refreshes;
  let view!: ReactTestRenderer;
  await act(async () => { view = create(createElement(OrderStatusActions, { orderId: 'test-only', status: 'PROCESSING', deliveryFeeStatus: 'PENDING' })); });
  try {
    assert.equal(view.root.findAllByType('button').find(n => n.children.join('').includes('تم الشحن'))!.props.disabled, true);
    await act(async () => view.root.findAllByType('button').find(n => n.children.join('') === 'إلغاء الطلب')!.props.onClick());
    await act(async () => view.root.findAllByType('button').find(n => n.children.join('') === 'تأكيد إلغاء الطلب')!.props.onClick());
    assert.match(view.root.findByProps({ role: 'alert' }).children.join(''), /تعذر تأكيد/);
    assert.equal(view.root.findAllByProps({ role: 'status' }).length, 0);
    assert.equal(view.root.findByType('fieldset').props.disabled, false);
    assert.equal(refreshes, previousRefreshes);
  } finally { await act(async () => view.unmount()); }
});
