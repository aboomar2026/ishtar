'use client';
import { useEffect, useState } from 'react';
import { HERO_ROTATION_MS, nextHeroLayout, type HeroLayout } from '@/features/hero/hero-config';

export function useHeroRotation(initial: HeroLayout, enabled: boolean, paused: boolean) {
  const [layout, setLayout] = useState(initial);
  useEffect(() => setLayout(initial), [initial]);
  useEffect(() => {
    if (!enabled || paused) return;
    const timer = setInterval(() => setLayout(previous => nextHeroLayout(previous)), HERO_ROTATION_MS);
    return () => clearInterval(timer);
  }, [enabled, paused, layout]);
  return { layout, next: () => setLayout(previous => nextHeroLayout(previous)) };
}
