import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import type { AdminCategoryListItem } from '../src/features/admin/categories/category-admin.queries';

function mockModule(id: string, exports: unknown) {
  const filename = require.resolve(id);
  require.cache[filename] = { id: filename, filename, loaded: true, exports } as NodeModule;
}
const saved: { id: string; input: { imageUrl?: string } }[] = [];
mockModule('next/navigation', { useRouter: () => ({ refresh() {} }) });
mockModule('../src/features/admin/categories/category-admin.actions', {
  updateCategoryAction: async (id: string, input: { imageUrl?: string }) => { saved.push({ id, input }); return { ok: true, id }; },
});
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const category: AdminCategoryListItem = { id: 'accessories', name: 'إكسسوارات', slug: 'accessories', description: '', imageUrl: '/old.jpg', parentId: '', parentName: null, productCount: 0, childCount: 0, sortOrder: 1, isActive: true };

test('category upload validates files, preserves the old image on failure, locks the editor, and saves the uploaded URL only after confirmation', async () => {
  const { CategoryManager } = await import('../src/components/admin/CategoryManager');
  let view!: ReactTestRenderer;
  const originalFetch = globalThis.fetch;
  let requests = 0;
  let finish!: (response: Response) => void;
  globalThis.fetch = async (_url, options) => {
    requests++;
    assert.equal(_url, '/admin/api/uploads');
    const body = options?.body as FormData;
    assert.equal(body.get('kind'), 'banner');
    return new Promise<Response>((resolve) => { finish = resolve; });
  };
  const button = (label: string) => view.root.findAllByType('button').find(node => node.children.join('') === label)!;
  const pick = (file: File) => view.root.findByProps({ type: 'file' }).props.onChange({ target: { files: [file], value: 'file' } });
  try {
    await act(async () => { view = create(createElement(CategoryManager, { categories: [category], parentOptions: [] })); });
    await act(async () => button('تعديل').props.onClick());
    assert.equal(view.root.findByProps({ alt: 'معاينة صورة التصنيف' }).props.src, '/old.jpg');
    await act(async () => { await pick(new File(['bad'], 'bad.svg', { type: 'image/svg+xml' })); });
    assert.equal(requests, 0);
    assert.equal(view.root.findByProps({ role: 'alert' }).children.join(''), 'نوع الملف غير مدعوم. الصيغ المسموحة: JPG، PNG، WebP، AVIF.');
    let upload!: Promise<void>;
    await act(async () => { upload = pick(new File(['image'], 'cover.jpg', { type: 'image/jpeg' })); });
    assert.equal(button('حفظ التصنيف').props.disabled, true);
    assert.equal(button('إلغاء').props.disabled, true);
    assert.equal(button('تعديل').props.disabled, true);
    assert.equal(view.root.findByType('fieldset').props.disabled, true);
    await act(async () => view.root.findByType('form').props.onSubmit({ preventDefault() {} }));
    assert.equal(saved.length, 0);
    await act(async () => { finish(Response.json({ success: false, error: 'فشل رفع الصورة. حاول مرة أخرى.' }, { status: 500 })); await upload; });
    assert.equal(view.root.findByProps({ alt: 'معاينة صورة التصنيف' }).props.src, '/old.jpg');
    assert.equal(button('حفظ التصنيف').props.disabled, false);
    await act(async () => { upload = pick(new File(['image'], 'cover.jpg', { type: 'image/jpeg' })); });
    await act(async () => { finish(Response.json({ success: true, image: { secureUrl: 'https://res.cloudinary.com/demo/image/upload/cover.jpg', publicId: 'cover' } })); await upload; });
    assert.equal(saved.length, 0);
    assert.equal(view.root.findByProps({ alt: 'معاينة صورة التصنيف' }).props.src, 'https://res.cloudinary.com/demo/image/upload/cover.jpg');
    await act(async () => view.root.findByType('form').props.onSubmit({ preventDefault() {} }));
    assert.equal(saved[0].id, category.id);
    assert.equal(saved[0].input.imageUrl, 'https://res.cloudinary.com/demo/image/upload/cover.jpg');
    assert.equal(category.imageUrl, '/old.jpg');
  } finally {
    globalThis.fetch = originalFetch;
    await act(async () => view?.unmount());
  }
});

test('broken previews explain the failure, a replacement retries, and removal saves an empty image', async () => {
  const { CategoryManager } = await import('../src/components/admin/CategoryManager');
  let view!: ReactTestRenderer;
  const button = (label: string) => view.root.findAllByType('button').find(node => node.children.join('') === label)!;
  await act(async () => { view = create(createElement(CategoryManager, { categories: [category], parentOptions: [] })); });
  try {
    await act(async () => button('تعديل').props.onClick());
    await act(async () => view.root.findByProps({ alt: 'معاينة صورة التصنيف' }).props.onError());
    assert.ok(JSON.stringify(view.toJSON()).includes('تعذّر تحميل الصورة'));
    await act(async () => view.root.findByProps({ id: 'categorymanager-4' }).props.onChange({ target: { value: '/replacement.jpg' } }));
    assert.equal(view.root.findByProps({ alt: 'معاينة صورة التصنيف' }).props.src, '/replacement.jpg');
    await act(async () => button('إزالة صورة التصنيف').props.onClick());
    assert.ok(JSON.stringify(view.toJSON()).includes('ستظهر الصورة الافتراضية'));
    await act(async () => view.root.findByType('form').props.onSubmit({ preventDefault() {} }));
    assert.equal(saved.at(-1)?.input.imageUrl, undefined);
  } finally { await act(async () => view.unmount()); }
});

test('all eighteen categories have curated photos and custom administrator images take precedence', async () => {
  const { CATEGORY_IMAGES, getCategoryImage, getCategoryDefaultImage } = await import('../src/lib/category-images');
  assert.equal(Object.keys(CATEGORY_IMAGES).length, 18);
  for (const [slug, image] of Object.entries(CATEGORY_IMAGES)) {
    assert.ok(!image.includes('mock-products'));
    assert.equal(getCategoryImage(slug, null), image);
    assert.equal(getCategoryImage(slug, '/mock-products/gift-box.svg'), image);
    assert.equal(getCategoryImage(slug, 'https://example.com/custom.jpg'), 'https://example.com/custom.jpg');
  }
  assert.equal(getCategoryImage('perfumes', 'https://images.pexels.com/photos/31823739/pexels-photo-31823739.jpeg?w=1000'), '/category-images/perfumes.jpg');
  assert.ok(getCategoryDefaultImage('new-category').endsWith('.jpg'));
});
