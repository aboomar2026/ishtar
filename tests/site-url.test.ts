import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePublicSiteUrl } from '../src/lib/site-url';

test('deployed order links use the configured origin without duplicate paths', () => {
  const origin = resolvePublicSiteUrl({ NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: ' https://ishtarstore.online/old-path/ ' });
  assert.equal(new URL('/admin/orders/order123', origin).href, 'https://ishtarstore.online/admin/orders/order123');
});

test('Vercel production URL replaces missing, invalid or local production configuration', () => {
  for (const value of [undefined, '', 'not-a-url', 'http://localhost:3000', 'https://localhost', 'https://127.0.0.1', 'https://[::1]', 'https://shop.localhost', 'https://user:password@example.com']) {
    assert.equal(resolvePublicSiteUrl({ NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: value, VERCEL_PROJECT_PRODUCTION_URL: 'deployed.vercel.app' })?.origin, 'https://deployed.vercel.app');
  }
});

test('explicit production domain takes precedence over Vercel domain', () => {
  assert.equal(resolvePublicSiteUrl({ NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://ishtar.example', VERCEL_PROJECT_PRODUCTION_URL: 'fallback.vercel.app' })?.origin, 'https://ishtar.example');
});

test('production without a valid origin never fabricates a localhost link', () => {
  for (const value of [undefined, 'http://localhost:3000', 'https://localhost', 'ftp://example.com', 'http://public.example']) {
    assert.equal(resolvePublicSiteUrl({ NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: value }), undefined);
  }
});

test('explicit local development origin remains supported', () => {
  assert.equal(resolvePublicSiteUrl({ NODE_ENV: 'development', NEXT_PUBLIC_SITE_URL: 'http://localhost:3000' })?.origin, 'http://localhost:3000');
});

test('Vercel deployment hostname works before a custom domain is configured', () => {
  assert.equal(resolvePublicSiteUrl({ NODE_ENV: 'production', VERCEL_URL: 'ishtar-abc.vercel.app' })?.origin, 'https://ishtar-abc.vercel.app');
  assert.equal(resolvePublicSiteUrl({ NODE_ENV: 'production', VERCEL_PROJECT_PRODUCTION_URL: 'ishtar.vercel.app', VERCEL_URL: 'ishtar-abc.vercel.app' })?.origin, 'https://ishtar.vercel.app');
});
