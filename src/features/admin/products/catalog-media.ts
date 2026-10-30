import 'server-only';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { uploadImageBuffer } from '@/lib/cloudinary';
import type { CatalogMediaInput } from './catalog-media.validation';
import { CatalogConflict } from './catalog-enrichment';
export async function appendCatalogMedia(input: CatalogMediaInput, upload = uploadImageBuffer) {
  const variant = await prisma.productVariant.findUnique({where:{sku:input.sku},select:{productId:true}});
  if (!variant) throw new CatalogConflict('رقم المنتج غير موجود.');
  const product = await prisma.product.findUniqueOrThrow({where:{id:variant.productId},include:{category:true,images:{orderBy:[{isPrimary:'desc'},{sortOrder:'asc'}]}}});
  if (product.deletedAt || product.images[0]?.id !== input.expectedPrimaryImageId) throw new CatalogConflict('تغيرت الصورة الرئيسية؛ حدّث المرجع قبل الإضافة.');
  const buffer = Buffer.from(input.base64,'base64');
  if (buffer.length > 1_950_000) throw new CatalogConflict('حجم الصورة أكبر من الحد المسموح.');
  const key = `gallery-${input.sku.toLowerCase()}-${createHash('sha256').update(buffer).digest('hex').slice(0,24)}`;
  const existing = product.images.find(image=>image.cloudinaryPublicId?.endsWith(`/${key}`));
  const result = {name:product.name,slug:product.slug,categorySlugs:[product.category.slug],result:'updated'};
  if (existing) return {...result,imageId:existing.id,alreadyPresent:true};
  const uploaded = await upload(buffer,'product',key);
  return prisma.$transaction(async tx=>{
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Product" WHERE id = ${product.id} FOR UPDATE`);
    const current = await tx.product.findUniqueOrThrow({where:{id:product.id},include:{images:{orderBy:[{isPrimary:'desc'},{sortOrder:'asc'}]}}});
    if (current.deletedAt || current.images[0]?.id !== input.expectedPrimaryImageId) throw new CatalogConflict('تغيرت الصورة الرئيسية؛ لم تُضف الصورة الجديدة.');
    const duplicate = current.images.find(image=>image.cloudinaryPublicId===uploaded.publicId);
    if (duplicate) return {...result,imageId:duplicate.id,alreadyPresent:true};
    const image = await tx.productImage.create({data:{productId:product.id,url:uploaded.secureUrl,cloudinaryPublicId:uploaded.publicId,alt:input.alt,isPrimary:false,sortOrder:Math.max(-1,...current.images.map(i=>i.sortOrder))+1}});
    await tx.product.update({where:{id:product.id},data:{updatedAt:new Date()}});
    return {...result,imageId:image.id,alreadyPresent:false};
  },{maxWait:10000,timeout:20000});
}
