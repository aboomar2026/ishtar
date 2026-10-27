import { getProductCollectionLinks, getCollectionRecommendations } from '@/features/collections/collections.queries';
import { RecentlyViewed, RecordProductView } from '@/components/RecentlyViewed';
import type { Metadata } from 'next';
import { brand } from '@/lib/brand';
import { publicSiteUrl } from '@/lib/site-url';
import Link from '@/components/NavigationLink';
import { buildPageMetadata, catalogPath } from '@/lib/seo';
import { breadcrumbData, productData } from '@/lib/structured-data';
import { JsonLd } from '@/components/JsonLd';
import { notFound } from 'next/navigation';
import { ProductDetailClient } from '@/components/ProductDetailClient';
import { ProductGrid } from '@/components/ProductGrid';
import { getProductBySlug, getRelatedProducts } from '@/features/catalog/catalog.queries';

export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  return buildPageMetadata({ title: `${product.name} | ${brand.name}`, description: product.description,
    path: catalogPath('product', product.slug), image: product.images.length ? product.image : undefined });
}


export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const breadcrumbs = [{ name: 'الرئيسية', path: '/' },
    ...(product.category ? [{ name: product.category.name, path: catalogPath('category', product.category.slug) }] : []),
    { name: product.name, path: catalogPath('product', product.slug) }];
  const [groups, recommendation] = await Promise.all([getProductCollectionLinks(product.id), getCollectionRecommendations(product.id)]);
  const related = recommendation.products.length ? recommendation.products : await getRelatedProducts(product.id, product.categoryId);

  return (
    <div className="productPage">
      <JsonLd data={productData(product)} />
      <JsonLd data={breadcrumbData(breadcrumbs)} />
      <nav aria-label="مسار التنقل" className="seoBreadcrumbs">
        {breadcrumbs.map((item, index) => <span key={item.path}>{index > 0 && ' / '}{index === breadcrumbs.length - 1 ? <span aria-current="page">{item.name}</span> : <Link href={item.path}>{item.name}</Link>}</span>)}
      </nav>
      <RecordProductView id={product.id} />
      <ProductDetailClient product={product} shareOrigin={publicSiteUrl()?.origin} />
      {groups.length > 0 && <nav className="collectionPills" aria-label="مجموعات هذا المنتج">{groups.map(group => <Link key={group.id} href={`/collections/${encodeURIComponent(group.slug)}`}>{group.name}</Link>)}</nav>}
      {related.length > 0 && <section className="contentSection">
        <div className="sectionHeader">
          <div>
            <span className="eyebrow">You may also like</span>
            <h2>{recommendation.products.length ? recommendation.kind === 'manual' ? 'يكمّل اختيارك' : 'اختيارات من نفس المجموعات' : 'منتجات مشابهة'}</h2>
          </div>
        </div>
        <ProductGrid products={related} />
      </section>}
      <RecentlyViewed excludeId={product.id} />
    </div>
  );
}
