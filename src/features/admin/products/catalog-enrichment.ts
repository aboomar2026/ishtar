import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { z } from 'zod';
import { enrichmentSchema } from './catalog-enrichment.validation';
export type EnrichmentInput = z.infer<typeof enrichmentSchema>;
export class CatalogConflict extends Error {}

export async function applyCatalogEnrichment(input: EnrichmentInput) {
  return prisma.$transaction(async tx => {
    if (input.mode === 'product') {
      const variant = await tx.productVariant.findUnique({where:{sku:input.sku},select:{productId:true}});
      if (!variant) throw new CatalogConflict('رقم المنتج غير موجود.');
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Product" WHERE id = ${variant.productId} FOR UPDATE`);
      const product = await tx.product.findUniqueOrThrow({where:{id:variant.productId},include:{category:true,variants:true,complements:{orderBy:{sortOrder:'asc'}}}});
      if (product.deletedAt || product.updatedAt.toISOString() !== input.expectedVersion) throw new CatalogConflict('تغير المنتج بعد مراجعة البيانات؛ حدّث النسخة قبل المحاولة.');
      const category = await tx.category.findUnique({where:{slug:input.categorySlug}});
      if (!category || !category.isActive) throw new CatalogConflict('التصنيف غير متاح.');
      const targets = await tx.productVariant.findMany({where:{sku:{in:input.complementSkus},isActive:true,product:{status:'ACTIVE',deletedAt:null}},select:{sku:true,productId:true}});
      if (new Set(targets.map(t=>t.sku)).size !== input.complementSkus.length) throw new CatalogConflict('أحد المنتجات المكملة غير متاح.');
      const sale = input.salePrice !== undefined;
      // Discount the actual current published price; never invent a previous price.
      if (sale && (product.basePrice.toNumber() !== input.expectedRegularPrice || product.compareAtPrice || product.variants.some(v=>v.price.toNumber()!==input.expectedRegularPrice || v.compareAtPrice))) throw new CatalogConflict('تغير السعر أو توجد أسعار خيارات مختلفة؛ يحتاج العرض مراجعة.');
      await tx.product.update({where:{id:product.id},data:{
        name:input.name,subtitle:input.subtitle,description:input.description,details:input.details,
        brand:input.brand,careInstructions:input.careInstructions,tags:input.tags,categoryId:category.id,
        ...(sale?{basePrice:input.salePrice,compareAtPrice:input.expectedRegularPrice}:{})
      }});
      if (sale) await tx.productVariant.updateMany({where:{productId:product.id},data:{price:input.salePrice,compareAtPrice:input.expectedRegularPrice}});
      // Preserve manually curated links; add suitable suggestions up to the existing eight-item limit.
      const targetMap = new Map(targets.map(t=>[t.sku,t.productId]));
      const ordered = [...new Set([...product.complements.map(c=>c.targetId),...input.complementSkus.map(s=>targetMap.get(s)!)])].filter(id=>id!==product.id).slice(0,8);
      for (const [sortOrder,targetId] of ordered.entries()) await tx.productComplement.upsert({where:{productId_targetId:{productId:product.id,targetId}},create:{productId:product.id,targetId,sortOrder},update:{sortOrder}});
      return {name:input.name,slug:product.slug,categorySlugs:[category.slug,product.category.slug],result:'updated'};
    }
    const existing = await tx.collection.findUnique({where:{slug:input.slug}});
    if ((existing?.updatedAt.toISOString()??null) !== input.expectedVersion) throw new CatalogConflict('تغيرت المجموعة؛ حدّث النسخة قبل الحفظ.');
    const variants = await tx.productVariant.findMany({where:{sku:{in:input.memberSkus},isActive:true,product:{status:'ACTIVE',deletedAt:null}},select:{sku:true,productId:true,product:{select:{images:{orderBy:{sortOrder:'asc'}}}}}});
    if (variants.length !== input.memberSkus.length) throw new CatalogConflict('أحد منتجات المجموعة غير متاح.');
    const cover = variants.find(v=>v.sku===input.coverSku)?.product.images;
    const imageUrl = cover?.[1]?.url || cover?.[0]?.url;
    if (!imageUrl) throw new CatalogConflict('المجموعة تحتاج صورة فعلية من منتجاتها.');
    const collection = await tx.collection.upsert({where:{slug:input.slug},create:{name:input.name,slug:input.slug,description:input.description,imageUrl,symbol:input.symbol,tone:input.tone,keywords:input.keywords,isActive:true,showOnHome:input.showOnHome,sortOrder:input.sortOrder},update:{name:input.name,description:input.description,imageUrl,symbol:input.symbol,tone:input.tone,keywords:input.keywords,isActive:true,showOnHome:input.showOnHome,sortOrder:input.sortOrder}});
    const ids = new Map(variants.map(v=>[v.sku,v.productId]));
    await tx.collectionProduct.deleteMany({where:{collectionId:collection.id}});
    await tx.collectionProduct.createMany({data:input.memberSkus.map((s,sortOrder)=>({collectionId:collection.id,productId:ids.get(s)!,sortOrder}))});
    return {name:input.name,slug:input.slug,categorySlugs:[],result:'collection'};
  },{maxWait:10000,timeout:20000});
}
