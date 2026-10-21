import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { publicSiteUrl } from '@/lib/site-url';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = publicSiteUrl();
  if (!site) return [];
  const [categories, products] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, select: { slug: true } }),
    prisma.product.findMany({ where: { status: 'ACTIVE', category: { isActive: true } }, select: { slug: true, updatedAt: true }, take: 49000 })
  ]);
  return [{ url: site.href }, ...['all','new-in','sale',...categories.map((c) => c.slug)].map((slug) => ({ url: new URL(`/category/${encodeURIComponent(slug)}`, site).href })), ...products.map((product) => ({ url: new URL(`/product/${encodeURIComponent(product.slug)}`, site).href, lastModified: product.updatedAt }))];
}
