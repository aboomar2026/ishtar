import Link from 'next/link';
import { getCollections, getComplements } from '@/features/collections/collections.queries';
import { RecentlyViewed, RecordProductView } from '@/components/RecentlyViewed';
import type { Metadata } from 'next';
import { brand } from '@/lib/brand';
import { publicSiteUrl } from '@/lib/site-url';
import { notFound } from 'next/navigation';
import { ProductDetailClient } from '@/components/ProductDetailClient';
import { ProductGrid } from '@/components/ProductGrid';
import { getProductBySlug, getRelatedProducts } from '@/features/catalog/catalog.queries';

export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: `المنتج غير موجود | ${brand.name}`, robots: { index: false } };
  const title = `${product.name} | ${brand.name}`;
  const description = product.description.slice(0, 180);
  return { title, description, alternates: publicSiteUrl() ? { canonical: `/product/${encodeURIComponent(slug)}` } : undefined, openGraph: { title, description, images: [product.image] } };
}


export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const [groups, complements] = await Promise.all([getCollections({ productId: product.id, limit: 6 }), getComplements(product.id)]);
  const related = complements.length ? complements : await getRelatedProducts(product.id, product.categoryId);

  return (
    <div className="productPage">
      <RecordProductView id={product.id} />
      <ProductDetailClient product={product} shareOrigin={publicSiteUrl()?.origin} />
      {groups.length > 0 && <nav className="collectionPills" aria-label="مجموعات هذا المنتج">{groups.map(group => <Link key={group.id} href={`/collections/${encodeURIComponent(group.slug)}`}>{group.name}</Link>)}</nav>}
      {related.length > 0 && <section className="contentSection">
        <div className="sectionHeader">
          <div>
            <span className="eyebrow">You may also like</span>
            <h2>{complements.length ? 'يكمّل اختيارك' : 'منتجات مشابهة'}</h2>
          </div>
        </div>
        <ProductGrid products={related} />
      </section>}
      <RecentlyViewed excludeId={product.id} />
    </div>
  );
}
