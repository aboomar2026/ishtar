'use client';
import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'motion/react';
import type { HeroSettings } from '@/features/hero/hero-config';

export function useHeroMotion(settings: HeroSettings) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 'some' });
  const reduced = useReducedMotion();
  const [foreground, setForeground] = useState(true);
  useEffect(() => {
    const sync = () => setForeground(!document.hidden);
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);
  return { ref, enabled: inView && foreground && reduced === false && settings.motion !== 'none', lively: settings.motion === 'lively' };
}
