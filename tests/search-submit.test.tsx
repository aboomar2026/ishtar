import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

const events: string[] = [];
const moduleId = require.resolve('next/navigation');
require.cache[moduleId] = { id: moduleId, filename: moduleId, loaded: true, exports: { useRouter: () => ({ push: (url: string) => events.push(url) }) } } as NodeModule;
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
