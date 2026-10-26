import { getCollections } from '@/features/collections/collections.queries';
import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { absoluteUrl, categorySeoPath, catalogPath, isIndexingEnabled } from '@/lib/seo';
import { getProductsByCategorySlug } from '@/features/catalog/catalog.queries';
import { virtualCategories } from '@/features/catalog/catalog.utils';

export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isIndexingEnabled()) return [];
  const [categories, products, collections] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, select: { slug: true } }),
    prisma.product.findMany({ where: { status: 'ACTIVE', category: { isActive: true } }, select: {
      slug: true, updatedAt: true, images: { select: { url: true, updatedAt: true } },
      variants: { select: { updatedAt: true } }
    } }),
    getCollections({ limit: 100 })
  ]);
  const entries: MetadataRoute.Sitemap = [{ url: absoluteUrl('/')! }];
  entries.push({ url: absoluteUrl('/collections')! }, ...collections.map(collection => ({ url: absoluteUrl(`/collections/${encodeURIComponent(collection.slug)}`)! })));
  const slugs = new Set([...Object.keys(virtualCategories), ...categories.map((category) => category.slug)]);
  // Use the storefront's exact sale/availability rules; empty categories must not be submitted.
  for (const slug of slugs) {
    const result = await getProductsByCategorySlug(slug);
    if (!result?.total) continue;
    for (let page = 1; page <= result.pageCount; page++) entries.push({ url: absoluteUrl(categorySeoPath(slug, page))! });
  }
  for (const product of products) entries.push({
    url: absoluteUrl(catalogPath('product', product.slug))!,
    lastModified: new Date(Math.max(product.updatedAt.getTime(), ...product.images.map((image) => image.updatedAt.getTime()), ...product.variants.map((variant) => variant.updatedAt.getTime()))),
    images: [...new Set(product.images.map((image) => absoluteUrl(image.url)).filter((url): url is string => Boolean(url)))]
  });
  // Never silently truncate submitted products. Split into child sitemaps before this scale.
  if (entries.length > 50000) throw new Error('Catalogue exceeds one sitemap: configure partitioned sitemaps.');
  return entries;
}
