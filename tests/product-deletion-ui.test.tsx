import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

function mockModule(id: string, exports: unknown) {
  const filename = require.resolve(id);
  require.cache[filename] = { id: filename, filename, loaded: true, exports } as NodeModule;
}
let refreshes = 0;
let calls = 0;
let finish!: (result: { ok: boolean; message?: string }) => void;
mockModule('next/navigation', { useRouter: () => ({ refresh() { refreshes++; } }) });
mockModule('../src/components/NavigationLink', { __esModule: true, default: () => null });
mockModule('../src/features/admin/products/product-admin.actions', {
  deleteProductAction: async (id: string, confirmation: string) => {
    assert.equal(id, 'product'); assert.equal(confirmation, 'حذف'); calls++;
    return new Promise((resolve) => { finish = resolve; });
  },
});
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

test('delete confirmation can be canceled, blocks double submits, retains errors and refreshes only on success', async () => {
  const { ProductRowActions } = await import('../src/components/admin/ProductRowActions');
  let view!: ReactTestRenderer;
  const button = (text: string) => view.root.findAllByType('button').find(n => n.children.join('') === text)!;
  await act(async () => { view = create(createElement(ProductRowActions, { id: 'product', slug: 'product', name: 'اسم المنتج', status: 'ACTIVE' })); });
  try {
    await act(async () => button('حذف').props.onClick());
    assert.ok(JSON.stringify(view.toJSON()).includes('اسم المنتج'));
    assert.equal(button('تأكيد حذف المنتج').props.disabled, true);
    await act(async () => button('إلغاء').props.onClick());
    assert.equal(calls, 0);
    await act(async () => button('حذف').props.onClick());
    await act(async () => view.root.findByType('input').props.onChange({ target: { value: 'حذف' } }));
    assert.equal(button('تأكيد حذف المنتج').props.disabled, false);
    await act(async () => { button('تأكيد حذف المنتج').props.onClick(); });
    assert.equal(view.root.findByType('fieldset').props.disabled, true);
    assert.equal(button('حذف').props.disabled, true);
    await act(async () => { finish({ ok: false, message: 'تغيّرت البيانات.' }); });
    assert.equal(view.root.findByProps({ role: 'alert' }).children.join(''), 'تغيّرت البيانات.');
    assert.equal(refreshes, 0);
    await act(async () => { button('تأكيد حذف المنتج').props.onClick(); });
    await act(async () => { finish({ ok: true }); });
    assert.equal(refreshes, 1);
    assert.equal(view.root.findAllByType('fieldset').length, 0);
    assert.equal(calls, 2);
  } finally { await act(async () => view.unmount()); }
});
