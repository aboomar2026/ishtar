import type { Metadata } from 'next';
import { brand } from './brand';
import { publicSiteUrl } from './site-url';

type SeoEnvironment = { SEO_NOINDEX?: string; CONTEXT?: string };

export function isIndexingEnabled(site = publicSiteUrl(), env: SeoEnvironment = { SEO_NOINDEX: process.env.SEO_NOINDEX, CONTEXT: process.env.CONTEXT }): boolean {
  return Boolean(site && env.SEO_NOINDEX !== 'true' &&
    !['deploy-preview', 'branch-deploy', 'dev'].includes(env.CONTEXT ?? ''));
}

export function catalogPath(kind: 'product' | 'category', slug: string): string {
  return `/${kind}/${encodeURIComponent(slug)}`;
}

export function absoluteUrl(path: string, site = publicSiteUrl()): string | undefined {
  if (!site) return undefined;
  try {
    const url = new URL(path, site);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

export function plainDescription(value: string | undefined, fallback = brand.seo.description): string {
  return (value?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || fallback).slice(0, 180);
}

export function buildPageMetadata({ title, description, path, image, noindex = false }: {
  title: string; description?: string; path: string; image?: string; noindex?: boolean;
}): Metadata {
  const url = absoluteUrl(path);
  const summary = plainDescription(description);
  const preview = absoluteUrl(image || (brand.key === 'ishtar' ? '/brand/ishtar/social-preview.png' : brand.assets.appleTouchIcon || '/icon.svg'));
  return {
    title, description: summary,
    alternates: url ? { canonical: url } : undefined,
    robots: { index: !noindex && isIndexingEnabled(), follow: true, googleBot: { index: !noindex && isIndexingEnabled(), follow: true, 'max-image-preview': 'large' } },
    openGraph: { title, description: summary, url, siteName: brand.englishName, locale: 'ar_PS', type: 'website', images: preview ? [{ url: preview, alt: title }] : [] },
    twitter: { card: 'summary_large_image', title, description: summary, images: preview ? [preview] : [] }
  };
}

export function categorySeoPath(slug: string, page: number): string {
  const path = catalogPath('category', slug);
  return page > 1 ? `${path}?page=${page}` : path;
}

export function hasCatalogFacets(params: Record<string, string | string[] | undefined>): boolean {
  return ['q', 'sort', 'availability', 'minPrice', 'maxPrice'].some((key) => {
    const value = params[key];
    return Array.isArray(value) ? value.some((item) => item.trim()) : Boolean(value?.trim());
  });
}

// CMS text must never be able to close the JSON-LD script element.
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
