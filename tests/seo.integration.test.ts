import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

// This suite requires npm run build. It never connects to a supplied DATABASE_URL.
test('SEO rendered by production Next with a disposable catalogue', { timeout: 90000 }, async (t) => {
  const db = new PGlite();
  await db.exec(execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8' }));
  const socket = new PGLiteSocketServer({ db, host: '127.0.0.1', port: 0, maxConnections: 5 });
  await socket.start();
  const address = socket.getServerConn();
  const connection = address.startsWith('postgres') ? address : `postgresql://postgres:test@${address}/postgres`;
  process.env.DATABASE_URL = `${connection}${connection.includes('?') ? '&' : '?'}connection_limit=1&sslmode=disable`;
  const { prisma } = await import('../src/lib/prisma');
  let server: ReturnType<typeof spawn> | undefined = undefined;
  t.after(async () => {
    server?.kill('SIGTERM');
    if (server && server.exitCode === null) await new Promise((resolve) => server!.once('exit', resolve));
    await prisma.$disconnect();
    // pglite-socket schedules connection cleanup with setImmediate. Drain it before closing WASM.
    await new Promise<void>((resolve) => setImmediate(resolve));
    await socket.stop();
    await new Promise<void>((resolve) => setImmediate(resolve));
    await db.close();
  });
  await prisma.category.createMany({ data: [
    { id: 'visible', name: 'حقائب', slug: 'bags' }, { id: 'empty', name: 'فارغ', slug: 'empty' },
    { id: 'hidden', name: 'مخفي', slug: 'hidden', isActive: false }
  ] });
  for (let i = 0; i < 49; i++) await prisma.product.create({ data: {
    name: `حقيبة ${i}`, slug: `bag-${i}`, description: 'حقيبة يومية جميلة', categoryId: 'visible', status: 'ACTIVE', basePrice: 999,
    isFeatured: true, isNewArrival: true,
    images: { create: { url: 'https://images.example.invalid/bag.jpg', alt: 'حقيبة', isPrimary: true } },
    variants: { create: { sku: `BAG-${i}`, price: 25, quantity: 3 } }
  } });
  for (const [slug, categoryId, status] of [['draft', 'visible', 'DRAFT'], ['archived', 'visible', 'ARCHIVED'], ['hidden-product', 'hidden', 'ACTIVE']] as const) await prisma.product.create({ data: { name: slug, slug, categoryId, status, basePrice: 5, description: 'Not public' } });
  const members = await prisma.product.findMany({ where: { categoryId: 'visible', status: 'ACTIVE' }, select: { id: true } });
  await prisma.collection.create({ data: {
    isActive: true, name: 'مجموعة الحقائب', slug: 'bags-collection', description: 'حقائب مختارة',
    products: { create: members.slice(0, 25).map(product => ({ productId: product.id })) }
  } });
  await prisma.collection.createMany({ data: Array.from({ length: 101 }, (_, index) => ({
    isActive: true, id: `collection-${index}`, name: `Collection ${index}`, slug: `extra-collection-${index}`, sortOrder: index + 1,
  })) });
  await prisma.collectionProduct.createMany({ data: Array.from({ length: 101 }, (_, index) => ({
    collectionId: `collection-${index}`, productId: members[0].id,
  })) });
  await prisma.$disconnect();
  await db.exec('DEALLOCATE ALL');
  let origin = ''; let output = '';
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '0'], {
    env: { ...process.env, NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://ishtar-qa.example.invalid', NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout?.on('data', (chunk) => { output += String(chunk); const match = output.match(/http:\/\/127\.0\.0\.1:\d+/); if (match) origin = match[0]; });
  server.stderr?.on('data', (chunk) => { output += String(chunk); });
  for (let i = 0; i < 100; i++) {
    if (origin) { try { if ((await fetch(`${origin}/cart`)).status === 200) break; } catch { /* Startup */ } }
    if (server.exitCode !== null) throw new Error(output);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(origin, output);
  const get = (path: string) => fetch(`${origin}${path}`, { headers: { 'User-Agent': 'Twitterbot/1.0' } });
  const canonical = (html: string) => html.match(/<link rel="canonical" href="([^"]+)"/g) ?? [];
  await t.test('home, product, category and pagination have exactly one correct canonical', async () => {
    for (const [path, suffix] of [['/', ''], ['/product/bag-0?utm_source=ad', '/product/bag-0'], ['/category/bags?page=1', '/category/bags'], ['/category/bags?page=2&utm_source=ad', '/category/bags?page=2'], ['/collections', '/collections'], ['/collections/bags-collection', '/collections/bags-collection'], ['/collections/bags-collection?page=2&utm_source=ad', '/collections/bags-collection?page=2']]) {
      const response = await get(path); assert.equal(response.status, 200);
      const html = await response.text();
      assert.deepEqual(canonical(html), [`<link rel="canonical" href="https://ishtar-qa.example.invalid${suffix}"`]);
      assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1);
      assert.match(html, process.env.SEO_TEST_PREVIEW === 'true' ? /<meta name="robots" content="noindex/ : /<meta name="robots" content="index/);
      assert.match(html, /<meta name="twitter:card" content="summary_large_image"/);
    }
  });
  await t.test('collection metadata matches its page, image fallback and breadcrumb structure', async () => {
    const html = await (await get('/collections/bags-collection?page=2')).text();
    assert.match(html, /property="og:url" content="https:\/\/ishtar-qa.example.invalid\/collections\/bags-collection\?page=2"/);
    assert.match(html, /property="og:image" content="https:\/\/images.example.invalid\/bag.jpg"/);
    const data = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(match => JSON.parse(match[1]));
    const breadcrumbs = data.find(item => item['@type'] === 'BreadcrumbList');
    assert.equal(breadcrumbs.itemListElement[2].item, 'https://ishtar-qa.example.invalid/collections/bags-collection?page=2');
    const response = await fetch(`${origin}/collections/bags-collection?page=999`, { redirect: 'manual' });
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), '/collections/bags-collection?page=2');
  });
  await t.test('server HTML contains actual offers, breadcrumbs, stock and ILS', async () => {
    const html = await (await get('/product/bag-0')).text();
    const data = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
    const product = data.find((item) => item['@type'] === 'Product');
    assert.ok(product); assert.equal(product.offers[0].price, '25.00'); assert.equal(product.offers[0].priceCurrency, 'ILS');
    assert.equal(product.offers[0].availability, 'https://schema.org/InStock'); assert.equal(product.aggregateRating, undefined);
    assert.equal(data.find((item) => item['@type'] === 'BreadcrumbList').itemListElement.length, 3);
  });
  await t.test('empty/faceted and private utility pages expose noindex to crawlers', async () => {
    for (const path of ['/category/empty', '/category/bags?minPrice=10', '/category/bags?maxPrice=30', '/category/bags?q=bag', '/category/bags?sort=newest', '/cart', '/checkout', '/track-order', '/order-success', '/admin/login']) {
      const html = await (await get(path)).text();
      assert.match(html, /<meta name="robots" content="[^"]*noindex/, path);
      assert.doesNotMatch(html, /<meta name="googlebot" content="index,/, path);
    }
  });
  await t.test('draft, archived, inactive-category, missing and out-of-range pages return 404', async () => {
    for (const path of ['/product/draft', '/product/archived', '/product/hidden-product', '/product/missing', '/category/missing', '/category/bags?page=999']) {
      const response = await get(path); assert.equal(response.status, 404, path);
    }
  });
  await t.test('sitemap includes public products/images and paginated categories only', async () => {
    const response = await get('/sitemap.xml'); assert.equal(response.status, 200);
    const xml = await response.text();
    if (process.env.SEO_TEST_PREVIEW === 'true') { assert.doesNotMatch(xml, /<loc>/); return; }
    assert.match(xml, /\/category\/bags\?page=2<\/loc>/);
    assert.match(xml, /\/product\/bag-24<\/loc>/);
    assert.match(xml, /\/collections\/bags-collection\?page=2<\/loc>/);
    assert.match(xml, /\/collections\/extra-collection-100<\/loc>/);
    assert.match(xml, /<image:loc>https:\/\/images.example.invalid\/bag.jpg<\/image:loc>/);
    for (const excluded of ['draft', 'archived', 'hidden-product', '/category/hidden', '/category/empty', '/category/sale', '/cart', '/checkout']) assert.ok(!xml.includes(excluded), excluded);
  });
  await t.test('robots advertises canonical sitemap and permits reading utility noindex', async () => {
    const text = await (await get('/robots.txt')).text();
    if (process.env.SEO_TEST_PREVIEW === 'true') { assert.ok(!text.includes('Sitemap:')); return; }
    assert.match(text, /Sitemap: https:\/\/ishtar-qa.example.invalid\/sitemap.xml/);
    assert.ok(!text.includes('Disallow: /cart'));
  });
});
