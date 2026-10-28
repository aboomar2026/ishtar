import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes, createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { chromium, type Page } from 'playwright-core';

// Production Next + fresh local fixture only. No live orders, accounts, uploads
// or third-party traffic. RSC gates simulate slow responses, not Web Vitals.
test('hero rotation and navigation feedback in production Chromium on desktop and mobile', { timeout: 300000 }, async t => {
  const db = new PGlite();
  await db.exec(execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8' }));
  await db.exec(readFileSync('scripts/sql/ishtar-test-products-100.sql', 'utf8'));
  await db.exec(readFileSync('scripts/sql/ishtar-collections-from-products-100.sql', 'utf8'));
  await db.query(`INSERT INTO "AdminUser" (id,name,email,"passwordHash",role,"isActive","updatedAt") VALUES ('nav-admin','Navigation fixture','navigation@example.invalid','unused','SUPER_ADMIN',true,NOW())`);
  const { rows: products } = await db.query<{ slug: string }>(`SELECT slug FROM "Product" WHERE status='ACTIVE' ORDER BY id LIMIT 1`);
  // Give one synthetic product multiple available options so the exact
  // "عرض المنتج" CTA is covered as well as title/image links.
  await db.query(`UPDATE "ProductVariant" SET quantity=5 WHERE "productId" IN (SELECT id FROM "Product" WHERE slug=$1)`,[products[0].slug]);
  await db.query(`INSERT INTO "ProductVariant" (id,"productId",sku,price,quantity,"updatedAt") SELECT 'nav-alternate',id,'NAV-ALTERNATE',"basePrice",5,NOW() FROM "Product" WHERE slug=$1`,[products[0].slug]);
  // Keep fixture media local: CDN interception can race a document navigation
  // on restricted hosts. Unique URLs preserve image/collage/slider semantics.
  await db.exec(`UPDATE "ProductImage" SET url='/mock-products/bag-camel.svg?fixture=' || id;
    UPDATE "Category" SET "imageUrl"='/mock-products/gift-box.svg';`);
  const socket = new PGLiteSocketServer({ db, host: '127.0.0.1', port: 0, maxConnections: 5 });
  await socket.start();
  const address = socket.getServerConn();
  const connection = address.startsWith('postgres') ? address : `postgresql://postgres:test@${address}/postgres`;
  const secret = randomBytes(32).toString('hex');
  const payload = Buffer.from(JSON.stringify({ id: 'nav-admin', email: 'navigation@example.invalid', role: 'SUPER_ADMIN', exp: Math.floor(Date.now()/1000)+600 })).toString('base64url');
  const token = `${payload}.${createHmac('sha256',secret).update(payload).digest('base64url')}`;
  let origin = ''; let output = '';
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '0'], {
    env: { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', DATABASE_URL: `${connection}?connection_limit=1&sslmode=disable`, DIRECT_URL: '', ADMIN_SESSION_SECRET: secret, ORDER_OUTBOX_ENABLED: 'false', TELEGRAM_BOT_TOKEN: '', TELEGRAM_ADMIN_CHAT_ID: '' }, stdio: ['ignore','pipe','pipe']
  });
  server.stdout.on('data', chunk => { output += chunk; origin = output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0] ?? ''; });
  server.stderr.on('data', chunk => { output += chunk; });
  let closeBrowser = async () => {};
  t.after(async () => {
    await closeBrowser();
    const exit = new Promise(resolve => server.once('exit',resolve));
    if (server.exitCode === null) { server.kill('SIGTERM'); await exit; }
    for (let i=0; i<100 && socket.getStats().activeConnections>0; i++) await new Promise<void>(resolve => setImmediate(resolve));
    await socket.stop(); await new Promise<void>(resolve => setImmediate(resolve)); await db.close();
  });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.ISHTAR_TEST_BROWSER_EXECUTABLE || undefined,
    args: process.env.ISHTAR_TEST_BROWSER_ARGS ? JSON.parse(process.env.ISHTAR_TEST_BROWSER_ARGS) : ['--no-sandbox'] });
  closeBrowser = () => browser.close();
  for (let i=0; i<100; i++) {
    if (origin) { try { if ((await fetch(`${origin}/cart`)).ok) break; } catch { /* startup */ } }
    if (server.exitCode !== null) throw new Error('Production Next failed to start');
    await new Promise(resolve => setTimeout(resolve,100));
  }
  assert.ok(origin);

  async function session(mobile = false) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile });
    await context.route(url => ['http:','https:'].includes(url.protocol) && url.origin !== origin, async route => {
      try {
        const url = new URL(route.request().url());
        assert.notEqual(url.origin,origin);
        // Images only: all external services are isolated, including image CDNs.
        return await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#f3c9d7"/></svg>' });
      } catch { /* A route/context may be canceled while an image is intercepted. */ }
    });
    await context.addInitScript(() => { Object.assign(window, { __navigationDocument: Math.random().toString(36) }); });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror',error => errors.push(error.message));
    page.on('console',message => { if (message.type() === 'error') errors.push(`${message.text()} ${message.location().url}`); });
    return { context, page, errors };
  }
  const indicator = (page: Page) => page.getByTestId('navigation-feedback');
  const documentId = (page: Page) => page.evaluate(() => (window as unknown as { __navigationDocument: string }).__navigationDocument);
  async function gate(page: Page, matches: (url: URL) => boolean, catalogPost = false) {
    let release!: () => void; let observed!: () => void;
    const hold = new Promise<void>(resolve => { release = resolve; });
    const requested = new Promise<void>(resolve => { observed = resolve; });
    const matcher = (url: URL) => url.origin === origin && matches(url);
    await page.route(matcher, async route => {
      const request = route.request();
      if (catalogPost ? request.method() === 'POST' : request.headers().rsc === '1') {
        observed(); await hold;
      }
      try { await route.continue(); } catch { /* A newer navigation can cancel the old request. */ }
    });
    return { release, requested, cleanup: () => page.unroute(matcher) };
  }
  async function navigate(page: Page, href: string, action: () => Promise<unknown>, screenshot?: string) {
    const expected = new URL(href,origin);
    const held = await gate(page,url => url.pathname === expected.pathname && [...expected.searchParams].every(([key,value]) => url.searchParams.get(key) === value));
    const id = await documentId(page);
    try {
      await action();
      await Promise.race([held.requested, new Promise((_,reject) => setTimeout(() => reject(new Error(`No RSC request: ${href}`)),5000))]);
      await indicator(page).waitFor({ state: 'visible', timeout: 3000 });
      assert.match(await indicator(page).innerText(), /جارٍ فتح الصفحة/);
      if (screenshot && process.env.ISHTAR_NAV_SCREENSHOTS) await page.screenshot({ path: `${process.env.ISHTAR_NAV_SCREENSHOTS}/${screenshot}.png`, animations:'disabled' });
      held.release();
      await page.waitForURL(url => url.pathname === expected.pathname && [...expected.searchParams].every(([key,value]) => url.searchParams.get(key) === value));
      await indicator(page).waitFor({ state: 'detached' });
      assert.equal(await documentId(page),id,'Internal navigation must preserve the document');
    } finally { held.release(); await held.cleanup(); }
  }

  await t.test('WhatsApp contacts use the confirmed number on desktop and touch mobile without sending messages', async () => {
    await db.query(`INSERT INTO "Order" (id,"orderNumber",subtotal,total,"customerName","customerPhone",city,area,address,"updatedAt") VALUES ('wa-fixture','IS-WA-FIXTURE',0,0,'Synthetic fixture','0590000000','Fixture','Fixture','Fixture',NOW())`);
    try {
      for (const mobile of [false,true]) {
        const { context,page,errors } = await session(mobile);
        try {
          for (const [path,label] of [
            [`/product/${products[0].slug}`,'اسألي عن المنتج عبر واتساب'],
            ['/cart','مساعدة بالسلة عبر واتساب'],
            ['/track-order','مساعدة بتتبع الطلب عبر واتساب'],
            ['/order-success','تواصلي معنا عبر واتساب'],
            ['/order-success?order=IS-WA-FIXTURE','استفسار عن الطلب عبر واتساب']
          ]) {
            await page.goto(`${origin}${path}`);
            const link = page.locator('main').getByRole('link',{ name:`${label} (يفتح في تبويب جديد)`,exact:true });
            await link.waitFor(); await link.scrollIntoViewIfNeeded();
            assert.equal(await link.isVisible(),true);
            const href = new URL((await link.getAttribute('href'))!);
            assert.equal(href.origin+href.pathname,'https://wa.me/970598079482');
            assert.ok(href.searchParams.get('text'));
            assert.equal(await link.getAttribute('target'),'_blank');
            assert.ok((await link.boundingBox())!.height >= 44);
            assert.equal(await indicator(page).count(),0);
            const footerLink = page.locator('footer .whatsappContact');
            assert.equal(await footerLink.count(),1);
            assert.equal(new URL((await footerLink.getAttribute('href'))!).pathname,'/970598079482');
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
          }
          await page.goto(`${origin}/track-order`);
          await page.evaluate(() => localStorage.setItem('ishtar:recent-orders',JSON.stringify([{ orderNumber:'IS-WA-FIXTURE',phone:'0590000000',createdAt:'2026-01-01' }])));
          await page.reload();
          const saved = page.locator('.recentOrderActions .whatsappContact');
          await saved.waitFor();
          const text = new URL((await saved.getAttribute('href'))!).searchParams.get('text')!;
          assert.match(text,/IS-WA-FIXTURE/); assert.doesNotMatch(text,/0590000000|Fixture/);
          await page.locator('.recentOrderActions button.primaryButton').click();
          const result = page.locator('#track-order-result .whatsappContact'); await result.waitFor();
          assert.equal(new URL((await result.getAttribute('href'))!).searchParams.get('text'),text);
          assert.deepEqual(errors,[]);
        } finally { await context.close(); }
      }
    } finally { await db.query(`DELETE FROM "Order" WHERE id='wa-fixture'`); }
  });

  const heroLayout = (page: Page) => page.locator('.shopHero').first().getAttribute('class').then(value => value!.match(/shopHero--(classic|signature|campaign)/)![1]);
  const following = { classic: 'signature', signature: 'campaign', campaign: 'classic' } as Record<string,string>;
  await t.test('a REAL minute changes each design on desktop and touch mobile, with visible effects and no toolbar', async () => {
    // Test one foreground page at a time: changing active browser tabs would
    // intentionally pause animations/rotation through document.hidden.
    for (const mobile of [false,true]) {
      const { context,page,errors } = await session(mobile);
      try {
        await page.goto(origin);
        assert.equal(await page.locator('.shopHeroTemplateControls').count(),0);
        assert.notEqual(await page.locator('.shopHero').first().getAttribute('data-motion'),'none');
        const scene = page.locator('.shopHeroMainMotion').first();
        await page.locator('.shopHeroScene').first().evaluate(element => element.scrollIntoView({ block:'center', behavior:'instant' }));
        await page.waitForTimeout(350);
        if (mobile) {
          const stamp = page.locator('.shopHeroSceneStamp').first();
          await stamp.evaluate(element => element.scrollIntoView({ block:'center', behavior:'instant' }));
          const box = await stamp.boundingBox(); assert.ok(box);
          assert.equal(await stamp.evaluate(element => { const r = element.getBoundingClientRect(); return element.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)); }),true,'Tap must hit the decorative stamp after scrolling');
          await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
        }
        else { const box = await scene.boundingBox(); assert.ok(box); await page.mouse.move(box.x+box.width/2,box.y+box.height/2); }
        assert.equal(await page.evaluate(() => document.hidden),false);
        const before = await scene.evaluate(element => getComputedStyle(element).transform);
        await page.waitForTimeout(600);
        const after = await scene.evaluate(element => getComputedStyle(element).transform);
        assert.notEqual(before,after,'Visible foreground hero effects must actually move');
        const initial = await heroLayout(page);
        // Real wall-clock time, never Playwright clock acceleration in this case.
        await new Promise(resolve => setTimeout(resolve,61000));
        assert.equal(await heroLayout(page),following[initial],mobile ? 'mobile' : 'desktop');
        console.log(`${mobile ? 'Mobile' : 'Desktop'} real-minute hero: ${initial} → ${following[initial]}`);
        assert.deepEqual(errors,[]);
      } finally { await context.close(); }
    }
  });
  for (const mobile of [false,true]) await t.test(`${mobile ? 'mobile' : 'desktop'} hero completes the three-design loop; keyboard focus resumes on blur`, async () => {
    const { context,page,errors } = await session(mobile);
    try {
      await page.clock.install(); await page.goto(origin); await page.waitForTimeout(300);
      let expected = await heroLayout(page);
      for (let cycle=0; cycle<3; cycle++) {
        expected = following[expected]; await page.clock.fastForward(60010);
        await page.waitForFunction(layout => !!document.querySelector(`.shopHero--${layout}`),expected);
      }
      if (!mobile) {
        await page.keyboard.press('Tab');
        const link = page.locator('.shopHero a').first(); await link.focus();
        assert.equal(await link.evaluate(element => element.matches(':focus-visible')),true);
        await page.waitForTimeout(50); await page.clock.fastForward(60010);
        assert.equal(await heroLayout(page),expected,'Keep the focused keyboard target stable');
        await page.locator('a.brandLink').focus(); await page.waitForTimeout(50);
        expected = following[expected]; await page.clock.fastForward(60010);
        await page.waitForFunction(layout => !!document.querySelector(`.shopHero--${layout}`),expected);
      }
      assert.equal(await page.locator('.shopHeroTemplateControls').count(),0);
      assert.deepEqual(errors,[]);
    } finally { await context.close(); }
  });
  await t.test('system reduced-motion preference keeps the public hero stable', async () => {
    const { context,page,errors } = await session(true);
    try {
      await page.emulateMedia({ reducedMotion:'reduce' }); await page.clock.install();
      await page.goto(origin); await page.waitForTimeout(300);
      const initial = await heroLayout(page); await page.clock.fastForward(180010);
      assert.equal(await heroLayout(page),initial); assert.deepEqual(errors,[]);
    } finally { await context.close(); }
  });

  for (const mobile of [false,true]) await t.test(`${mobile ? 'mobile' : 'desktop'}: product, collection, related, filters, pagination and search`, async () => {
    const { context,page,errors } = await session(mobile);
    try {
      await page.goto(origin); await page.locator('.productTitle').first().waitFor();
      const product = page.locator('.productTitle').first(); const href = (await product.getAttribute('href'))!;
      await navigate(page,href,() => product.click(),mobile ? 'navigation-mobile' : 'navigation-desktop');
      const related = page.locator('.productGrid .productTitle').first();
      if (await related.count()) await navigate(page,(await related.getAttribute('href'))!,() => related.click());
      await page.goto(`${origin}/collections`);
      const collection = page.locator('a.collectionCard').first();
      await navigate(page,(await collection.getAttribute('href'))!,() => collection.click());
      const member = page.locator('.productTitle').first();
      await navigate(page,(await member.getAttribute('href'))!,() => member.click());
      await page.goto(`${origin}/category/all`);
      const viewProduct = page.locator('a.quickAddButton.isChoose').first();
      await navigate(page,(await viewProduct.getAttribute('href'))!,() => viewProduct.click());
      await page.goto(`${origin}/category/all`);
      const next = page.locator('.catalogPagination a').last();
      await navigate(page,(await next.getAttribute('href'))!,() => next.click());
      await page.locator('.filterRow input[name=q]').fill('عطر');
      await page.locator('.filterRow select[name=sort]').selectOption('price-asc');
      await navigate(page,'/category/all?q=عطر&sort=price-asc&availability=all',() => page.locator('.filterRow button[type=submit]').click());
      await page.goto(origin);
      const search = page.locator('input[role=combobox]:visible').first();
      await search.fill('حقيبة');
      await navigate(page,'/category/all?q=حقيبة',() => search.press('Enter'));
      await page.goBack(); await indicator(page).waitFor({ state: 'detached' });
      assert.deepEqual(errors,[]);
    } finally { await context.close(); }
  });

  await t.test('quick-view skeleton, close during fetch and full-product navigation', async () => {
    const { context,page,errors } = await session(true);
    const post = await gate(page,url => url.pathname === '/api/catalog/saved-products',true);
    try {
      await page.goto(`${origin}/category/all`);
      const eye = page.locator('.quickViewButton').first();
      await eye.click(); await page.locator('dialog[open]').waitFor();
      await page.getByRole('status',{ name: 'جارٍ تحميل تفاصيل المنتج' }).waitFor();
      if (process.env.ISHTAR_NAV_SCREENSHOTS) await page.screenshot({ path: `${process.env.ISHTAR_NAV_SCREENSHOTS}/quick-view-skeleton.png`, animations:'disabled' });
      await page.keyboard.press('Escape'); await page.locator('dialog').waitFor({ state: 'detached' });
      assert.equal(await eye.evaluate(element => element === document.activeElement),true);
      post.release(); await post.cleanup();
      const postAgain = await gate(page,url => url.pathname === '/api/catalog/saved-products',true);
      try {
        await eye.click(); await page.locator('dialog[open]').waitFor();
        const full = page.locator('.quickViewFooter a');
        await navigate(page,(await full.getAttribute('href'))!,() => full.click());
        await page.locator('dialog').waitFor({ state: 'detached' });
      } finally { postAgain.release(); await postAgain.cleanup(); }
      assert.deepEqual(errors,[]);
    } finally { post.release(); await post.cleanup(); await context.close(); }
  });

  await t.test('cart to checkout indicates pending without placing an order', async () => {
    const { context,page,errors } = await session(true);
    const held = await gate(page,url => url.pathname === '/checkout');
    try {
      await page.goto(`${origin}/product/${products[0].slug}`);
      await page.getByRole('button',{ name: 'أضيفي للسلة', exact: true }).click();
      await page.locator('a[href="/cart"]:visible').first().click(); await page.waitForURL('**/cart');
      const checkout = page.locator('a[href="/checkout"]'); await checkout.waitFor();
      const id = await documentId(page);
      await checkout.click(); await indicator(page).waitFor({ state: 'visible' });
      held.release(); await page.waitForURL('**/checkout'); await indicator(page).waitFor({ state: 'detached' });
      assert.equal(await documentId(page),id); assert.deepEqual(errors,[]);
      assert.equal((await db.query<{ count: number }>('SELECT COUNT(*)::int AS count FROM "Order"')).rows[0].count,0);
    } finally { held.release(); await held.cleanup(); await context.close(); }
  });

  await t.test('admin Orders, Products and Collections share navigation feedback', async () => {
    const { context,page,errors } = await session();
    try {
      await context.addCookies([{ name:'bah_admin_session', value:token, url:origin }]);
      await page.goto(`${origin}/admin`);
      for (const href of ['/admin/products','/admin/collections','/admin/orders']) await navigate(page,href,() => page.locator(`a[href="${href}"]:visible`).first().click());
      assert.deepEqual(errors,[]);
    } finally { await context.close(); }
  });

  await t.test('slow-response feedback, reduced motion and newer navigation cannot leave a stuck loader', async () => {
    const { context,page,errors } = await session();
    await page.emulateMedia({ reducedMotion:'reduce' });
    let held: Awaited<ReturnType<typeof gate>> | undefined;
    try {
      await page.goto(`${origin}/category/all`);
      const link = page.locator('.productTitle').first(); const href = (await link.getAttribute('href'))!;
      held = await gate(page,url => url.pathname === href);
      await link.click(); await indicator(page).waitFor({ state:'visible' });
      assert.equal(await page.locator('.navigationNotice .ishtarSpinner').evaluate(element => getComputedStyle(element).animationName),'none');
      await page.getByText('الانتقال أطول من المعتاد',{ exact:true }).waitFor({ timeout:16000 });
      assert.match(await indicator(page).innerText(),/قد يكون الاتصال بطيئًا/);
      await page.locator('a[href="/collections"]:visible').first().click();
      await page.waitForURL('**/collections'); await indicator(page).waitFor({ state:'detached',timeout:5000 });
      held.release(); await page.waitForTimeout(200);
      assert.equal(new URL(page.url()).pathname,'/collections'); assert.deepEqual(errors,[]);
    } finally { held?.release(); await held?.cleanup(); await context.close(); }
  });

  await t.test('same-page, new-tab and download actions do not leave false loading feedback', async () => {
    const { context,page,errors } = await session();
    try {
      await context.addCookies([{ name:'bah_admin_session',value:token,url:origin }]);
      await page.goto(`${origin}/admin/orders`);
      await page.locator('a[href="/admin/orders"]:visible').first().click();
      await page.waitForTimeout(150); assert.equal(await indicator(page).count(),0);
      const popupEvent = context.waitForEvent('page');
      await page.locator('a.adminNavStore[target="_blank"]:visible').first().click();
      const popup = await popupEvent; await popup.close();
      assert.equal(await indicator(page).count(),0);
      const download = page.waitForEvent('download');
      await page.locator('a[download]').click(); await download;
      assert.equal(await indicator(page).count(),0); assert.deepEqual(errors,[]);
    } finally { await context.close(); }
  });

  await t.test('logout redirect has inline pending feedback until the server action finishes', async () => {
    const { context,page,errors } = await session();
    const held = await gate(page,url => url.pathname === '/admin/orders',true);
    try {
      await context.addCookies([{ name:'bah_admin_session',value:token,url:origin }]);
      await page.goto(`${origin}/admin/orders`);
      const button = page.locator('.adminTopbar form button');
      await button.click();
      await page.getByRole('button',{ name:'جارٍ تسجيل الخروج…' }).waitFor();
      assert.equal(await button.isDisabled(),true);
      held.release(); await page.waitForURL('**/admin/login');
      assert.deepEqual(errors,[]);
    } finally { held.release(); await held.cleanup(); await context.close(); }
  });

  await t.test('loading UI does not turn missing product/category/collection HTTP responses into soft 404s', async () => {
    for (const path of ['/product/navigation-missing','/category/navigation-missing','/collections/navigation-missing']) {
      const response = await fetch(`${origin}${path}`,{ headers:{ 'User-Agent':'Twitterbot/1.0' } });
      assert.equal(response.status,404,path);
    }
  });
});
