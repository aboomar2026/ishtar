import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement, createRef } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { DEFAULT_HERO_SETTINGS, HERO_ROTATION_MS } from '../src/features/hero/hero-config';
function mockModule(id: string, exports: unknown) {
  const filename = require.resolve(id);
  require.cache[filename] = { id: filename, filename, loaded: true, exports } as NodeModule;
}
// Keep visibility and animation boundaries deterministic; exercise the real view/timer/focus handlers.
mockModule('motion/react', {
  motion: { div: ({ children, ...props }: { children: React.ReactNode }) => createElement('div', props, children) },
  useInView: () => true, useReducedMotion: () => false,
  useAnimate: () => [createRef(), () => ({ complete() {} })]
});
mockModule('../src/components/hero/HeroVisuals', {
  HeroProductRail: () => null, HeroCopy: () => null, HeroScene: () => null, HeroCampaignSlide: () => null,
  resolveHeroBanner: (banner: unknown) => banner, FALLBACK_BANNER: { title: 'عشتار' }
});
mockModule('../src/components/hero/HeroAtmosphere', { HeroAtmosphere: () => null, HeroBenefits: () => null });
let onVisibility = () => {};
const doc = { hidden: false, addEventListener: (_: string, fn: () => void) => { onVisibility = fn; }, removeEventListener() {} };
Object.assign(globalThis, { document: doc, IS_REACT_ACT_ENVIRONMENT: true });

test('public hero cycles without visitor controls; mouse/touch cannot latch a pause, keyboard/background resume', async t => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const { HeroView } = await import('../src/components/hero/HeroView');
  let view!: ReactTestRenderer;
  await act(async () => { view = create(createElement(HeroView, { settings: { ...DEFAULT_HERO_SETTINGS, mode: 'fixed', motion: 'none', autoplay: false }, banners: [], products: [] })); });
  const layout = () => view.root.findAllByType('section')[0].props.className;
  const tick = async () => act(async () => t.mock.timers.tick(HERO_ROTATION_MS));
  const root = () => view.root.findByProps({ className: 'shopHeroSwitcher' });
  assert.match(layout(), /--signature/);
  assert.equal(view.root.findAllByType('section')[0].props['data-motion'], 'lively');
  assert.equal(view.root.findAllByProps({ className: 'shopHeroTemplateControls' }).length, 0);
  assert.equal(root().props.onPointerEnter, undefined);
  await tick(); assert.match(layout(), /--campaign/);
  await act(async () => root().props.onFocusCapture({ target: { matches: () => false } }));
  await tick(); assert.match(layout(), /--classic/);
  await tick(); assert.match(layout(), /--signature/);
  await act(async () => root().props.onFocusCapture({ target: { matches: () => true } }));
  await tick(); assert.match(layout(), /--signature/);
  await act(async () => root().props.onBlurCapture({ currentTarget: { contains: () => false }, relatedTarget: null }));
  await tick(); assert.match(layout(), /--campaign/);
  await act(async () => { doc.hidden = true; onVisibility(); });
  await tick(); assert.match(layout(), /--campaign/);
  await act(async () => { doc.hidden = false; onVisibility(); });
  await tick(); assert.match(layout(), /--classic/);
  await act(async () => view.unmount());
});

test('editor previews remain fixed without publishing a different start design', async t => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const { HeroView } = await import('../src/components/hero/HeroView');
  let view!: ReactTestRenderer;
  await act(async () => { view = create(createElement(HeroView, { settings: { ...DEFAULT_HERO_SETTINGS, layout: 'signature', motion: 'none' }, banners: [], products: [], preview: true })); });
  await act(async () => t.mock.timers.tick(HERO_ROTATION_MS * 4));
  const section = view.root.findAllByType('section')[0];
  assert.match(section.props.className, /--signature/);
  assert.equal(section.props['data-motion'], 'none');
  await act(async () => view.unmount());
});
