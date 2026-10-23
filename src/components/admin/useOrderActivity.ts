'use client';
import { useEffect, useRef, useState } from 'react';

export type OrderActivity = { revision: string; pendingOrders: number; unread: number; failed: number; outboxEnabled: boolean };

export function useOrderActivity(onResponse: (activity: OrderActivity, changed: boolean) => void, onDenied: () => void) {
  const [activity, setActivity] = useState<OrderActivity | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const callbacks = useRef({ onResponse, onDenied });
  useEffect(() => { callbacks.current = { onResponse, onDenied }; }, [onResponse, onDenied]);
  useEffect(() => {
    let disposed = false;
    let denied = false;
    let revision: string | undefined;
    let failures = 0;
    let generation = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    const available = () => !document.hidden && navigator.onLine !== false && !denied && !disposed;
    function stop() { generation++; clearTimeout(timer); controller?.abort(); controller = undefined; }
    async function poll() {
      if (!available()) return;
      const current = ++generation;
      const request = new AbortController();
      controller = request;
      const timeout = setTimeout(() => request.abort(), 8000);
      try {
        const response = await fetch('/admin/api/order-activity', { cache: 'no-store', credentials: 'same-origin', signal: request.signal });
        if (disposed || current !== generation) return;
        if (response.status === 401 || response.status === 403) {
          denied = true; setActivity(null); setUnavailable(true); callbacks.current.onDenied(); return;
        }
        if (!response.ok) throw new Error('Activity unavailable');
        const next = await response.json() as OrderActivity;
        if (disposed || current !== generation) return;
        if (typeof next.revision !== 'string' || typeof next.outboxEnabled !== 'boolean' || ![next.pendingOrders, next.unread, next.failed].every(n => Number.isInteger(n) && n >= 0)) throw new Error('Invalid activity');
        const changed = revision !== undefined && next.revision !== revision;
        revision = next.revision;
        failures = 0; setUnavailable(false); setActivity(next);
        callbacks.current.onResponse(next, changed);
      } catch {
        if (!disposed && current === generation) { failures++; setUnavailable(true); }
      } finally {
        clearTimeout(timeout);
        if (!disposed && current === generation) {
          controller = undefined;
          if (available()) timer = setTimeout(poll, Math.min(120000, 10000 * 2 ** Math.min(failures, 4)));
        }
      }
    }
    function resume() { stop(); if (navigator.onLine === false) setUnavailable(true); if (available()) void poll(); }
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', resume); window.addEventListener('offline', resume);
    void poll();
    return () => { disposed = true; stop(); document.removeEventListener('visibilitychange', resume); window.removeEventListener('online', resume); window.removeEventListener('offline', resume); };
  }, []);
  return { activity, unavailable };
}
