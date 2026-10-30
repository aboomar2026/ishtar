import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import test from 'node:test';
import {PGlite} from '@electric-sql/pglite';
import {PGLiteSocketServer} from '@electric-sql/pglite-socket';
import {enrichmentSchema} from '../src/features/admin/products/catalog-enrichment.validation';

test('catalog enrichment preserves commerce data and rejects stale edits',{timeout:90000},async t=>{
 const db=new PGlite();
 await db.exec(execFileSync(process.execPath,['node_modules/prisma/build/index.js','migrate','diff','--from-empty','--to-schema-datamodel','prisma/schema.prisma','--script'],{encoding:'utf8'}));
 const socket=new PGLiteSocketServer({db,host:'127.0.0.1',port:0});await socket.start();const address=socket.getServerConn();
 process.env.DATABASE_URL=`${address.startsWith('postgres')?address:`postgresql://postgres:test@${address}/postgres`}?connection_limit=1&sslmode=disable`;
 const {prisma}=await import('../src/lib/prisma');const {applyCatalogEnrichment}=await import('../src/features/admin/products/catalog-enrichment');
 t.after(async()=>{await prisma.$disconnect();await socket.stop();await db.close();});
 await prisma.category.create({data:{id:'cat',name:'العناية بالجسم',slug:'body-care'}});
 for(let i=1;i<=3;i++)await prisma.product.create({data:{id:`p${i}`,name:`منتج ${i}`,slug:`product-${i}`,description:'وصف المنتج الأصلي',categoryId:'cat',status:'ACTIVE',basePrice:35,images:{create:{url:`https://res.cloudinary.com/store/image/upload/item${i}.jpg`,isPrimary:true}},variants:{create:{sku:`IS-P00${i}`,price:35,quantity:9}}}});
 const initial=await prisma.product.findUniqueOrThrow({where:{id:'p1'},include:{images:true,variants:true}});
 const input={mode:'product' as const,sku:'IS-P001',expectedVersion:initial.updatedAt.toISOString(),name:'اسم المنتج',subtitle:'عنوان قصير واضح',description:'وصف كامل للمنتج بتفاصيل مرئية ومؤكدة.',details:['لون العبوة: أخضر','عبوة بمضخة'],brand:'Vaseline',careInstructions:'تحفظ العبوة مغلقة بعيدًا عن أشعة الشمس.',tags:['لوشن','العناية بالجسم'],categorySlug:'body-care',complementSkus:['IS-P002','IS-P003']};
 await t.test('updates content and complements without touching images or inventory',async()=>{
  await applyCatalogEnrichment(input);const after=await prisma.product.findUniqueOrThrow({where:{id:'p1'},include:{images:true,variants:true,complements:true}});
  assert.equal(after.subtitle,input.subtitle);assert.equal(after.images[0].id,initial.images[0].id);assert.equal(after.variants[0].quantity,9);assert.equal(after.variants[0].price.toNumber(),35);assert.equal(after.complements.length,2);
 });
 await t.test('stale snapshot cannot overwrite a saved edit',async()=>{await assert.rejects(applyCatalogEnrichment(input),/تغير المنتج/);});
 await t.test('discount uses the actual current price and keeps variant pricing aligned',async()=>{
  const current=await prisma.product.findUniqueOrThrow({where:{id:'p1'}});await applyCatalogEnrichment({...input,expectedVersion:current.updatedAt.toISOString(),salePrice:30,expectedRegularPrice:35});
  const after=await prisma.product.findUniqueOrThrow({where:{id:'p1'},include:{variants:true}});assert.equal(after.basePrice.toNumber(),30);assert.equal(after.compareAtPrice?.toNumber(),35);assert.equal(after.variants[0].price.toNumber(),30);assert.equal(after.variants[0].compareAtPrice?.toNumber(),35);
 });
 await t.test('rejects invented comparison price and rolls back the text update',async()=>{
  const current=await prisma.product.findUniqueOrThrow({where:{id:'p2'}});await assert.rejects(applyCatalogEnrichment({...input,sku:'IS-P002',expectedVersion:current.updatedAt.toISOString(),name:'لن يحفظ',complementSkus:['IS-P001','IS-P003'],salePrice:30,expectedRegularPrice:50}),/تغير السعر/);
  assert.equal((await prisma.product.findUniqueOrThrow({where:{id:'p2'}})).name,current.name);
 });
 await t.test('creates a populated collection with a real image and rejects duplicate stale creation',async()=>{
  const group={mode:'collection' as const,slug:'daily-care',name:'العناية اليومية',description:'منتجات مختارة لتفاصيل العناية اليومية.',expectedVersion:null,coverSku:'IS-P001',memberSkus:['IS-P001','IS-P002'],symbol:'flower' as const,tone:'sage' as const,showOnHome:true,sortOrder:1,keywords:['عناية']};
  await applyCatalogEnrichment(group);const after=await prisma.collection.findUniqueOrThrow({where:{slug:group.slug},include:{products:true}});assert.equal(after.products.length,2);assert.equal(after.imageUrl,initial.images[0].url);assert.equal(after.isActive,true);await assert.rejects(applyCatalogEnrichment(group),/تغيرت المجموعة/);
 });
 await t.test('validates care copy, relationships and honest discount bounds',()=>{
  assert.equal(enrichmentSchema.safeParse(input).success,true);
  for(const patch of [{careInstructions:''},{complementSkus:['IS-P001','IS-P002']},{salePrice:40,expectedRegularPrice:35}])assert.equal(enrichmentSchema.safeParse({...input,...patch}).success,false);
 });
});
