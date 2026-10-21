import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

// A fresh in-memory schema and socket are always created here. No external
// DATABASE_URL is accepted, and no production seed/reset operation is used.
test('real Prisma checkout and HTTP rendering on disposable Postgres', { timeout: 90000 }, async (t) => {
  const db = new PGlite();
  const ddl = execFileSync(process.execPath, ['node_modules/prisma/build/index.js','migrate','diff','--from-empty','--to-schema-datamodel','prisma/schema.prisma','--script'], { encoding: 'utf8' });
  await db.exec(ddl);
  const socket = new PGLiteSocketServer({ db, host: '127.0.0.1', port: 0, maxConnections: 5 });
  await socket.start();
  t.after(async () => { await socket.stop(); await db.close(); });
  const address = socket.getServerConn();
  const connection = address.startsWith('postgres') ? address : `postgresql://postgres:test@${address}/postgres`;
  process.env.DATABASE_URL = `${connection}${connection.includes('?') ? '&' : '?'}connection_limit=1&sslmode=disable`;
  process.env.NEXT_PUBLIC_STORE_BRAND = 'ishtar';
  process.env.ADMIN_SESSION_SECRET = randomUUID();
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_ADMIN_CHAT_ID;
  const { prisma } = await import('../src/lib/prisma');
  const { createCodOrderAction, recoverCheckoutAction, trackOrderAction } = await import('../src/features/orders/order.actions');
  const { getCartAvailability } = await import('../src/features/orders/cart.actions');
  const input = (requestKey = randomUUID(), quantity = 1) => ({ requestKey, fullName: 'عميلة اختبار معزولة', phone: '٠٥٩٠٠٠٠٠٠٠', city: 'خانيونس', area: 'حي اختبار', address: 'عنوان مصطنع للاختبار فقط', lines: [{ variantId: 'qa-variant', quantity }] });
  let next: ReturnType<typeof spawn> | undefined;
  try {
    await prisma.category.create({ data: { id: 'qa-category', name: 'قسم اختبار', slug: 'qa-category' } });
    await prisma.product.create({ data: { id: 'qa-product', name: 'حقيبة اختبار', slug: 'qa-product', description: 'بيانات مصطنعة ومعزولة', categoryId: 'qa-category', status: 'ACTIVE', basePrice: 999, variants: { create: { id: 'qa-variant', sku: 'QA-ONLY', price: 25, quantity: 2 } } } });
    const key = randomUUID();
    let orderNumber = '';
    let orderId = '';
    await t.test('invalid fields do not create orders or reserve stock', async () => {
      const result = await createCodOrderAction({ ...input(), fullName: '' });
      assert.equal(result.ok, false);
      assert.equal(await prisma.order.count(), 0);
      assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: 'qa-variant' } })).quantity, 2);
    });
    await t.test('checkout uses current DB variant price and records stock exactly once', async () => {
      const result = await createCodOrderAction(input(key));
      assert.ok(result.ok, JSON.stringify(result));
      orderNumber = result.orderNumber;
      orderId = result.orderId;
      assert.equal(result.total, 25);
      assert.equal(await prisma.order.count(), 1);
      assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: 'qa-variant' } })).quantity, 1);
      assert.equal(await prisma.inventoryLog.count(), 1);
      assert.equal((await prisma.order.findUniqueOrThrow({ where: { orderNumber } })).deliveryFeeStatus, 'PENDING');
    });
    await t.test('replaying a committed attempt returns the same receipt without another stock deduction', async () => {
      const result = await createCodOrderAction(input(key));
      assert.ok(result.ok, JSON.stringify(result)); assert.equal(result.orderNumber, orderNumber);
      assert.equal(await prisma.order.count(), 1);
      assert.equal(await prisma.inventoryLog.count(), 1);
      assert.equal((await prisma.productVariant.findUniqueOrThrow({ where: { id: 'qa-variant' } })).quantity, 1);
    });
    await t.test('same key with changed payload is rejected and receipt recovery returns no customer data', async () => {
      const result = await createCodOrderAction({ ...input(key), area: 'منطقة مختلفة' });
      assert.equal(result.ok, false);
      assert.deepEqual(await recoverCheckoutAction(key), { orderNumber });
      assert.equal(await recoverCheckoutAction(randomUUID()), null);
      assert.equal(await prisma.order.count(), 1);
    });
    await t.test('insufficient stock rolls back the entire purchase', async () => {
      const result = await createCodOrderAction(input(randomUUID(), 2));
      assert.ok(!result.ok && result.stockErrors?.length);
      assert.equal(await prisma.order.count(), 1);
      assert.equal(await prisma.inventoryLog.count(), 1);
    });
    await t.test('tracking verifies phone ownership, including Arabic digits', async () => {
      assert.equal((await trackOrderAction({ orderNumber, phone: '0591111111' })).ok, false);
      assert.equal((await trackOrderAction({ orderNumber, phone: '٠٥٩٠٠٠٠٠٠٠' })).ok, true);
    });
    await t.test('cart availability returns current price and excludes inactive categories', async () => {
      assert.equal((await getCartAvailability(['qa-variant']))[0].price, 25);
      await prisma.category.update({ where: { id: 'qa-category' }, data: { isActive: false } });
      assert.equal((await getCartAvailability(['qa-variant']))[0].quantity, 0);
      const result = await createCodOrderAction(input());
      assert.ok(!result.ok && result.stockErrors?.[0].code === 'UNAVAILABLE');
      await prisma.category.update({ where: { id: 'qa-category' }, data: { isActive: true } });
    });
    // HTTP checks use the production build and real Prisma. They are SSR/API
    // integration checks, not browser interaction or responsive visual QA.
      const { hashPassword, authenticateAdmin } = await import('../src/features/admin/auth/admin-auth');
      const { createSessionToken, ADMIN_SESSION_COOKIE } = await import('../src/features/admin/auth/admin-session');
      const password = randomUUID();
      const admin = await prisma.adminUser.create({ data: { name: 'مدير اختبار', email: 'qa@example.invalid', passwordHash: await hashPassword(password), role: 'SUPER_ADMIN' } });
      assert.equal(await authenticateAdmin(admin.email, 'wrong-test-password'), null);
      const payload = await authenticateAdmin(admin.email, password); assert.ok(payload);
      const token = createSessionToken(payload);
    await prisma.$disconnect();
    await db.exec('DEALLOCATE ALL');
    const port = 0;
    let origin = ''; // Next binds an OS-assigned port; never contact another local app.
    next = spawn(process.execPath, ['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)], { env: { ...process.env, NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://ishtar-qa.example.invalid', NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore','pipe','pipe'] });
    let output = '';
    next.stdout?.on('data', (chunk) => { output += String(chunk); const local = output.match(/http:\/\/127\.0\.0\.1:\d+/); if (local) origin = local[0]; });
    next.stderr?.on('data', (chunk) => { output += String(chunk); });
    for (let attempt = 0; attempt < 60; attempt++) {
      try { if (origin && (await fetch(`${origin}/cart`)).status === 200) break; } catch { /* waiting for child server */ }
      if (next.exitCode !== null) throw new Error(`Next exited: ${output.slice(-1500)}`);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    await t.test('production HTTP routes render catalogue/product/cart and reject unknown products', async () => {
      for (const path of ['/','/category/all','/product/qa-product','/cart','/checkout','/track-order']) {
        const response = await fetch(origin + path);
        assert.equal(response.status, 200, `${path}: ${output.slice(-800)}`);
        assert.match(await response.text(), /عشتار/);
      }
      const missing = await fetch(`${origin}/product/qa-not-found`);
      assert.match(await missing.text(), /الصفحة غير موجودة|NEXT_HTTP_ERROR_FALLBACK;404/);
    });
    await t.test('admin SSR requires a session and accepts an isolated signed test session', async () => {
      const rejected = await fetch(`${origin}/admin`, { redirect: 'manual' });
      assert.equal(rejected.status, 307); assert.equal(rejected.headers.get('location'), '/admin/login');
      for (const path of ['/admin','/admin/products','/admin/orders','/admin/inventory','/admin/categories','/admin/banners']) {
        const response = await fetch(origin + path, { headers: { cookie: `${ADMIN_SESSION_COOKIE}=${token}` }, redirect: 'manual' });
        assert.equal(response.status, 200, `${path}: ${output.slice(-800)}`);
      }
    });

    await t.test('invoice draft, confirmed invoice and packing slip render 50 synthetic rows', async () => {
      const headers = { cookie: `${ADMIN_SESSION_COOKIE}=${token}` };
      const invoiceUrl = `${origin}/admin/orders/${orderId}/invoice`;
      const pending = await fetch(invoiceUrl, { headers });
      assert.equal(pending.status, 200);
      assert.match(await pending.text(), /مسودة — رسوم التوصيل غير مؤكدة/);
      await db.query('UPDATE "Order" SET "deliveryFeeStatus"=\'FREE\', subtotal=1250, total=1250 WHERE id=$1', [orderId]);
      await db.query(`INSERT INTO "OrderItem" (id,"orderId","productId","variantId","productNameSnapshot",quantity,"unitPrice",total)
        SELECT 'print-' || g, $1, 'qa-product', 'qa-variant', 'حقيبة اختبار ذات اسم طويل لاختبار المستند', 1, 25, 25 FROM generate_series(1,49) AS g`, [orderId]);
      const confirmed = await fetch(invoiceUrl, { headers });
      assert.equal(confirmed.status, 200);
      const invoice = await confirmed.text();
      assert.doesNotMatch(invoice, /مسودة — رسوم التوصيل غير مؤكدة/);
      assert.match(invoice, /1,250/);
      assert.ok((invoice.match(/<tr>/g) ?? []).length >= 51);
      const packing = await fetch(`${origin}/admin/orders/${orderId}/packing-slip`, { headers });
      assert.equal(packing.status, 200);
      const slip = await packing.text();
      assert.match(slip, /لا تُعرض الأسعار/);
      assert.ok((slip.match(/<tr>/g) ?? []).length >= 51);
    });
    await t.test('private-flow noindex metadata and sitemap/robots responses are present', async () => {
      const html = await (await fetch(`${origin}/checkout`)).text();
      assert.match(html, /name="robots" content="noindex, nofollow"/);
      assert.equal((await fetch(`${origin}/robots.txt`)).status, 200);
      const sitemap = await fetch(`${origin}/sitemap.xml`);
      assert.equal(sitemap.status, 200);
      const xml = await sitemap.text();
      assert.match(xml, /qa-product/);
      assert.doesNotMatch(xml, /<loc>[^<]*\/admin/);
    });

  } finally {
    next?.kill('SIGTERM');
    await prisma.$disconnect();

  }
});
