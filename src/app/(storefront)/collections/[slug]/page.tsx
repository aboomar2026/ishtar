import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CollectionSymbol } from "@/components/CollectionCard";
import { ProductGrid } from "@/components/ProductGrid";
import { getCollection, getCollectionSummary } from "@/features/collections/collections.queries";
import { publicSiteUrl } from "@/lib/site-url";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getCollectionSummary(slug);
  if (!collection)
    return { title: "المجموعة غير موجودة", robots: { index: false } };
  return {
    title: `${collection.name} | عشتار`,
    description: collection.description,
    alternates: publicSiteUrl()
      ? { canonical: `/collections/${encodeURIComponent(slug)}` }
      : undefined,
    openGraph: {
      title: collection.name,
      description: collection.description,
      images: collection.imageUrl
        ? [collection.imageUrl]
        : collection.images.slice(0, 1),
    },
  };
}
export default async function CollectionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const rawPage = (await searchParams).page;
  const collection = await getCollection(slug, Number(rawPage) || 1);
  if (!collection) notFound();
  if (rawPage !== undefined && rawPage !== String(collection.page)) {
    const path = `/collections/${encodeURIComponent(slug)}`;
    redirect(collection.page === 1 ? path : `${path}?page=${collection.page}`);
  }
  return (
    <section className="contentSection">
      <nav className="collectionBreadcrumb" aria-label="مسار التصفح">
        <Link href="/">الرئيسية</Link>
        <span>/</span>
        <Link href="/collections">المجموعات</Link>
        <span>/</span>
        <span>{collection.name}</span>
      </nav>
      <div
        className={`collectionIntro collectionPageIntro collectionTone-${collection.tone}`}
      >
        <CollectionSymbol symbol={collection.symbol} size={40} />
        <div>
          <span className="eyebrow">ISHTAR · COLLECTION</span>
          <h1>{collection.name}</h1>
          <p>{collection.description}</p>
          <small>{collection.productCount} منتجات مختارة</small>
        </div>
      </div>
      <ProductGrid products={collection.products} />
      {collection.pageCount > 1 && (
        <nav className="collectionPagination" aria-label="صفحات المجموعة">
          {collection.page > 1 && (
            <Link className="ghostButton" href={`?page=${collection.page - 1}`}>
              السابق
            </Link>
          )}
          <span>
            صفحة {collection.page} من {collection.pageCount}
          </span>
          {collection.page < collection.pageCount && (
            <Link className="ghostButton" href={`?page=${collection.page + 1}`}>
              التالي
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}
