import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { useOrderActivity } from '../src/components/admin/useOrderActivity';

test('live activity polling pauses, backs off, rejects stale replies and cleans up', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const documentListeners = new Map<string, () => void>();
  const windowListeners = new Map<string, () => void>();
  const doc = { hidden: false, addEventListener: (name: string, fn: () => void) => documentListeners.set(name, fn), removeEventListener: (name: string) => documentListeners.delete(name) };
  const win = { addEventListener: (name: string, fn: () => void) => windowListeners.set(name, fn), removeEventListener: (name: string) => windowListeners.delete(name) };
  const nav = { onLine: true };
  Object.assign(globalThis, { document: doc, window: win, IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true });
  const originalFetch = globalThis.fetch;
  let calls = 0;
  let mode: 'success' | 'failure' | 'held' | 'denied' = 'success';
  let revision = 'one';
  let settle: ((response: Response) => void) | undefined;
  let signal: AbortSignal | null | undefined;
  const changes: boolean[] = [];
  let denied = 0;
  let state: ReturnType<typeof useOrderActivity> | undefined;
  globalThis.fetch = async (_url, init) => {
    calls++; signal = init?.signal;
    if (mode === 'held') return new Promise<Response>(resolve => { settle = resolve; });
    if (mode === 'failure') return new Response('', { status: 503 });
    if (mode === 'denied') return new Response('', { status: 403 });
    return Response.json({ revision, pendingOrders: 2, unread: 1, failed: 0, outboxEnabled: true });
  };
  function Probe() { state = useOrderActivity((_data, changed) => changes.push(changed), () => denied++); return null; }
  let view!: ReactTestRenderer;
  const tick = async (ms: number) => act(async () => t.mock.timers.tick(ms));
  try {
    await act(async () => { view = create(createElement(Probe)); });
    assert.equal(calls, 1); assert.deepEqual(changes, [false]);
    revision = 'two'; await tick(10000);
    assert.equal(calls, 2); assert.deepEqual(changes, [false, true]);
    doc.hidden = true; await act(async () => documentListeners.get('visibilitychange')?.());
    await tick(30000); assert.equal(calls, 2);
    doc.hidden = false; await act(async () => documentListeners.get('visibilitychange')?.());
    assert.equal(calls, 3);
    nav.onLine = false; await act(async () => windowListeners.get('offline')?.());
    await tick(30000); assert.equal(calls, 3);
    nav.onLine = true; mode = 'failure'; await act(async () => windowListeners.get('online')?.());
    assert.equal(calls, 4); assert.equal(state?.unavailable, true);
    await tick(10000); assert.equal(calls, 4, 'failure backs off beyond the normal interval');
    mode = 'success'; await tick(10000); assert.equal(calls, 5); assert.equal(state?.unavailable, false);
    mode = 'held'; await tick(10000); assert.equal(calls, 6);
    const countBeforeStale = changes.length;
    doc.hidden = true; await act(async () => documentListeners.get('visibilitychange')?.());
    assert.equal(signal?.aborted, true);
    await act(async () => settle?.(Response.json({ revision: 'stale', pendingOrders: 99, unread: 99, failed: 0, outboxEnabled: true })));
    assert.equal(changes.length, countBeforeStale, 'aborted old response cannot replace newer state');
    mode = 'denied'; doc.hidden = false; await act(async () => documentListeners.get('visibilitychange')?.());
    assert.equal(denied, 1); assert.equal(state?.activity, null);
    const deniedCalls = calls; await tick(120000); assert.equal(calls, deniedCalls, 'forbidden session must stop polling');
    await act(async () => view.unmount());
    assert.equal(documentListeners.size, 0); assert.equal(windowListeners.size, 0);
    await tick(120000); assert.equal(calls, deniedCalls);
  } finally { globalThis.fetch = originalFetch; }
});
