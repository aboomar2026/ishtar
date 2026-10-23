import { z } from 'zod';

export const HERO_LAYOUTS = [
  { value: 'classic', title: 'الكلاسيكي', description: 'نص واضح وكولاج منتجات على خلفية كريمية.' },
  { value: 'signature', title: 'عشتار المميّز', description: 'مشهد عنابي وصورة رئيسية وبطاقات متدرجة الحركة.' },
  { value: 'campaign', title: 'سلايدر الحملات', description: 'بنرات الواجهة مرتبة، مع السحب والتنقل بين الحملات.' }
] as const;
const imagePath = z.string().max(2000).refine((value) => {
  if (!value) return true;
  if (/^\/(?!\/)/.test(value)) return !value.includes('\\');
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}, 'استخدم رابط صورة HTTPS أو مساراً محلياً');
const linkPath = z.string().max(2000).refine(value => !value || (/^\/(?!\/)/.test(value) && !value.includes('\\')) || (() => { try { return new URL(value).protocol === 'https:'; } catch { return false; } })(), 'استخدم رابط HTTPS أو مساراً داخل المتجر');
export const heroContentSchema = z.object({
  banners: z.array(z.object({
    title: z.string().trim().min(1).max(180), subtitle: z.string().max(600), eyebrow: z.string().max(100),
    ctaLabel: z.string().trim().min(1).max(80), href: linkPath, imageUrl: imagePath,
    mobileImageUrl: imagePath, focus: z.enum(['center', 'top', 'bottom', 'left', 'right'])
  })).min(1).max(4),
  products: z.array(z.object({ name: z.string().trim().min(1).max(100), image: imagePath, href: linkPath })).max(2),
  secondaryLabel: z.string().max(100), secondaryHref: linkPath,
  trustItems: z.array(z.string().max(100)).max(3)
});
export type HeroContent = z.infer<typeof heroContentSchema>;
export type HeroLayout = 'classic' | 'signature' | 'campaign';
export const HERO_ROTATION_MS = 60_000;
export function nextHeroLayout(layout: HeroLayout): HeroLayout {
  return HERO_LAYOUTS[(HERO_LAYOUTS.findIndex(item => item.value === layout) + 1) % HERO_LAYOUTS.length].value;
}
export const heroSettingsSchema = z.object({
  layout: z.enum(['classic', 'signature', 'campaign']).default('classic'),
  mode: z.enum(['fixed', 'rotate']).default('rotate'),
  profiles: z.object({ classic: heroContentSchema.optional(), signature: heroContentSchema.optional(), campaign: heroContentSchema.optional() }).default({}),
  copySource: z.enum(['brand', 'banners']).default('brand'),
  motion: z.enum(['calm', 'lively', 'none']).default('calm'),
  transition: z.enum(['slide', 'fade']).default('slide'),
  autoplay: z.boolean().default(true),
  interval: z.number().int().min(5).max(12).default(5),
  media: z.record(z.string().max(200), z.object({
    mobileImageUrl: imagePath.default(''),
    focus: z.enum(['center', 'top', 'bottom', 'left', 'right']).default('center')
  })).default({})
});
export type HeroSettings = z.infer<typeof heroSettingsSchema>;
export const DEFAULT_HERO_SETTINGS: HeroSettings = heroSettingsSchema.parse({});
export function parseHeroSettings(input: unknown): HeroSettings {
  const result = heroSettingsSchema.safeParse(input);
  return result.success ? result.data : { ...DEFAULT_HERO_SETTINGS, media: {}, profiles: {} };
}
export function heroHref(href?: string): string {
  if (href && /^\/(?!\/)/.test(href) && !href.includes('\\')) return href;
  try { if (href && new URL(href).protocol === 'https:') return href; } catch { /* use storefront fallback */ }
  return '/category/new-in';
}
