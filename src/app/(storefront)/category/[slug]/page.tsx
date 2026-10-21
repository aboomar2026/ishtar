import type { Metadata } from 'next';
import { publicSiteUrl } from '@/lib/site-url';
import { getCategoryBySlug } from '@/features/catalog/catalog.queries';
import { notFound } from 'next/navigation';
import { CategoryStrip } from '@/components/CategoryStrip';
import { ClearableSearchInput } from '@/components/ClearableSearchInput';
import { ProductGrid } from '@/components/ProductGrid';
import { getProductsByCategorySlug } from '@/features/catalog/catalog.queries';
import { normalizeCatalogFilters } from '@/features/catalog/catalog.filters';
import { brand } from '@/lib/brand';

export const dynamic = 'force-dynamic';
export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<CategoryPageSearchParams> }): Promise<Metadata> {
  const { slug } = await params;
  const filters = await searchParams;
  const category = await getCategoryBySlug(slug);
  return { title: `${category?.name ?? 'المنتجات'} | ${brand.name}`, description: category?.description,
    robots: filters.q || filters.sort || filters.availability || filters.page ? { index: false, follow: true } : undefined,
    alternates: publicSiteUrl() ? { canonical: `/category/${encodeURIComponent(slug)}` } : undefined };
}


type CategoryPageSearchParams = {
  q?: string;
  page?: string;
  sort?: string;
  availability?: string;
  minPrice?: string;
  maxPrice?: string;
};

export default async function CategoryPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<CategoryPageSearchParams>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = normalizeCatalogFilters(resolvedSearchParams);
  const result = await getProductsByCategorySlug(slug, filters);

  if (!result) notFound();

  const query = filters.q ?? '';
  function pageHref(page: number) {
    const values = new URLSearchParams();
    for (const [key, value] of Object.entries(resolvedSearchParams)) if (value && key !== 'page') values.set(key, value);
    values.set('page', String(page));
    return `/category/${slug}?${values.toString()}`;
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
      <section className="categoryHero">
        <span className="eyebrow">{brand.copy.categoryEyebrow}</span>
        <h1>{query ? `نتائج البحث: ${query}` : result.category.name}</h1>
        <p>{query ? brand.copy.categorySearchDescription : result.category.description}</p>
      </section>
      <CategoryStrip categories={result.categories} activeSlug={slug} />
      <form className="filterRow" action={`/category/${slug}`}>
        <ClearableSearchInput name="q" defaultValue={query} placeholder="بحث داخل التصنيف" ariaLabel="بحث داخل التصنيف" submitOnClear />
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
        {isFiltered ? <a className="filterClear" href={`/category/${slug}`}>مسح الكل</a> : null}
        <span className="filterCount">{result.total} منتج</span>
      </form>
      <ProductGrid products={result.products} />
      {result.pageCount > 1 && <nav className="catalogPagination" aria-label="صفحات المنتجات">
        {result.page > 1 && <a className="ghostButton" href={pageHref(result.page - 1)}>السابق</a>}
        <span>صفحة {result.page} من {result.pageCount} · {result.total} منتج</span>
        {result.page < result.pageCount && <a className="ghostButton" href={pageHref(result.page + 1)}>التالي</a>}
      </nav>}
    </div>
  );
}
