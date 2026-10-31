import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { DEFAULT_HERO_SETTINGS, type HeroSettings } from '../src/features/hero/hero-config';

function mockModule(id: string, exports: unknown) {
  const filename = require.resolve(id);
  require.cache[filename] = { id: filename, filename, loaded: true, exports } as NodeModule;
}
let submitted: HeroSettings | undefined;
mockModule('next/navigation', { useRouter: () => ({ refresh() {} }) });
mockModule('../src/features/hero/hero.actions', { saveHeroSettingsAction: async (value: HeroSettings) => { submitted = value; return { ok: true, message: 'تم الحفظ' }; } });
mockModule('../src/components/hero/HeroView', { HeroView: () => createElement('div', null, 'معاينة') });
mockModule('../src/components/admin/ImageUploadButton', { ImageUploadButton: () => null });
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

test('admin edits each template independently, selects minute rotation and saves the complete configuration', async () => {
  const { HeroEditor } = await import('../src/components/admin/HeroEditor');
  let view!: ReactTestRenderer;
  await act(async () => { view = create(createElement(HeroEditor, { initial: { ...DEFAULT_HERO_SETTINGS, layout: 'classic', startLayout: 'classic' }, banners: [], products: [{ name: 'منتج مثبت', image: '/one.jpg', href: '/product/one' }] })); });
  const change = async (id: string, value: string) => act(async () => view.root.findByProps({ id }).props.onChange({ target: { value } }));
  await change('hero-title-0', 'عنوان الكلاسيكي الخاص');
  await change('hero-edit-layout', 'signature');
  assert.notEqual(view.root.findByProps({ id: 'hero-title-0' }).props.value, 'عنوان الكلاسيكي الخاص');
  await change('hero-title-0', 'عنوان المميز الخاص');
  await change('hero-edit-layout', 'campaign');
  await change('hero-title-0', 'عنوان الحملة الخاص');
  await change('hero-edit-layout', 'classic');
  assert.equal(view.root.findByProps({ id: 'hero-title-0' }).props.value, 'عنوان الكلاسيكي الخاص');
  await change('hero-slot-0', '/product/one');
  assert.equal(view.root.findByProps({ id: 'hero-slot-1' }).props.value, '');
  assert.equal(view.root.findByProps({ id: 'hero-slot-2' }).props.value, '');
  const save = view.root.findAllByType('button').find(node => node.children.join('') === 'حفظ تصميم الواجهة');
  assert.ok(save);
  await act(async () => save.props.onClick());
  assert.equal(submitted?.mode, 'rotate');
  assert.deepEqual(submitted?.productSlots, ['/product/one', null, null]);
  assert.equal(submitted?.layout, 'classic');
  assert.equal(submitted?.profiles.classic?.banners[0].title, 'عنوان الكلاسيكي الخاص');
  assert.equal(submitted?.profiles.signature?.banners[0].title, 'عنوان المميز الخاص');
  assert.equal(submitted?.profiles.campaign?.banners[0].title, 'عنوان الحملة الخاص');
  await act(async () => view.unmount());
});
