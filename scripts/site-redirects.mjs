/** Redirect only known public aliases after the custom production origin is configured.
 * Preview/local deployments must remain on their own host for QA.
 */
export function productionDomainRedirects(env) {
  if (env.VERCEL_ENV !== 'production') return [];
  let canonical;
  try { canonical = new URL(env.NEXT_PUBLIC_SITE_URL); } catch { return []; }
  if (canonical.origin !== 'https://www.ishtar.live' || canonical.username || canonical.password) return [];
  return ['ishtarstore.vercel.app', 'ishtar.live'].map(host => ({
    source: '/:path*',
    has: [{ type: 'host', value: host }],
    destination: `${canonical.origin}/:path*`,
    permanent: true,
  }));
}
