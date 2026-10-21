type SiteUrlEnvironment = {
  NEXT_PUBLIC_SITE_URL?: string;
  URL?: string;
  NODE_ENV?: string;
};

export function resolvePublicSiteUrl(env: SiteUrlEnvironment): URL | undefined {
  for (const configured of [env.NEXT_PUBLIC_SITE_URL, env.URL]) {
    if (!configured?.trim()) continue;
    try {
      const url = new URL(configured.trim());
      const hostname = url.hostname.toLowerCase();
      const local = hostname === 'localhost' || hostname.endsWith('.localhost') ||
        hostname.startsWith('127.') || hostname === '[::1]' || hostname === '0.0.0.0';
      if (url.username || url.password) continue;
      if (env.NODE_ENV === 'production' && (url.protocol !== 'https:' || local)) continue;
      if (url.protocol === 'https:' || url.protocol === 'http:') return new URL(url.origin);
    } catch { /* Try the deployment URL if the configured origin is invalid. */ }
  }
  return undefined;
}

export function publicSiteUrl(): URL | undefined {
  return resolvePublicSiteUrl({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    URL: process.env.URL,
    NODE_ENV: process.env.NODE_ENV
  });
}
