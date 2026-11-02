'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/features/admin/auth/admin-auth';

export type GalleryAppendResult = { ok: boolean; message: string };

export async function appendReviewedGalleryImage(
  productId: string,
  secureUrl: string,
  publicId: string
): Promise<GalleryAppendResult> {
  await requireAdmin();
  if (!productId || !secureUrl || !publicId) return { ok: false, message: 'بيانات الصورة ناقصة.' };
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const folder = process.env.CLOUDINARY_FOLDER;
  if (!cloud || !folder) return { ok: false, message: 'إعدادات الصور غير متاحة.' };
  let parsed: URL;
  try { parsed = new URL(secureUrl); } catch { return { ok: false, message: 'رابط الصورة غير صالح.' }; }
  if (
    parsed.protocol !== 'https:' || parsed.hostname !== 'res.cloudinary.com' ||
    !parsed.pathname.startsWith('/' + cloud + '/image/upload/') ||
    !publicId.startsWith(folder + '/products/') ||
    !decodeURIComponent(parsed.pathname).includes('/' + publicId + '.')
  ) {
    return { ok: false, message: 'الصورة لا تنتمي إلى مساحة صور عشتار.' };
  }
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true, slug: true, name: true, category: { select: { slug: true } } }
  });
  if (!product) return { ok: false, message: 'المنتج غير موجود.' };
  try {
    await prisma.$transaction(async tx => {
      const alreadyLinked = await tx.productImage.findFirst({ where: { cloudinaryPublicId: publicId }, select: { id: true } });
      if (alreadyLinked) throw new Error('DUPLICATE');
      const max = await tx.productImage.aggregate({ where: { productId }, _max: { sortOrder: true } });
      await tx.productImage.create({
        data: {
          productId,
          url: secureUrl,
          cloudinaryPublicId: publicId,
          sortOrder: (max._max.sortOrder ?? -1) + 1,
          isPrimary: false,
          alt: product.name + ' — صورة توضيحية'
        }
      });
    });
  } catch {
    return { ok: false, message: 'تعذّر ربط الصورة؛ تأكد أنها غير مكررة.' };
  }
  revalidatePath('/admin/products/gallery-review');
  revalidatePath('/admin/products');
  revalidatePath('/product/' + product.slug);
  revalidatePath('/category/' + product.category.slug);
  revalidatePath('/');
  return { ok: true, message: 'تمت إضافة الصورة مع الاحتفاظ بجميع الصور الأصلية.' };
}
