import { z } from 'zod';

const slug = z.string().min(1).max(120).regex(/^[\p{Letter}\p{Number}]+(?:-[\p{Letter}\p{Number}]+)*$/u);
export const catalogImportSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug,
  description: z.string().trim().min(10).max(6000),
  details: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  brand: z.string().trim().max(100).optional(),
  basePrice: z.number().positive().max(10000),
  quantity: z.number().int().min(0).max(10000),
  sku: z.string().regex(/^IS-P\d{3}$/),
  isFeatured: z.boolean().default(false),
  category: z.object({name: z.string().min(2).max(100), slug, description: z.string().min(10).max(1000)}),
  images: z.array(z.object({
    mime: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
    base64: z.string().min(100).max(4_000_000).regex(/^[A-Za-z0-9+/]+={0,2}$/),
    alt: z.string().min(2).max(200)
  })).min(1).max(3)
});
