import 'server-only';
import { unstable_cache } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { DEFAULT_HERO_SETTINGS, parseHeroSettings } from './hero-config';

export async function getHeroSettings() {
  try {
    const saved = await prisma.heroSettings.findUnique({ where: { id: 'home' } });
    return parseHeroSettings(saved?.config ?? {});
  } catch (error) {
    // Older databases can continue serving the classic hero until the additive schema is applied.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') return DEFAULT_HERO_SETTINGS;
    throw error;
  }
}

// Public presentation settings only. Admin editors keep using the fresh reader.
// Prices, stock, sessions and customer/order data never enter this cache.
export const getPublicHeroSettings = unstable_cache(getHeroSettings, ['public-hero-settings-v1'], {
  revalidate: 300,
  tags: ['public-hero-settings'],
});
