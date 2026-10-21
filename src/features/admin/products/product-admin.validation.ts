import { z } from 'zod';

export const PRODUCT_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;

/** Accept absolute http(s) URLs or root-relative paths (e.g. /mock-products/x.svg). */
function isValidImageUrl(value: string): boolean {
  if (value.startsWith('/')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const slugSchema = z
  .string()
  .trim()
  .min(1, 'Slug is required')
  .max(120, 'Slug is too long')
  .regex(/^[\p{Letter}\p{Number}]+(?:-[\p{Letter}\p{Number}]+)*$/u, 'Use lowercase letters, numbers and dashes only');

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export const variantInputSchema = z.object({
  id: z.string().optional(),
  sku: z.string().trim().min(1, 'رقم SKU مطلوب').max(64, 'رقم SKU طويل جداً'),
  colorName: optionalText,
  // If colorValue is provided, it must be a valid 6-digit hex colour.
  colorValue: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine(
      (v) => !v || HEX_PATTERN.test(v),
      'أدخل كود لون صحيح مثل #111827'
    ),
  size: optionalText,
  price:         z.coerce.number().min(0, 'السعر غير صالح'),
  compareAtPrice: z
    .union([z.coerce.number().min(0, 'السعر قبل الخصم غير صالح'), z.literal('').transform(() => undefined)])
    .optional(),
  quantity:          z.coerce.number().int('الكمية يجب أن تكون رقماً صحيحاً').min(0, 'الكمية لا يمكن أن تكون أقل من صفر'),
  lowStockThreshold: z.coerce.number().int('الحد يجب أن يكون رقماً صحيحاً').min(0, 'الحد لا يمكن أن يكون أقل من صفر'),
  isActive: z.boolean()
});

export const imageInputSchema = z.object({
  id: z.string().optional(),
  url: z.string().trim().min(1, 'Image URL is required').refine(isValidImageUrl, 'Enter a valid URL or a path starting with /'),
  alt: optionalText,
  sortOrder: z.coerce.number().int().min(0).default(0),
  isPrimary: z.boolean().default(false),
  cloudinaryPublicId: optionalText
});

export const productInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(160, 'Name is too long'),
    slug: slugSchema,
    subtitle: optionalText,
    description: z.string().trim().min(1, 'Description is required'),
    details: z.array(z.string().trim()).optional().default([]),
    careInstructions: optionalText,
    brand: optionalText,
    categoryId: z.string().trim().min(1, 'Category is required'),
    basePrice: z.coerce.number().min(0, 'Base price must be ≥ 0'),
    compareAtPrice: z
      .union([z.coerce.number().min(0, 'Compare-at price must be ≥ 0'), z.literal('').transform(() => undefined)])
      .optional(),
    status: z.enum(PRODUCT_STATUSES),
    isFeatured: z.boolean().default(false),
    isNewArrival: z.boolean().default(false),
    isBestSeller: z.boolean().default(false),
    tags: z.array(z.string().trim().min(1)).default([]),
    images: z.array(imageInputSchema).default([]),
    variants: z.array(variantInputSchema).default([])
  })
  .superRefine((data, ctx) => {
    // 1 — Unique SKUs within the form
    const skuSeen = new Map<string, number>();
    data.variants.forEach((variant, index) => {
      const key = variant.sku.trim().toLowerCase();
      if (skuSeen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `رقم SKU مكرر "${variant.sku}"`,
          path: ['variants', index, 'sku']
        });
      } else {
        skuSeen.set(key, index);
      }
    });

    // 2 — No duplicate active color + size combos
    const comboSeen = new Map<string, number>();
    data.variants.forEach((variant, index) => {
      if (!variant.isActive) return; // inactive combos are fine to duplicate
      const colorKey = (variant.colorValue ?? variant.colorName ?? '').trim().toLowerCase();
      const sizeKey  = (variant.size ?? '').trim().toLowerCase();
      const combo    = `${colorKey}||${sizeKey}`;
      if (comboSeen.has(combo)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'لا يمكن تكرار نفس اللون والمقاس أكثر من مرة في الخيارات النشطة',
          path: ['variants', index, 'size']
        });
      } else {
        comboSeen.set(combo, index);
      }
    });

    // 3 — Exactly one primary image (if any)
    const primaryCount = data.images.filter((image) => image.isPrimary).length;
    if (data.images.length > 0 && primaryCount > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Only one image can be primary',
        path: ['images']
      });
    }

    // 4 — ACTIVE products must have at least one active variant
    if (data.status === 'ACTIVE' && !data.variants.some((variant) => variant.isActive)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'يجب أن يحتوي المنتج النشط على خيار واحد نشط على الأقل',
        path: ['status']
      });
    }
  });

export type ProductInput = z.input<typeof productInputSchema>;
export type ProductParsed = z.output<typeof productInputSchema>;
export type VariantInput = z.input<typeof variantInputSchema>;
export type ImageInput = z.input<typeof imageInputSchema>;
