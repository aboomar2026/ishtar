import type { MetadataRoute } from 'next';
import { publicSiteUrl } from '@/lib/site-url';
export default function robots(): MetadataRoute.Robots {
  const site = publicSiteUrl();
  return { rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/cart', '/checkout', '/track-order', '/order-success'] }, sitemap: site ? new URL('/sitemap.xml', site).href : undefined };
}
