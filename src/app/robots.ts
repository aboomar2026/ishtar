import type { MetadataRoute } from 'next';
import { publicSiteUrl } from '@/lib/site-url';
import { isIndexingEnabled } from '@/lib/seo';
export const dynamic = 'force-dynamic';
export default function robots(): MetadataRoute.Robots {
  const site = publicSiteUrl();
  // Preview HTML stays crawlable so noindex is discoverable. This is not access control.
  return { rules: { userAgent: '*', allow: '/', disallow: ['/admin/', '/api/'] },
    sitemap: site && isIndexingEnabled() ? new URL('/sitemap.xml', site).href : undefined };
}
