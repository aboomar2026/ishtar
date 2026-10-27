// Production Next HTTP benchmark against a NEW in-memory database only.
// Never reads a supplied DATABASE_URL, sends orders, or contacts Telegram/Cloudinary.
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, statSync, rmSync } from 'node:fs';
import { createHmac, randomBytes } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';

const label = process.argv[2] ?? 'local';
const outputFile = process.argv[3] ?? `/tmp/ishtar-performance-${label}.json`;
const samples = 7;
const db = new PGlite();
let server;
let socket;
let statements = [];
try {
  // Generated LOCAL data cache only; use an idle build (do not run concurrently).
  rmSync('.next/cache/fetch-cache', { recursive: true, force: true });
  await db.exec(execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8' }));
  await db.exec(readFileSync('scripts/sql/ishtar-test-products-100.sql', 'utf8'));
  await db.exec(readFileSync('scripts/sql/ishtar-collections-from-products-100.sql', 'utf8'));
  await db.query(`INSERT INTO "AdminUser" (id,name,email,"passwordHash",role,"isActive","updatedAt") VALUES ('perf-admin','Performance fixture','performance@example.invalid','unused','SUPER_ADMIN',true,NOW())`);
  const { rows: products } = await db.query(`SELECT slug FROM "Product" WHERE status='ACTIVE' ORDER BY id LIMIT 1`);
  const { rows: collections } = await db.query(`SELECT slug FROM "Collection" WHERE "isActive" ORDER BY id LIMIT 1`);
  const { rows: categories } = await db.query(`SELECT slug FROM "Category" WHERE "isActive" ORDER BY id LIMIT 1`);
  // Observe Execute/Simple Query protocol messages, without recording SQL, parameters or rows.
  const original = db.execProtocolRawStream.bind(db);
  db.execProtocolRawStream = async (message, options) => {
    const start = performance.now();
    try { return await original(message, options); }
    finally { if ([69, 81].includes(message[0])) statements.push(performance.now() - start); }
  };
  socket = new PGLiteSocketServer({ db, host: '127.0.0.1', port: 0, maxConnections: 5 });
  await socket.start();
  const address = socket.getServerConn();
  const connection = address.startsWith('postgres') ? address : `postgresql://postgres:test@${address}/postgres`;
  const secret = randomBytes(32).toString('hex');
  const payload = Buffer.from(JSON.stringify({ id: 'perf-admin', email: 'performance@example.invalid', role: 'SUPER_ADMIN', exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url');
  const cookie = `bah_admin_session=${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
  let origin = ''; let logs = '';
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '0'], {
    env: { ...process.env, DATABASE_URL: `${connection}?connection_limit=1&sslmode=disable`, DIRECT_URL: '', ADMIN_SESSION_SECRET: secret,
      NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', ORDER_OUTBOX_ENABLED: 'false', TELEGRAM_BOT_TOKEN: '', TELEGRAM_CHAT_ID: '' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.on('data', chunk => { logs += chunk; origin = logs.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0] ?? ''; });
  server.stderr.on('data', chunk => { logs += chunk; });
  for (let i = 0; i < 100; i++) {
    if (origin) { try { if ((await fetch(`${origin}/cart`)).ok) break; } catch { /* Startup */ } }
    if (server.exitCode !== null) throw new Error('Production server exited');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(origin, 'Production server failed to start');
  const routes = ['/', `/product/${products[0].slug}`, `/collections/${collections[0].slug}`, `/category/${categories[0].slug}`,
    '/category/all?q=عطر', '/cart', '/checkout', '/admin/orders', '/admin/products', '/admin/collections'];
  const results = [];
  for (const path of routes) {
    const measurements = [];
    for (let i = 0; i <= samples; i++) {
      statements = [];
      const start = performance.now();
      const response = await fetch(`${origin}${path}`, { headers: { 'User-Agent': 'Twitterbot/1.0', ...(path.startsWith('/admin') ? { Cookie: cookie } : {}) }, redirect: 'manual' });
      const ttfb = performance.now() - start;
      const body = await response.text();
      assert.equal(response.status, 200, `${path}: unexpected status`);
      measurements.push({ ttfbMs: ttfb, completeMs: performance.now() - start, decodedHtmlBytes: Buffer.byteLength(body), dbStatements: statements.length, dbExecuteMs: statements.reduce((a,b) => a+b, 0) });
    }
    const warm = measurements.slice(1);
    const median = key => [...warm].sort((a,b) => a[key]-b[key])[Math.floor(warm.length/2)][key];
    results.push({ path, cold: measurements[0], warmMedian: Object.fromEntries(Object.keys(warm[0]).map(key => [key, median(key)])), warmSamples: warm });
  }
  const unauthorized = await fetch(`${origin}/admin/orders`, { redirect: 'manual' });
  assert.equal(unauthorized.status, 307);
  assert.ok(unauthorized.headers.get('location')?.includes('/admin/login'));
  const checks = { unauthenticatedAdminRedirect: true, heroTagInvalidationHttp: false };
  if (label !== 'baseline') {
    // A following request must consult current DB permissions and cannot reuse
    // the preceding authenticated request's identity or role.
    await db.query(`UPDATE "AdminUser" SET role='CATALOG_MANAGER' WHERE id='perf-admin'`);
    const restricted = await fetch(`${origin}/admin/orders`, { headers: { Cookie: cookie }, redirect: 'manual' });
    assert.equal(restricted.status, 307);
    assert.ok(restricted.headers.get('location')?.includes('/admin/products'));
    await db.query(`UPDATE "AdminUser" SET "isActive"=false WHERE id='perf-admin'`);
    const revoked = await fetch(`${origin}/admin/products`, { headers: { Cookie: cookie }, redirect: 'manual' });
    assert.equal(revoked.status, 307);
    assert.ok(revoked.headers.get('location')?.includes('/admin/login'));
    await db.query(`UPDATE "AdminUser" SET role='SUPER_ADMIN', "isActive"=true WHERE id='perf-admin'`);
    const manifest = JSON.parse(readFileSync('.next/server/server-reference-manifest.json', 'utf8'));
    const actionId = Object.entries(manifest.node).find(([,value]) => value.exportedName === 'saveHeroSettingsAction')?.[0];
    assert.ok(actionId, 'Hero save action must be bundled');
    const actionHeaders = { 'Next-Action': actionId, 'Content-Type': 'text/plain;charset=UTF-8', Origin: origin };
    // First reject an anonymous write. Only this run's in-memory DB is reachable.
    await fetch(`${origin}/admin/banners`, { method: 'POST', headers: actionHeaders, body: JSON.stringify([{ layout: 'signature', mode: 'fixed' }]), redirect: 'manual' });
    assert.equal((await db.query('SELECT COUNT(*)::int AS count FROM "HeroSettings"')).rows[0].count, 0);
    const save = await fetch(`${origin}/admin/banners`, { method: 'POST', headers: { ...actionHeaders, Cookie: cookie }, body: JSON.stringify([{ layout: 'signature', mode: 'fixed' }]), redirect: 'manual' });
    const savedBody = await save.text();
    assert.equal(save.status, 200, 'Authorized local hero action must succeed');
    assert.ok(savedBody.includes('"ok":true'), 'Hero action must return success');
    const html = await (await fetch(origin, { headers: { 'User-Agent': 'Twitterbot/1.0' } })).text();
    assert.ok(html.includes('shopHero--signature'), 'Next request must observe tag invalidation, without waiting for TTL');
    checks.heroTagInvalidationHttp = true;
  }
  const files = directory => readdirSync(directory).flatMap(name => { const path = `${directory}/${name}`; return statSync(path).isDirectory() ? files(path) : [path]; });
  const chunks = files('.next/static').filter(path => path.endsWith('.js'));
  const report = { label, source: 'PR #3 28a3ac3 plus current working diff', runtime: process.version, platform: process.platform, samples, environment: 'Next production start, loopback HTTP, fresh PGlite WASM, 100 repository fixture products, single DB connection; no browser/network throttling',
    limitations: ['Not Netlify/serverless or Supabase measurements', 'Cold means first request per route in this process, not a function cold start', 'No LCP/CLS/TBT/INP, navigation paint, image transfer or route-specific browser JS measured', 'DB duration observes local protocol execution, not remote DB/network latency', 'HTML size is decoded response bytes, not wire transfer', '7 warm samples: medians only, no p95 claim'],
    buildJs: { files: chunks.length, bytes: chunks.reduce((n,p) => n+statSync(p).size,0), gzipBytes: chunks.reduce((n,p) => n+gzipSync(readFileSync(p)).length,0) }, privacy: checks, results };
  writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${label} report: ${results.length} routes, ${samples} warm samples each; unauthorized admin redirected.`);
} finally {
  if (server && server.exitCode === null) { const exit = new Promise(resolve => server.once('exit', resolve)); server.kill('SIGTERM'); await exit; }
  if (socket) { for (let i=0; i<100 && socket.getStats().activeConnections>0; i++) await new Promise(resolve => setImmediate(resolve)); await socket.stop(); }
  await new Promise(resolve => setImmediate(resolve));
  await db.close();
}
