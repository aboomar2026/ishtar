import { z } from 'zod';

function isValidImageUrl(value: string): boolean {
  if (value.startsWith('/')) return true;
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

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  slug: z
    .string()
    .trim()
    .min(1, 'Slug is required')
    .max(120, 'Slug is too long')
    .regex(/^[\p{Letter}\p{Number}]+(?:-[\p{Letter}\p{Number}]+)*$/u, 'Use letters, numbers and dashes only'),
  description: optionalText,
  imageUrl: z
    .union([
      z.string().trim().refine(isValidImageUrl, 'Enter a valid URL or a path starting with /'),
      z.literal('').transform(() => undefined)
    ])
    .optional(),
  parentId: z
    .union([z.string().trim(), z.literal('').transform(() => undefined)])
    .optional()
    .transform((value) => (value ? value : undefined)),
  sortOrder: z.coerce.number().int('Sort order must be a whole number').min(0, 'Sort order must be ≥ 0').default(0),
  isActive: z.boolean().default(true)
});

export type CategoryInput = z.input<typeof categoryInputSchema>;
export type CategoryParsed = z.output<typeof categoryInputSchema>;
