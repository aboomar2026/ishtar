import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePublicSiteUrl } from '../src/lib/site-url';

test('deployed order links use the configured origin without duplicate paths', () => {
  const origin = resolvePublicSiteUrl({ NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: ' https://ishtar-store.netlify.app/old-path/ ' });
  assert.equal(new URL('/admin/orders/order123', origin).href, 'https://ishtar-store.netlify.app/admin/orders/order123');
});

test('Netlify main URL replaces missing, invalid or local production configuration', () => {
  for (const value of [undefined, '', 'not-a-url', 'http://localhost:3000', 'https://localhost', 'https://127.0.0.1', 'https://[::1]', 'https://shop.localhost', 'https://user:password@example.com']) {
    assert.equal(resolvePublicSiteUrl({ NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: value, URL: 'https://deployed.netlify.app/' })?.origin, 'https://deployed.netlify.app');
  }
});

test('explicit production domain takes precedence over Netlify domain', () => {
  assert.equal(resolvePublicSiteUrl({ NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://ishtar.example', URL: 'https://fallback.netlify.app' })?.origin, 'https://ishtar.example');
});

test('production without a valid origin never fabricates a localhost link', () => {
  for (const value of [undefined, 'http://localhost:3000', 'https://localhost', 'ftp://example.com', 'http://public.example']) {
    assert.equal(resolvePublicSiteUrl({ NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: value }), undefined);
  }
});

test('explicit local development origin remains supported', () => {
  assert.equal(resolvePublicSiteUrl({ NODE_ENV: 'development', NEXT_PUBLIC_SITE_URL: 'http://localhost:3000' })?.origin, 'http://localhost:3000');
});
