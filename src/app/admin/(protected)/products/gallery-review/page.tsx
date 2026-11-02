import Link from '@/components/NavigationLink';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/features/admin/auth/admin-auth';
import { GalleryReviewRow } from '@/components/admin/GalleryReviewRow';

export const dynamic = 'force-dynamic';

export default async function GalleryReviewPage() {
  await requireAdmin();
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 40,
    select: {
      id: true, name: true,
      images: { orderBy: { sortOrder: 'asc' }, select: { url: true, isPrimary: true } }
    }
  });
  return (
    <div>
      <div className="adminPageHeader">
        <div>
          <h1>مراجعة صور المنتجات</h1>
          <p className="adminMuted">اختاري المنتج الصحيح، وقارني الصورة الجديدة بالصورة الأصلية قبل الإضافة. تظهر أحدث 40 منتجًا.</p>
        </div>
        <Link href="/admin/products" className="adminBtn">العودة للمنتجات</Link>
      </div>
      <div className="adminCard" style={{ padding: 16, marginBottom: 20 }}>
        يتم إضافة كل صورة إلى المعرض فقط، دون استبدال الصورة الرئيسية. الصور المولدة بالذكاء الاصطناعي قد تحتوي على تفاصيل غير صحيحة؛ يجب مراجعتها قبل النشر.
      </div>
      {products.map(product =>
        <GalleryReviewRow key={product.id} productId={product.id} productName={product.name}
          imageCount={product.images.length}
          primaryUrl={product.images.find(image => image.isPrimary)?.url ?? product.images[0]?.url ?? null} />
      )}
    </div>
  );
}
