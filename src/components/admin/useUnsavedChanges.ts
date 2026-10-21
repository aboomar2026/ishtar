'use client';
import { useEffect, useState } from 'react';

export function useUnsavedChanges(value: string, saving: boolean) {
  const [initial] = useState(value);
  const dirty = initial !== value;
  useEffect(() => {
    if (!dirty || saving) return;
    const message = 'لديك تعديلات غير محفوظة. هل تريد المغادرة؟';
    function unload(event: BeforeUnloadEvent) { event.preventDefault(); event.returnValue = ''; }
    function navigate(event: MouseEvent) {
      const link = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
      if (!link || link.target === '_blank' || link.hasAttribute('download') || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0 || link.href === location.href) return;
      if (!window.confirm(message)) { event.preventDefault(); event.stopImmediatePropagation(); }
    }
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', navigate, true);
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', navigate, true); };
  }, [dirty, saving]);
  return dirty;
}
