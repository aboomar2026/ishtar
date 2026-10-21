import { notFound } from 'next/navigation';
import { ProductDetailClient } from '@/components/ProductDetailClient';
import { ProductGrid } from '@/components/ProductGrid';
import { getProductBySlug, getRelatedProducts } from '@/features/catalog/catalog.queries';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const related = await getRelatedProducts(product.id, product.categoryId);

  return (
    <div className="productPage">
      <ProductDetailClient product={product} />
      <section className="contentSection">
        <div className="sectionHeader">
          <div>
            <span className="eyebrow">You may also like</span>
            <h2>منتجات مشابهة</h2>
          </div>
        </div>
        <ProductGrid products={related} />
      </section>
    </div>
  );
}
