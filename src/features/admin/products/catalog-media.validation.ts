import { z } from 'zod';
export const catalogMediaSchema = z.object({
  mode: z.literal('media'), sku: z.string().regex(/^IS-P\d{3}$/),
  expectedPrimaryImageId: z.string().min(1).max(100), alt: z.string().trim().min(2).max(200),
  mime: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  base64: z.string().min(100).max(2_600_000).regex(/^[A-Za-z0-9+/]+={0,2}$/)
});
export type CatalogMediaInput = z.infer<typeof catalogMediaSchema>;
