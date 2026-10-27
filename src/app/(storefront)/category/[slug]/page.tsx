import { getCollections } from '@/features/collections/collections.queries';
import { CollectionCard } from '@/components/CollectionCard';
import type { Metadata } from 'next';
import Link from '@/components/NavigationLink';
import Form from '@/components/NavigationForm';
import { buildPageMetadata, catalogPath, categorySeoPath, hasCatalogFacets } from '@/lib/seo';
import { breadcrumbData } from '@/lib/structured-data';
import { JsonLd } from '@/components/JsonLd';
import { getCategoryPage, type CategorySearchParams } from '@/features/catalog/catalog-page';
import { notFound } from 'next/navigation';
import { CategoryStrip } from '@/components/CategoryStrip';
import { ClearableSearchInput } from '@/components/ClearableSearchInput';
import { ProductGrid } from '@/components/ProductGrid';
import { brand } from '@/lib/brand';

export const dynamic = 'force-dynamic';
export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<CategorySearchParams> }): Promise<Metadata> {
  const { slug } = await params;
  const values = await searchParams;
  const result = await getCategoryPage(slug, JSON.stringify(values));
  if (!result || result.page > result.pageCount) notFound();
  return buildPageMetadata({ title: `${result.category.name}${result.page > 1 ? ` — صفحة ${result.page}` : ''} | ${brand.name}`,
    description: result.category.description, path: categorySeoPath(slug, result.page), image: result.category.imageUrl,
    noindex: hasCatalogFacets(values) || result.total === 0 });
}

export default async function CategoryPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<CategorySearchParams>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const result = await getCategoryPage(slug, JSON.stringify(resolvedSearchParams));

  if (!result || result.page > result.pageCount) notFound();
  const filters = result.filters;

  const query = filters.q ?? '';
  const matchingGroups = query.length >= 2 ? await getCollections({ q: query, limit: 3 }) : [];
  function pageHref(page: number) {
    const values = new URLSearchParams();
    for (const [key, value] of Object.entries(resolvedSearchParams)) if (value && key !== 'page') values.set(key, Array.isArray(value) ? value[0] : value);
    if (page > 1) values.set('page', String(page));
    return `${catalogPath('category', slug)}${values.size ? `?${values.toString()}` : ''}`;
  }
  const isFiltered = Boolean(
    query ||
      (filters.sort && filters.sort !== 'newest') ||
      (filters.availability && filters.availability !== 'all') ||
      filters.minPrice != null ||
      filters.maxPrice != null
  );

  return (
    <div className="categoryPage">
      <JsonLd data={breadcrumbData([{ name: 'الرئيسية', path: '/' }, { name: result.category.name, path: categorySeoPath(slug, result.page) }])} />
      <nav aria-label="مسار التنقل" className="seoBreadcrumbs"><Link href="/">الرئيسية</Link> / <span aria-current="page">{result.category.name}</span></nav>
      <section className="categoryHero">
        <span className="eyebrow">{brand.copy.categoryEyebrow}</span>
        <h1>{query ? `نتائج البحث: ${query}` : result.category.name}</h1>
        <p>{query ? brand.copy.categorySearchDescription : result.category.description}</p>
      </section>
      {matchingGroups.length > 0 && <section className="contentSection"><h2>مجموعات تناسب بحثك</h2><div className="collectionGrid">{matchingGroups.map(collection => <CollectionCard key={collection.id} collection={collection} />)}</div></section>}
      <CategoryStrip categories={result.categories} activeSlug={slug} />
      <Form className="filterRow" action={`/category/${slug}`}>
        <ClearableSearchInput key={query} name="q" defaultValue={query} placeholder="بحث داخل التصنيف" ariaLabel="بحث داخل التصنيف" submitOnClear />
        <select name="sort" defaultValue={filters.sort ?? 'newest'} aria-label="ترتيب المنتجات">
          <option value="newest">الأحدث</option>
          <option value="best-sellers">الأكثر مبيعاً</option>
          <option value="price-asc">السعر: الأقل أولاً</option>
          <option value="price-desc">السعر: الأعلى أولاً</option>
        </select>
        <select name="availability" defaultValue={filters.availability ?? 'all'} aria-label="التوفر">
          <option value="all">كل المنتجات</option>
          <option value="in-stock">المتوفر فقط</option>
        </select>
        <button type="submit">تطبيق</button>
        {isFiltered ? <Link className="filterClear" href={`/category/${slug}`}>مسح الكل</Link> : null}
        <span className="filterCount">{result.total} منتج</span>
      </Form>
      <ProductGrid products={result.products} />
      {result.pageCount > 1 && <nav className="catalogPagination" aria-label="صفحات المنتجات">
        {result.page > 1 && <Link className="ghostButton" href={pageHref(result.page - 1)}>السابق</Link>}
        <span>صفحة {result.page} من {result.pageCount} · {result.total} منتج</span>
        {result.page < result.pageCount && <Link className="ghostButton" href={pageHref(result.page + 1)}>التالي</Link>}
      </nav>}
    </div>
  );
}
