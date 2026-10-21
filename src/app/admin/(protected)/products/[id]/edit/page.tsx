import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminProductById, getCategoryOptions } from '@/features/admin/products/product-admin.queries';
import { ProductForm, type ProductFormInitial } from '@/components/admin/ProductForm';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([getAdminProductById(id), getCategoryOptions()]);

  if (!product) notFound();

  const initial: ProductFormInitial = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    subtitle: product.subtitle,
    description: product.description,
    details: product.details,
    careInstructions: product.careInstructions,
    brand: product.brand,
    categoryId: product.categoryId,
    basePrice: product.basePrice,
    compareAtPrice: product.compareAtPrice,
    status: product.status,
    isFeatured: product.isFeatured,
    isNewArrival: product.isNewArrival,
    isBestSeller: product.isBestSeller,
    tags: product.tags,
    images: product.images.map((image) => ({ id: image.id, url: image.url, alt: image.alt, isPrimary: image.isPrimary, cloudinaryPublicId: image.cloudinaryPublicId })),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      colorName: variant.colorName,
      colorValue: variant.colorValue,
      size: variant.size,
      price: String(variant.price),
      compareAtPrice: variant.compareAtPrice != null ? String(variant.compareAtPrice) : '',
      quantity: String(variant.quantity),
      lowStockThreshold: String(variant.lowStockThreshold),
      isActive: variant.isActive
    }))
  };

  return (
    <div>
      <div className="adminPageHeader">
        <div>
          <h1>تعديل المنتج</h1>
          <p className="adminMuted">{product.name}</p>
        </div>
        <div className="adminBtnRow">
          <Link href={`/product/${product.slug}`} className="adminBtn adminBtnGhost" target="_blank">عرض في المتجر</Link>
          <Link href="/admin/products" className="adminBtn adminBtnGhost">→ رجوع</Link>
        </div>
      </div>
      <ProductForm mode="edit" productId={product.id} categories={categories} initial={initial} />
    </div>
  );
}
