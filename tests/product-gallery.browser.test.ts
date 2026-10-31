import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes, createHmac } from 'node:crypto';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { chromium } from 'playwright-core';

// Production Next, an isolated disposable database, no live data or uploads.
test('product availability and image galleries on desktop/mobile, including nested quick view and admin', { timeout: 180000 }, async t => {
  const db = new PGlite();
  await db.exec(execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8' }));
  await db.exec(`INSERT INTO "Category" (id,name,slug,"updatedAt") VALUES ('gallery-category','ملابس','gallery-category',NOW());
    INSERT INTO "Category" (id,name,slug,"isActive","updatedAt") VALUES ('hidden-category','مخفي','hidden-category',false,NOW());
    INSERT INTO "AdminUser" (id,name,email,"passwordHash",role,"isActive","updatedAt") VALUES ('gallery-admin','Gallery fixture','gallery@example.invalid','unused','SUPER_ADMIN',true,NOW());`);
  for (const [id, category, status] of [['gallery-active','gallery-category','ACTIVE'],['gallery-draft','gallery-category','DRAFT'],['gallery-hidden','hidden-category','ACTIVE']]) {
    await db.query(`INSERT INTO "Product" (id,name,slug,description,"categoryId",status,"basePrice","updatedAt") VALUES ($1,$1,$1,'قطعة للاختبار',$2,$3::"ProductStatus",25,NOW())`, [id,category,status]);
    await db.query(`INSERT INTO "ProductVariant" (id,"productId",sku,price,quantity,"updatedAt") VALUES ($1,$2,$1,25,6,NOW())`, [`${id}-variant`,id]);
    for (let i=0;i<3;i++) await db.query(`INSERT INTO "ProductImage" (id,"productId",url,alt,"sortOrder","isPrimary","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,NOW())`, [`${id}-${i}`,id,`/mock-products/bag-camel.svg?product=${id}&image=${i}`,`صورة ${id} ${i}`,i,i===0]);
  }
  const socket = new PGLiteSocketServer({ db, host:'127.0.0.1', port:0, maxConnections:5 });
  await socket.start();
  const address=socket.getServerConn();
  const connection=address.startsWith('postgres')?address:`postgresql://postgres:test@${address}/postgres`;
  const secret=randomBytes(32).toString('hex');
  const payload=Buffer.from(JSON.stringify({ id:'gallery-admin',email:'gallery@example.invalid',role:'SUPER_ADMIN',exp:Math.floor(Date.now()/1000)+600 })).toString('base64url');
  const token=`${payload}.${createHmac('sha256',secret).update(payload).digest('base64url')}`;
  let origin='', output='';
  const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','0'],{
    env:{...process.env,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',DATABASE_URL:`${connection}?connection_limit=1&sslmode=disable`,DIRECT_URL:'',ADMIN_SESSION_SECRET:secret,ORDER_OUTBOX_ENABLED:'false',TELEGRAM_BOT_TOKEN:'',TELEGRAM_ADMIN_CHAT_ID:''},stdio:['ignore','pipe','pipe']
  });
  server.stdout.on('data',chunk=>{output+=chunk;origin=output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0]??'';});
  server.stderr.on('data',chunk=>{output+=chunk;});
  let closeBrowser=async()=>{};
  t.after(async()=>{
    await closeBrowser();
    const exited=new Promise(resolve=>server.once('exit',resolve));
    if(server.exitCode===null){server.kill('SIGTERM');await exited;}
    for(let i=0;i<100&&socket.getStats().activeConnections>0;i++)await new Promise<void>(resolve=>setImmediate(resolve));
    await socket.stop();await new Promise<void>(resolve=>setImmediate(resolve));await db.close();
  });
  const browser=await chromium.launch({headless:true,executablePath:process.env.ISHTAR_TEST_BROWSER_EXECUTABLE||undefined,args:process.env.ISHTAR_TEST_BROWSER_ARGS?JSON.parse(process.env.ISHTAR_TEST_BROWSER_ARGS):['--no-sandbox']});
  closeBrowser=()=>browser.close();
  for(let i=0;i<100;i++){
    if(origin){try{if((await fetch(`${origin}/cart`)).ok)break;}catch{/* starting */}}
    if(server.exitCode!==null)throw Error(output);
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.ok(origin,output);
  assert.equal((await fetch(`${origin}/product/gallery-draft`)).status,404);
  assert.equal((await fetch(`${origin}/product/gallery-hidden`)).status,404);
  for(const mobile of [false,true])await t.test(mobile?'mobile':'desktop',async()=>{
    const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
    await context.route(url=>['http:','https:'].includes(url.protocol)&&url.origin!==origin,route=>route.abort());
    const page=await context.newPage();
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    try{
      const response=await page.goto(`${origin}/product/gallery-active`);assert.equal(response?.status(),200);
      const opener=page.getByRole('button',{name:'فتح معرض صور gallery-active',exact:true});
      await opener.click();
      const viewer=page.getByRole('dialog',{name:'معرض صور gallery-active',exact:true});await viewer.waitFor();
      assert.equal(await viewer.locator('img').count(),4); // one main, three thumbnails
      assert.match(await viewer.getByRole('status').innerText(),/1 من 3/);
      await viewer.getByRole('button',{name:'الصورة التالية',exact:true}).click();
      assert.match(await viewer.getByRole('status').innerText(),/2 من 3/);
      assert.match(await viewer.getByRole('link',{name:'الحجم الأصلي',exact:false}).getAttribute('href')??'',/image=1/);
      await page.keyboard.press('ArrowLeft');assert.match(await viewer.getByRole('status').innerText(),/3 من 3/);
      await viewer.getByRole('button',{name:'تكبير التفاصيل',exact:true}).click();
      assert.equal(await viewer.locator('.imageViewerStage.isZoomed').count(),1);
      await viewer.getByRole('button',{name:'الصورة التالية',exact:true}).click();
      assert.equal(await viewer.locator('.isZoomed').count(),0);assert.match(await viewer.getByRole('status').innerText(),/1 من 3/);
      if(mobile){
        const stage=viewer.locator('.imageViewerStage');
        await stage.dispatchEvent('pointerdown',{pointerType:'touch',isPrimary:true,clientX:30,clientY:200});
        await stage.dispatchEvent('pointerup',{pointerType:'touch',isPrimary:true,clientX:200,clientY:205});
        assert.match(await viewer.getByRole('status').innerText(),/2 من 3/);
      }
      await page.keyboard.press('Escape');await viewer.waitFor({state:'detached'});
      assert.equal(await opener.evaluate(el=>el===document.activeElement),true);
      assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
      await page.getByRole('button',{name:/^فتح الصورة 3:/}).click();await viewer.waitFor();
      assert.match(await viewer.getByRole('status').innerText(),/3 من 3/);
      await viewer.getByRole('button',{name:'إغلاق معرض الصور',exact:true}).click();
      await page.goto(`${origin}/category/all`);
      await page.getByRole('button',{name:'عرض سريع: gallery-active',exact:true}).click();
      const quick=page.getByRole('dialog',{name:'عرض سريع: gallery-active',exact:true});await quick.waitFor();
      await quick.getByRole('button',{name:'فتح معرض صور gallery-active',exact:true}).click();await viewer.waitFor();
      await page.keyboard.press('Escape');await viewer.waitFor({state:'detached'});
      assert.equal(await quick.isVisible(),true);assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden');
      await quick.getByRole('button',{name:'إغلاق العرض السريع',exact:true}).click();
      assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
      await context.addCookies([{name:'bah_admin_session',value:token,url:origin}]);
      await page.goto(`${origin}/admin/products`);
      const scope=page.locator(mobile?'.adminOnlyMobile':'.adminOnlyDesktop');
      const draft=scope.locator(mobile?'.adminRecordCard':'tr').filter({hasText:'gallery-draft'});
      assert.equal(await draft.getByRole('link',{name:'عرض',exact:true}).count(),0);
      assert.match(await draft.innerText(),/غير منشور/);
      await draft.getByRole('button',{name:'عرض صور gallery-draft',exact:true}).click();
      const draftViewer=page.getByRole('dialog',{name:'معرض صور gallery-draft',exact:true});await draftViewer.waitFor();
      assert.match(await draftViewer.getByRole('status').innerText(),/1 من 3/);
      await draftViewer.getByRole('button',{name:'إغلاق معرض الصور',exact:true}).click();
      // Verify activation updates the action and public route immediately.
      if(!mobile){
        await draft.getByRole('button',{name:'تفعيل',exact:true}).click();
        await draft.getByRole('link',{name:'عرض',exact:true}).waitFor();
        assert.equal((await fetch(`${origin}/product/gallery-draft`)).status,200);
        await db.query(`UPDATE "Product" SET status='DRAFT' WHERE id='gallery-draft'`);
      }
      const hidden=scope.locator(mobile?'.adminRecordCard':'tr').filter({hasText:'gallery-hidden'});
      assert.equal(await hidden.getByRole('link',{name:'عرض',exact:true}).count(),0);
      await page.goto(`${origin}/admin/products/gallery-active/edit`);
      await page.getByRole('button',{name:'عرض صور gallery-active',exact:true}).last().click();await viewer.waitFor();
      assert.match(await viewer.getByRole('status').innerText(),/3 من 3/);
      await viewer.getByRole('button',{name:'إغلاق معرض الصور',exact:true}).click();
      assert.equal(await page.getByLabel('رابط الصورة *',{exact:true}).count(),3);
      assert.equal(await page.locator('[id="product-image-url-2"]').count(),1);
      assert.deepEqual(errors,[]);
      if(process.env.ISHTAR_GALLERY_SCREENSHOTS){
        await page.getByRole('button',{name:'عرض صور gallery-active',exact:true}).last().click();
        await page.screenshot({path:`${process.env.ISHTAR_GALLERY_SCREENSHOTS}/gallery-${mobile?'mobile':'desktop'}.png`});
      }
    }finally{await context.close();}
  });
});
