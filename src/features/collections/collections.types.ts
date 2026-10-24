import { z } from "zod";
export const symbols = ["sparkle", "gift", "heart", "flower", "bag"] as const;
export const tones = ["rose", "sand", "sage"] as const;
export const imageSource = z
  .string()
  .max(2000)
  .refine(
    (value) =>
      !value || /^\/(?!\/)/u.test(value) || /^https:\/\//iu.test(value),
    "استخدمي صورة محلية أو رابط HTTPS",
  );
export const collectionInput = z
  .object({
    id: z.string().max(100).optional(),
    version: z.string().datetime().optional(),
    name: z.string().trim().min(2).max(80),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .regex(
        /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u,
        "الرابط يقبل حروفاً وأرقاماً وشرطة بين الكلمات",
      ),
    description: z.string().trim().max(500),
    imageUrl: imageSource,
    symbol: z.enum(symbols),
    tone: z.enum(tones),
    keywords: z.array(z.string().trim().min(1).max(60)).max(20),
    isActive: z.boolean(),
    showOnHome: z.boolean(),
    sortOrder: z.number().int().min(0).max(9999),
    productIds: z
      .array(z.string().min(1).max(100))
      .max(200)
      .refine((ids) => new Set(ids).size === ids.length),
  })
  .refine(
    (data) => !data.isActive || data.productIds.length > 0,
    "أضيفي منتجات قبل نشر المجموعة",
  );
export type CollectionInput = z.infer<typeof collectionInput>;
export type CollectionCardData = {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  symbol: string;
  tone: string;
  images: string[];
  productCount: number;
};
export type ProductOption = {
  id: string;
  name: string;
  image: string;
  price: number;
  status: string;
};
export type CollectionEditorData = CollectionInput & {
  id: string;
  version: string;
};
