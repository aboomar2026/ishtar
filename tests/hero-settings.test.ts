import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { getHeroContent } from '../src/features/hero/hero-content';
import { heroSettingsSchema, parseHeroSettings, heroHref } from '../src/features/hero/hero-config';

function mockModule(id: string, exports: unknown) {
  const filename = require.resolve(id);
  require.cache[filename] = { id: filename, filename, loaded: true, exports } as NodeModule;
}

test('hero settings reject invalid controls and unsafe media/links', () => {
  assert.equal(parseHeroSettings({}).layout, 'classic');
  assert.equal(parseHeroSettings({ layout: 'unknown' }).layout, 'classic');
  for (const interval of [0, 4, 13, 7.5]) assert.equal(heroSettingsSchema.safeParse({ interval }).success, false);
  for (const mobileImageUrl of ['javascript:alert(1)', '//other.example/image', '/\\evil', 'http://example.com/a.jpg']) {
    assert.equal(heroSettingsSchema.safeParse({ media: { a: { mobileImageUrl } } }).success, false);
  }
  assert.equal(heroHref('javascript:alert(1)'), '/category/new-in');
  assert.equal(heroHref('//other.example'), '/category/new-in');
  assert.equal(heroHref('/category/gifts'), '/category/gifts');
  assert.equal(heroHref('https://example.com/sale'), 'https://example.com/sale');
});

test('admin-only settings persist across database reads and template changes', { timeout: 60000 }, async t => {
  const db = new PGlite();
  const socket = new PGLiteSocketServer({ db, host: '127.0.0.1', port: 0, maxConnections: 5 });
  await socket.start();
  t.after(async () => { await socket.stop(); await db.close(); });
  const address = socket.getServerConn();
  process.env.DATABASE_URL = `${address.startsWith('postgres') ? address : `postgresql://postgres:test@${address}/postgres`}?connection_limit=1&sslmode=disable`;
  let authorized = false;
  const paths: string[] = [];
  const tags: string[] = [];
  mockModule('../src/features/admin/auth/admin-auth', { requireAdmin: async () => { if (!authorized) throw new Error('unauthorized'); } });
  mockModule('next/cache', { revalidatePath: (path: string) => paths.push(path), updateTag: (tag: string) => tags.push(tag), unstable_cache: (reader: unknown) => reader });
  const { prisma } = await import('../src/lib/prisma');
  t.after(() => prisma.$disconnect());
  const { getHeroSettings } = await import('../src/features/hero/hero.queries');
  const { saveHeroSettingsAction } = await import('../src/features/hero/hero.actions');
  assert.equal((await getHeroSettings()).layout, 'classic');
  const sql = readFileSync('prisma/additive/hero-settings.sql', 'utf8');
  await db.exec(sql);
  await db.exec(sql);
  await assert.rejects(saveHeroSettingsAction({ layout: 'signature' }), /unauthorized/);
  assert.equal(await prisma.heroSettings.count(), 0);
  authorized = true;
  assert.equal((await saveHeroSettingsAction({ layout: 'invalid' })).ok, false);
  assert.equal(await prisma.heroSettings.count(), 0);
  const classic = getHeroContent(parseHeroSettings({}), 'classic', [], []);
  const signature = { ...classic, banners: [{ ...classic.banners[0], title: 'محتوى المميز المستقل' }] };
  const profiles = { classic, signature };
  const media = { 'banner-a': { mobileImageUrl: 'https://example.com/mobile.jpg', focus: 'top' as const } };
  for (const layout of ['signature', 'campaign', 'classic'] as const) {
    assert.equal((await saveHeroSettingsAction({ layout, profiles, mode: 'rotate', media, motion: 'lively', autoplay: true, interval: 7 })).ok, true);
    const saved = await getHeroSettings();
    assert.equal(saved.layout, layout);
    assert.deepEqual(saved.media, media);
    assert.equal(saved.mode, 'rotate');
    assert.deepEqual(saved.profiles, profiles);
  }
  assert.equal(await prisma.heroSettings.count(), 1);
  assert.deepEqual(tags, Array(3).fill('public-hero-settings'));
  assert.deepEqual([...new Set(paths)].sort(), ['/', '/admin/banners']);
});

test('template profiles validate all admin URLs and keep separate content', () => {
  const base = parseHeroSettings({});
  assert.equal(base.mode, 'rotate');
  assert.equal(parseHeroSettings({ mode: 'fixed' }).mode, 'fixed');
  const original = getHeroContent(base, 'classic', [], []);
  const signature = { ...original, banners: [{ ...original.banners[0], title: 'عنوان خاص بالمميز' }] };
  const saved = heroSettingsSchema.parse({ profiles: { signature } });
  assert.equal(getHeroContent(saved, 'signature', [], []).banners[0].title, 'عنوان خاص بالمميز');
  assert.equal(getHeroContent(saved, 'classic', [], []).banners[0].title, original.banners[0].title);
  for (const field of ['href', 'imageUrl', 'mobileImageUrl']) {
    assert.equal(heroSettingsSchema.safeParse({ profiles: { classic: { ...original, banners: [{ ...original.banners[0], [field]: 'javascript:alert(1)' }] } } }).success, false);
  }
  assert.equal(heroSettingsSchema.safeParse({ mode: 'random' }).success, false);
  assert.equal(heroSettingsSchema.safeParse({ profiles: { campaign: { ...original, banners: [] } } }).success, false);
  assert.equal(heroSettingsSchema.safeParse({ profiles: { campaign: { ...original, banners: Array(5).fill(original.banners[0]) } } }).success, false);
});
