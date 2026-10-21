import { z } from 'zod';

export const BANNER_PLACEMENTS = ['HOME_HERO', 'HOME_PROMO', 'CATEGORY_TOP'] as const;

function isValidUrlOrPath(value: string): boolean {
  if (value.startsWith('/') || value.startsWith('#')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const optionalUrl = z
  .union([
    z.string().trim().refine(isValidUrlOrPath, 'Enter a valid URL or a path starting with / or #'),
    z.literal('').transform(() => undefined)
  ])
  .optional();

const optionalDate = z
  .union([z.string().trim(), z.literal('')])
  .optional()
  .transform((value) => {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  });

export const bannerInputSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(160, 'Title is too long'),
    subtitle: optionalText,
    eyebrow: optionalText,
    imageUrl: optionalUrl,
    cloudinaryPublicId: optionalText,
    href: optionalUrl,
    ctaLabel: optionalText,
    placement: z.enum(BANNER_PLACEMENTS),
    sortOrder: z.coerce.number().int('Sort order must be a whole number').min(0, 'Sort order must be ≥ 0').default(0),
    isActive: z.boolean().default(true),
    startsAt: optionalDate,
    endsAt: optionalDate
  })
  .superRefine((data, ctx) => {
    if (data.startsAt && data.endsAt && data.endsAt < data.startsAt) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'End date must be after start date', path: ['endsAt'] });
    }
  });

export type BannerInput = z.input<typeof bannerInputSchema>;
export type BannerParsed = z.output<typeof bannerInputSchema>;
