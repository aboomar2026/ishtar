import type { CSSProperties } from 'react';
import { babAlHaraBrand } from './bab-al-hara';
import { obbehBrand } from './obbeh';
import { madarBrand } from './madar';
import { saadBrand } from './saad';
import { ishtarBrand } from './ishtar';
import type { BrandKey, BrandProfile } from './types';

export type { BrandAssets, BrandColors, BrandKey, BrandProfile } from './types';

const profiles: Record<BrandKey, BrandProfile> = {
  saad: saadBrand,
  'bab-al-hara': babAlHaraBrand,
  obbeh: obbehBrand,
  madar: madarBrand,
  ishtar: ishtarBrand
};

const aliases: Record<string, BrandKey> = {
  ishtar: 'ishtar',
  saad: 'saad',
  'saad-center': 'saad',
  bab: 'bab-al-hara',
  'bab-al-hara': 'bab-al-hara',
  obbeh: 'obbeh',
  // Backward-compatible alias for the earlier misspelling used in preview deployments.
  oppeh: 'obbeh',
  madar: 'madar',
  'madar-one': 'madar',
  madarone: 'madar'
};

function resolveBrandKey(value: string | undefined): BrandKey {
  const normalized = value?.trim().toLowerCase();
  return (normalized && aliases[normalized]) || 'saad';
}

export const activeBrandKey = resolveBrandKey(process.env.NEXT_PUBLIC_STORE_BRAND);
export const brand = profiles[activeBrandKey];
export const availableBrands = Object.keys(profiles) as BrandKey[];

type BrandCssProperties = CSSProperties & Record<`--${string}`, string>;

function hexToRgb(hex: string): string {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((character) => character + character).join('')
    : normalized;

  if (!/^[0-9a-f]{6}$/i.test(value)) return '0, 0, 0';

  return [0, 2, 4]
    .map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16))
    .join(', ');
}

export function getBrandCssVariables(profile: BrandProfile = brand): BrandCssProperties {
  const { colors } = profile;
  const textRgb = hexToRgb(colors.text);
  const primaryRgb = hexToRgb(colors.primary);
  const accentRgb = hexToRgb(colors.accent);
  const softRgb = hexToRgb(colors.soft);

  return {
    '--brand-bg': colors.background,
    '--brand-surface': colors.surface,
    '--brand-section': colors.section,
    '--brand-border': colors.border,
    '--brand-gold': colors.accent,
    '--brand-gold-dark': colors.accentDark,
    '--brand-burgundy': colors.primary,
    '--brand-burgundy-hover': colors.primaryHover,
    '--brand-primary-dark': colors.primaryDark,
    '--brand-primary-deep': colors.primaryDeep,
    '--brand-blush': colors.soft,
    '--brand-blush-soft': colors.softAlt,
    '--brand-ink': colors.text,
    '--brand-muted': colors.muted,
    '--brand-page-end': colors.pageEnd,
    '--brand-footer-start': colors.footerStart,
    '--brand-footer-end': colors.footerEnd,
    '--brand-primary-rgb': primaryRgb,
    '--brand-accent-rgb': accentRgb,
    '--brand-soft-rgb': softRgb,
    '--brand-ink-rgb': textRgb,
    '--brand-background-rgb': hexToRgb(colors.background),
    '--brand-section-rgb': hexToRgb(colors.section),
    '--brand-border-rgb': hexToRgb(colors.border),
    '--brand-muted-rgb': hexToRgb(colors.muted),
    '--brand-success-rgb': hexToRgb(colors.success),
    '--brand-danger-rgb': hexToRgb(colors.danger),

    // Legacy aliases retained so the existing UI is fully themed without a broad CSS rewrite.
    '--cream': colors.background,
    '--cream-2': colors.surface,
    '--cream-3': colors.softAlt,
    '--sand': colors.section,
    '--soft-beige': colors.soft,
    '--beige-card': colors.surface,
    '--camel': colors.accent,
    '--camel-2': colors.accentSoft,
    '--camel-dark': colors.accentDark,
    '--gold': colors.accent,
    '--brown': colors.brown,
    '--deep-brown': colors.text,
    '--black': colors.black,
    '--red-brown': colors.danger,
    '--muted': colors.muted,
    '--line': `rgba(${textRgb}, 0.12)`,
    '--line-strong': `rgba(${textRgb}, 0.2)`,
    '--danger': colors.danger,
    '--success': colors.success,
    '--warning': colors.accentDark
  };
}
