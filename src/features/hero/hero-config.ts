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
export const heroSettingsSchema = z.object({
  layout: z.enum(['classic', 'signature', 'campaign']).default('classic'),
  motion: z.enum(['calm', 'lively', 'none']).default('calm'),
  transition: z.enum(['slide', 'fade']).default('slide'),
  autoplay: z.boolean().default(false),
  interval: z.number().int().min(5).max(12).default(7),
  media: z.record(z.string().max(200), z.object({
    mobileImageUrl: imagePath.default(''),
    focus: z.enum(['center', 'top', 'bottom', 'left', 'right']).default('center')
  })).default({})
});
export type HeroSettings = z.infer<typeof heroSettingsSchema>;
export const DEFAULT_HERO_SETTINGS: HeroSettings = heroSettingsSchema.parse({});
export function parseHeroSettings(input: unknown): HeroSettings {
  const result = heroSettingsSchema.safeParse(input);
  return result.success ? result.data : { ...DEFAULT_HERO_SETTINGS, media: {} };
}
export function heroHref(href?: string): string {
  if (href && /^\/(?!\/)/.test(href) && !href.includes('\\')) return href;
  try { if (href && new URL(href).protocol === 'https:') return href; } catch { /* use storefront fallback */ }
  return '/category/new-in';
}
