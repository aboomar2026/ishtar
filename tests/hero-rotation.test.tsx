import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { useHeroRotation } from '../src/components/hero/useHeroRotation';
import { HERO_ROTATION_MS, type HeroLayout } from '../src/features/hero/hero-config';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
test('template rotation repeats every minute, pauses safely and cleans up its timer', async t => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  let current!: ReturnType<typeof useHeroRotation>;
  function Harness({ initial = 'signature', enabled = true, paused = false }: { initial?: HeroLayout; enabled?: boolean; paused?: boolean }) {
    current = useHeroRotation(initial, enabled, paused);
    return createElement('span', null, current.layout);
  }
  let view!: ReactTestRenderer;
  await act(async () => { view = create(createElement(Harness)); });
  await act(async () => t.mock.timers.tick(HERO_ROTATION_MS - 1));
  assert.equal(current.layout, 'signature');
  await act(async () => t.mock.timers.tick(1));
  assert.equal(current.layout, 'campaign');
  for (const expected of ['classic', 'signature', 'campaign']) {
    await act(async () => t.mock.timers.tick(HERO_ROTATION_MS));
    assert.equal(current.layout, expected);
  }
  await act(async () => view.update(createElement(Harness, { paused: true })));
  await act(async () => t.mock.timers.tick(HERO_ROTATION_MS * 3));
  assert.equal(current.layout, 'campaign');
  await act(async () => current.next());
  assert.equal(current.layout, 'classic');
  await act(async () => view.update(createElement(Harness)));
  await act(async () => t.mock.timers.tick(HERO_ROTATION_MS));
  assert.equal(current.layout, 'signature');
  await act(async () => view.update(createElement(Harness, { enabled: false, initial: 'classic' })));
  await act(async () => t.mock.timers.tick(HERO_ROTATION_MS * 3));
  assert.equal(current.layout, 'classic');
  await act(async () => view.unmount());
  await act(async () => t.mock.timers.tick(HERO_ROTATION_MS * 3));
  assert.equal(current.layout, 'classic');
});
