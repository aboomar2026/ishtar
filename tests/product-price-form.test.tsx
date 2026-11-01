import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

function mockModule(id: string, exports: unknown) {
  const filename = require.resolve(id);
  require.cache[filename] = { id: filename, filename, loaded: true, exports } as NodeModule;
}
type Payload = { basePrice: number; variants: { price: number; compareAtPrice?: number }[] };
let submitted: Payload | undefined;
function saved(): Payload | undefined { return submitted; }
mockModule('next/navigation', { useRouter: () => ({ refresh() {} }) });
mockModule('../src/components/admin/useUnsavedChanges', { useUnsavedChanges: () => false });
mockModule('../src/components/admin/ImageUploadButton', { ImageUploadButton: () => null });
mockModule('../src/features/admin/products/product-admin.actions', {
  updateProductAction: async (_id: string, payload: typeof submitted) => { submitted = payload; return { ok: true }; },
});
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

test('existing stale variant prices block save, apply-all repairs payload, custom prices require explicit choice', async () => {
  const { ProductForm, buildEmptyProduct } = await import('../src/components/admin/ProductForm');
  let view!: ReactTestRenderer;
  await act(async () => { view = create(createElement(ProductForm, {
    mode: 'edit', productId: 'product', categories: [{ id: 'cat', name: 'ملابس', isActive: true }],
    initial: { ...buildEmptyProduct(), name: 'طقم', slug: 'set', categoryId: 'cat', basePrice: 200, compareAtPrice: 220,
      variants: [{ id: 'variant', sku: 'SET', colorName: 'رمادي', colorValue: '#888888', size: 'M',
        price: '120', compareAtPrice: '220', quantity: '2', lowStockThreshold: '1', isActive: true }] },
  })); });
  const save = async () => act(async () => { view.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
  const change = async (value: string) => act(async () => { view.root.findByProps({ id: 'p-baseprice' }).props.onChange({ target: { value } }); });
  try {
    assert.match(JSON.stringify(view.toJSON()), /120/);
    await save();
    assert.equal(submitted, undefined);
    assert.ok(view.root.findAllByProps({ role: 'alert' }).length);
    await act(async () => { view.root.findAllByType('button').find(n => n.children.join('') === 'تطبيق السعر على كل الخيارات')!.props.onClick(); });
    await save();
    assert.equal(saved()?.basePrice, 200);
    assert.equal(saved()?.variants[0].price, 200);
    assert.equal(saved()?.variants[0].compareAtPrice, 220);
    submitted = undefined;
    await change('210');
    await save();
    assert.equal(submitted, undefined);
    const choice = () => view.root.findAllByType('input').find(n => n.props.type === 'checkbox' && n.parent?.children.some(c => typeof c === 'string' && c.includes('الاحتفاظ بأسعار')))!;
    await act(async () => choice().props.onChange({ target: { checked: true } }));
    await save();
    assert.equal(saved()?.variants[0].price, 200);
    submitted = undefined;
    await change('215');
    await save();
    assert.equal(submitted, undefined, 'another price edit resets acknowledgement');
  } finally { await act(async () => view.unmount()); }
});
