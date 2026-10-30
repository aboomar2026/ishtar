import { z } from 'zod';
const sku = z.string().regex(/^IS-P\d{3}$/);
const slug = z.string().min(2).max(120).regex(/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u);
export const productEnrichment = z.object({
  mode: z.literal('product'), sku, expectedVersion: z.string().datetime(),
  name: z.string().min(2).max(160), subtitle: z.string().min(5).max(240),
  description: z.string().min(20).max(6000), details: z.array(z.string().min(2).max(350)).min(2).max(20),
  brand: z.string().max(100).nullable(), careInstructions: z.string().min(10).max(1800),
  tags: z.array(z.string().min(2).max(60)).min(2).max(15),
  categorySlug: slug,
  complementSkus: z.array(sku).min(2).max(8),
  salePrice: z.number().positive().optional(), expectedRegularPrice: z.number().positive().optional()
}).superRefine((value, ctx) => {
  if (value.complementSkus.includes(value.sku) || new Set(value.complementSkus).size !== value.complementSkus.length) ctx.addIssue({code:'custom',path:['complementSkus'],message:'المنتجات المكملة يجب أن تكون مختلفة عن المنتج وغير مكررة.'});
  if ((value.salePrice === undefined) !== (value.expectedRegularPrice === undefined) || (value.salePrice !== undefined && value.salePrice >= value.expectedRegularPrice!)) ctx.addIssue({code:'custom',path:['salePrice'],message:'سعر العرض يجب أن يكون أقل من السعر الحالي المعتمد.'});
});
export const collectionEnrichment = z.object({
  mode: z.literal('collection'), slug, name: z.string().min(2).max(80), description: z.string().min(15).max(500),
  expectedVersion: z.string().datetime().nullable(),
  coverSku: sku, memberSkus: z.array(sku).min(1).max(200),
  symbol: z.enum(['sparkle','gift','heart','flower','bag']), tone:z.enum(['rose','sand','sage']),
  showOnHome:z.boolean(), sortOrder:z.number().int().min(0).max(9999), keywords:z.array(z.string().min(2).max(60)).max(20)
}).refine(value=>new Set(value.memberSkus).size===value.memberSkus.length && value.memberSkus.includes(value.coverSku),'صورة المجموعة يجب أن تكون من أحد منتجاتها.');
export const enrichmentSchema = z.discriminatedUnion('mode',[productEnrichment,collectionEnrichment]);
