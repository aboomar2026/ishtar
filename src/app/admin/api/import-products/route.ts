import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAdminSession } from '@/features/admin/auth/admin-auth';
import { hasAdminPermission } from '@/features/admin/auth/admin-permissions';
import { catalogImportSchema } from '@/features/admin/products/catalog-import.validation';
import { uploadImageBuffer, deleteImageByPublicId } from '@/lib/cloudinary';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Authenticated, same-origin catalog intake. Images stay private until Cloudinary accepts them. */
export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session || !hasAdminPermission(session.role, 'catalog')) {
    return NextResponse.json({ error: 'يلزم تسجيل الدخول بحساب إدارة الكتالوج.' }, { status: 401 });
  }
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 });
  }
  const text = await request.text();
  if (Buffer.byteLength(text) > 4_400_000) {
    return NextResponse.json({ error: 'حجم بيانات المنتج أكبر من الحد المسموح.' }, { status: 413 });
  }
  let raw: unknown;
  try { raw = JSON.parse(text); } catch {
    return NextResponse.json({ error: 'بيانات JSON غير صالحة.' }, { status: 400 });
  }
  const parsed = catalogImportSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'بيانات المنتج غير مكتملة.', fields: parsed.error.issues.map(i => i.path.join('.')) }, { status: 400 });
  }
  const input = parsed.data;
  const existing = await prisma.product.findUnique({ where: { slug: input.slug }, select: { id: true, slug: true, variants: { select: { sku: true } } } });
  if (existing) {
    if (!existing.variants.some(v => v.sku === input.sku)) {
      return NextResponse.json({ error: 'الرابط مستخدم لمنتج آخر؛ لم يتغير أي منتج.' }, { status: 409 });
    }
    return NextResponse.json({ ok: true, result: 'existing', id: existing.id, slug: existing.slug });
  }
  // Validate the entire item, including decoded sizes, before uploading any images.
  const buffers = input.images.map(image => Buffer.from(image.base64, 'base64'));
  if (buffers.some(buffer => buffer.length === 0 || buffer.length > 3_000_000)) {
    return NextResponse.json({ error: 'حجم الصورة غير صالح.' }, { status: 400 });
  }
  const uploaded: Awaited<ReturnType<typeof uploadImageBuffer>>[] = [];
  let committed = false;
  try {
    for (const buffer of buffers) uploaded.push(await uploadImageBuffer(buffer, 'product'));
    const result = await prisma.$transaction(async tx => {
      const category = await tx.category.upsert({
        where: { slug: input.category.slug },
        create: { ...input.category, imageUrl: uploaded[0].secureUrl, isActive: true },
        update: {},
        select: { id: true }
      });
      const product = await tx.product.create({
        data: {
          name: input.name, slug: input.slug, description: input.description,
          details: input.details, brand: input.brand || null,
          categoryId: category.id, basePrice: input.basePrice, status: 'ACTIVE',
          isFeatured: input.isFeatured, isNewArrival: true,
          images: { create: uploaded.map((image, index) => ({
            url: image.secureUrl, cloudinaryPublicId: image.publicId,
            alt: input.images[index].alt, sortOrder: index, isPrimary: index === 0
          })) },
          variants: { create: {
            sku: input.sku, price: input.basePrice, quantity: input.quantity,
            lowStockThreshold: 3, isActive: true
          } }
        },
        select: { id: true, slug: true, variants: { select: { id: true } } }
      });
      if (input.quantity > 0) await tx.inventoryLog.create({ data: {
        productId: product.id, variantId: product.variants[0].id,
        type: 'RESTOCK', quantityChange: input.quantity, note: 'إدخال المخزون الأولي للكتالوج'
      } });
      return product;
    }, { maxWait: 10000, timeout: 20000 });
    committed = true;
    for (const path of ['/', '/admin', '/admin/products', '/admin/inventory', '/admin/categories', `/category/${input.category.slug}`, `/product/${result.slug}`]) revalidatePath(path);
    return NextResponse.json({ ok: true, result: 'created', id: result.id, slug: result.slug });
  } catch {
    // Only remove new assets from this failed request, never assets attached to existing products.
    if (!committed) await Promise.allSettled(uploaded.map(image => deleteImageByPublicId(image.publicId)));
    return NextResponse.json({ error: 'تعذر إكمال الاستيراد. أعد المحاولة؛ المنتجات الموجودة لن تتكرر.' }, { status: 500 });
  }
}
