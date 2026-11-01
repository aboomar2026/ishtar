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
  process.env.NEXT_PUBLIC_SITE_URL = 'https://www.ishtar.live/';
  process.env.ORDER_OUTBOX_ENABLED = 'true';
  process.env.ORDER_OUTBOX_WORKER_ENABLED = 'false';
  process.env.ADMIN_SESSION_SECRET = randomUUID();
  process.env.TELEGRAM_BOT_TOKEN = 'ISHTAR_TEST_ONLY';
  process.env.TELEGRAM_ADMIN_CHAT_ID = 'ISOLATED_TEST_CHAT';
  const telegramMessages: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (typeof url === 'string' && url.startsWith('https://api.telegram.org/botISHTAR_TEST_ONLY/')) {
      telegramMessages.push(String(init?.body));
      return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200 });
    }
    return originalFetch(url, init);
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  const { prisma } = await import('../src/lib/prisma');
  const { createCodOrderAction, recoverCheckoutAction, trackOrderAction } = await import('../src/features/orders/order.actions');
  const { getCartAvailability } = await import('../src/features/orders/cart.actions');
  const input = (requestKey = randomUUID(), quantity = 1) => ({ requestKey, fullName: 'عميلة اختبار معزولة', phone: '٠٥٩٠٠٠٠٠٠٠', city: 'خانيونس', area: 'حي اختبار', address: 'عنوان مصطنع للاختبار فقط', lines: [{ variantId: 'qa-variant', quantity }] });
  let next: ReturnType<typeof spawn> | undefined;
  try {
    await prisma.category.create({ data: { id: 'qa-category', name: 'قسم اختبار', slug: 'qa-category' } });
    await prisma.product.create({ data: { id: 'qa-product', name: 'حقيبة اختبار', slug: 'qa-product', description: 'بيانات مصطنعة ومعزولة', categoryId: 'qa-category', status: 'ACTIVE', basePrice: 999, isFeatured: true, isNewArrival: true, variants: { create: { id: 'qa-variant', sku: 'QA-ONLY', price: 25, compareAtPrice: 40, quantity: 2 } } } });
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
    await t.test('committed receipt exists in admin queries and Telegram was called once', async () => {
      const { getAdminOrders } = await import('../src/features/admin/orders/order-admin.queries');
      const { getOrderSuccessSummaryByNumber } = await import('../src/features/orders/order.queries');
      assert.equal((await getAdminOrders({ q: orderNumber }))[0]?.id, orderId);
      assert.equal((await getOrderSuccessSummaryByNumber(orderNumber))?.orderNumber, orderNumber);
      assert.equal(telegramMessages.length, 1);
      assert.equal(await prisma.orderNotification.count(), 1);
      assert.equal((await prisma.orderNotification.findUniqueOrThrow({ where: { orderId } })).deliveryStatus, 'SENT');
      assert.match(telegramMessages[0], new RegExp(orderNumber));
      const sent = JSON.parse(telegramMessages[0]);
      assert.ok(sent.text.includes(`فتح الطلب: https://www.ishtar.live/admin/orders/${encodeURIComponent(orderId)}`));
      assert.ok(!sent.text.includes('vercel.app') && !sent.text.includes('localhost'));
      const { getOrderForPrint } = await import('../src/features/admin/orders/order-print.queries');
      const printed = await getOrderForPrint(orderId);
      assert.equal(printed?.trackUrl, `https://www.ishtar.live/track-order?order=${encodeURIComponent(orderNumber)}`);
      assert.match(printed!.qrDataUrl, /^data:image\/png;base64,/);
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
      const catalogAdmin = await prisma.adminUser.create({ data: { name: 'كتالوج اختبار', email: 'catalog@example.invalid', passwordHash: await hashPassword(randomUUID()), role: 'CATALOG_MANAGER' } });
      // A valid old super-admin token must not beat a newly restricted DB role.
      const catalogToken = createSessionToken({ id: catalogAdmin.id, email: catalogAdmin.email, role: 'SUPER_ADMIN' });
      await prisma.order.createMany({ data: Array.from({ length: 55 }, (_, index) => ({
        id: `page-order-${String(index).padStart(3, '0')}`, orderNumber: `PAGE-${index}`,
        customerName: 'زبونة اختبار صفحات', customerPhone: '0590000000', city: 'مدينة اختبار', area: 'اختبار', address: 'عنوان مصطنع',
        subtotal: 1, total: 1, createdAt: new Date('2000-01-01T00:00:00Z')
      })) });
      const { getAdminOrderPage } = await import('../src/features/admin/orders/order-admin.queries');
      const firstPage = await getAdminOrderPage({ page: 1 });
      const secondPage = await getAdminOrderPage({ page: 2 });
      await t.test('admin order pages are bounded, stable across tied dates and include all matching rows', async () => {
        assert.equal(firstPage.total, 56); assert.equal(firstPage.orders.length, 50);
        assert.equal(secondPage.orders.length, 6); assert.equal(secondPage.pageCount, 2);
        assert.equal(new Set([...firstPage.orders, ...secondPage.orders].map(order => order.id)).size, 56);
        assert.equal((await getAdminOrderPage({ page: 999 })).page, 2);
        assert.equal((await getAdminOrderPage({ status: 'DELIVERED' })).total, 0);
      });
    await prisma.product.createMany({ data: Array.from({ length: 9 }, (_, index) => ({ id: `suggest-${index}`, name: `اقتراح بحث ${index}`, slug: `suggest-${index}`, description: 'Synthetic suggestion', categoryId: 'qa-category', basePrice: 999, status: index === 8 ? 'DRAFT' as const : 'ACTIVE' as const })) });
    await prisma.productVariant.createMany({ data: [
      { id: 'suggest-stocked', productId: 'suggest-0', sku: 'SUGGEST-STOCKED', price: 35, quantity: 2 },
      { id: 'suggest-empty-cheaper', productId: 'suggest-0', sku: 'SUGGEST-EMPTY', price: 1, quantity: 0 },
      { id: 'suggest-inactive', productId: 'suggest-0', sku: 'SUGGEST-INACTIVE', price: 2, quantity: 50, isActive: false }
    ] });
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
      for (const path of ['/','/category/all','/category/featured','/category/all?sort=best-sellers','/product/qa-product','/cart','/checkout','/track-order']) {
        const response = await fetch(origin + path);
        assert.equal(response.status, 200, `${path}: ${output.slice(-800)}`);
        assert.match(await response.text(), /عشتار/);
      }
      const missing = await fetch(`${origin}/product/qa-not-found`);
      assert.match(await missing.text(), /الصفحة غير موجودة|NEXT_HTTP_ERROR_FALLBACK;404/);
    });
    await t.test('public suggestions are capped, use real available prices and hide unpublished records', async () => {
      const get = (term: string) => fetch(`${origin}/api/catalog/suggestions?q=${encodeURIComponent(term)}`);
      const response = await get('اقتراح بحث'); assert.equal(response.status, 200);
      assert.match(response.headers.get('cache-control') ?? '', /no-store/);
      const result = await response.json(); assert.equal(result.products.length, 6);
      assert.ok(result.products.every((p: { id: string }) => p.id !== 'suggest-8'));
      const exact = (await (await get('اقتراح بحث 0')).json()).products[0];
      assert.equal(exact.price, 35); assert.equal(exact.available, true);
      assert.equal((await (await get('اقتراح بحث 8')).json()).products.length, 0);
      assert.equal((await (await get('%_')).json()).products.length, 0);
      const unavailable = (await (await get('اقتراح بحث 1')).json()).products[0];
      assert.equal(unavailable.available, false); assert.equal(unavailable.image, '/mock-products/gift-box.svg');
      assert.deepEqual(Object.keys(exact).sort(), ['available','id','image','name','price','slug']);
      assert.equal((await (await get('ع')).json()).products.length, 0);
      assert.equal((await get('x'.repeat(121))).status, 400);
      assert.equal((await (await get("%' OR 1=1 --")).json()).products.length, 0);
      await db.query('UPDATE "Category" SET "isActive"=false WHERE id=$1', ['qa-category']);
      try { assert.equal((await (await get('اقتراح بحث')).json()).products.length, 0); }
      finally { await db.query('UPDATE "Category" SET "isActive"=true WHERE id=$1', ['qa-category']); }
    });

    await t.test('saved-products revalidates published IDs without exposing hidden products or mutating orders', async () => {
      const read = (ids: unknown) => fetch(origin + '/api/catalog/saved-products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
      const response = await read(['suggest-0', 'suggest-8', 'missing', 'suggest-0']);
      assert.equal(response.status, 200); assert.match(response.headers.get('cache-control') ?? '', /no-store/);
      const body = await response.json(); assert.equal(body.products.length, 1);
      assert.equal(body.products[0].id, 'suggest-0'); assert.equal(body.products[0].price, 35);
      assert.deepEqual(body.unavailableIds, ['suggest-8', 'missing']);
      assert.equal((await read(Array(51).fill('suggest-0'))).status, 400);
      assert.equal((await read(['<invalid>'])).status, 400);
      assert.equal((await read('invalid')).status, 400);
      assert.deepEqual(await (await read([])).json(), { products: [], unavailableIds: [] });
      await db.query('UPDATE "Category" SET "isActive"=false WHERE id=$1', ['qa-category']);
      try { assert.equal((await (await read(['suggest-0'])).json()).products.length, 0); }
      finally { await db.query('UPDATE "Category" SET "isActive"=true WHERE id=$1', ['qa-category']); }
      const page = await fetch(origin + '/wishlist'); assert.equal(page.status, 200);
      const html = await page.text(); assert.match(html, /noindex/); assert.match(html, /المفضّلة/);
    });

    await t.test('homepage keeps overlapping product sections and links to matching collections', async () => {
      const html = await (await fetch(origin + '/')).text();
      assert.equal((html.match(/<article class="productCard /g) ?? []).length, 4);
      assert.match(html, /href="\/category\/all\?sort=best-sellers"/);
      assert.match(html, /href="\/category\/featured"/);
      const featured = await (await fetch(origin + '/category/featured')).text();
      assert.match(featured, /حقيبة اختبار/);
      assert.match(featured, /class="priceCurrent"/);
    });
    await t.test('admin SSR requires a session and accepts an isolated signed test session', async () => {
      const rejected = await fetch(`${origin}/admin`, { redirect: 'manual' });
      assert.equal(rejected.status, 307); assert.equal(rejected.headers.get('location'), '/admin/login');
      for (const path of ['/admin','/admin/products','/admin/orders','/admin/inventory','/admin/categories','/admin/banners']) {
        const response = await fetch(origin + path, { headers: { cookie: `${ADMIN_SESSION_COOKIE}=${token}` }, redirect: 'manual' });
        assert.equal(response.status, 200, `${path}: ${output.slice(-800)}`);
      }
    });

    await t.test('dashboard period links and daily table render privately with normalized periods', async () => {
      const headers = { cookie: `${ADMIN_SESSION_COOKIE}=${token}` };
      for (const period of ['week', 'month', 'invalid']) {
        const response = await fetch(`${origin}/admin?period=${period}`, { headers });
        assert.equal(response.status, 200);
        const html = await response.text();
        assert.match(html, /أداء الطلبات/); assert.match(html, /قيمة الطلبات المسلّمة/);
        assert.match(html, /scope="col"/); assert.match(html, /فترة ملخص الطلبات/);
        assert.equal((html.match(/<time dateTime="\d{4}-\d{2}-\d{2}"/g) ?? []).length, period === 'week' ? 7 : period === 'month' ? 30 : 1);
      }
    });

    await t.test('catalog role cannot read orders, exports or prints even with a stale super-admin claim', async () => {
      const headers = { cookie: `${ADMIN_SESSION_COOKIE}=${catalogToken}` };
      for (const path of ['/admin', '/admin/notifications', '/admin/orders', `/admin/orders/${orderId}`, `/admin/orders/${orderId}/invoice`, `/admin/orders/${orderId}/packing-slip`]) {
        const response = await fetch(origin + path, { headers, redirect: 'manual' });
        assert.equal(response.status, 307, path);
        assert.equal(response.headers.get('location'), '/admin/products', path);
        assert.doesNotMatch(await response.text(), /عميلة اختبار معزولة/);
      }
      assert.equal((await fetch(origin + '/admin/orders/export', { headers })).status, 403);
      assert.equal((await fetch(origin + '/admin/orders/export')).status, 401);
      assert.equal((await fetch(origin + '/admin/api/order-activity')).status, 401);
      assert.equal((await fetch(origin + '/admin/api/order-activity', { headers })).status, 403);
      for (const path of ['/admin/products', '/admin/categories', '/admin/inventory', '/admin/banners']) {
        const response = await fetch(origin + path, { headers, redirect: 'manual' });
        assert.equal(response.status, 200, path);
        assert.doesNotMatch(await response.text(), /href="\/admin\/orders"/);
      }
    });
    await t.test('order pagination renders links with filters and accepts invalid URL enum values safely', async () => {
      const headers = { cookie: `${ADMIN_SESSION_COOKIE}=${token}` };
      const first = await fetch(origin + '/admin/orders?status=PENDING', { headers });
      assert.match(await first.text(), /status=PENDING&amp;page=2/);
      const second = await fetch(origin + '/admin/orders?status=PENDING&page=2', { headers });
      const html = await second.text();
      assert.match(html, new RegExp(secondPage.orders[0].orderNumber));
      assert.doesNotMatch(html, new RegExp(orderNumber));
      assert.equal((await fetch(origin + '/admin/orders?status=invalid&delivery=invalid&page=NaN', { headers })).status, 200);
      assert.equal((await fetch(origin + '/admin/orders/export?status=invalid', { headers })).status, 200);
    });

    await t.test('live activity is private, compact and changes after a committed order update', async () => {
      const headers = { cookie: `${ADMIN_SESSION_COOKIE}=${token}` };
      const response = await fetch(origin + '/admin/api/order-activity', { headers });
      assert.equal(response.status, 200); assert.match(response.headers.get('cache-control') ?? '', /no-store/);
      const before = await response.json();
      assert.equal(before.pendingOrders, 56); assert.equal(before.outboxEnabled, true); assert.equal(before.unread, 1);
      assert.doesNotMatch(JSON.stringify(before), /customerName|customerPhone|address|عميلة اختبار/);
      await db.query(`UPDATE "Order" SET status='CONFIRMED', "updatedAt"=CURRENT_TIMESTAMP WHERE id=$1`, [orderId]);
      const after = await (await fetch(origin + '/admin/api/order-activity', { headers })).json();
      assert.equal(after.pendingOrders, 55); assert.notEqual(before.revision, after.revision);
      const center = await fetch(origin + '/admin/notifications', { headers });
      assert.equal(center.status, 200);
      const centerHtml = await center.text();
      assert.match(centerHtml, new RegExp(orderNumber));
      assert.match(centerHtml, /أُرسل إلى تيليجرام/);
      assert.match(centerHtml, /المعالجة المجدولة غير مفعّلة/);
      assert.equal((await fetch(origin + '/api/internal/order-notifications/dispatch', { method: 'POST' })).status, 404);
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
      assert.doesNotMatch(invoice, /aria-label="متابعة الطلبات"/);
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
