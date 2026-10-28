import { CatalogImage } from '@/components/CatalogImage';
import { getCategoryImage, getCategoryDefaultImage } from '@/lib/category-images';
import { CollectionCard } from '@/components/CollectionCard';
import { getCollections } from '@/features/collections/collections.queries';
import { RecentlyViewed } from '@/components/RecentlyViewed';
import { buildPageMetadata } from '@/lib/seo';
import { storeData } from '@/lib/structured-data';
import { JsonLd } from '@/components/JsonLd';
import Link from '@/components/NavigationLink';
import { CategoryStrip } from '@/components/CategoryStrip';
import { HeroView } from '@/components/hero/HeroView';
import { getPublicHeroSettings } from '@/features/hero/hero.queries';
import { ProductGrid } from '@/components/ProductGrid';
import { PromoBanner } from '@/components/PromoBanner';
import { getHomeCatalog } from '@/features/catalog/catalog.queries';
import { brand } from '@/lib/brand';
import { BrandLogo } from '@/components/BrandLogo';

export const metadata = buildPageMetadata({ title: brand.seo.title, description: brand.seo.description, path: '/' });

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [catalog, heroSettings, collections] = await Promise.all([getHomeCatalog(), getPublicHeroSettings(), getCollections({ home: true, limit: 3 })]);
  const heroProducts = [...catalog.featuredProducts, ...catalog.newArrivals].filter((product, index, all) => all.findIndex(other => other.id === product.id) === index).slice(0, 8).map(product => ({ image: product.image, name: product.name, href: `/product/${product.slug}` }));
  const promoBanner = catalog.promoBanners[0];

  return (
    <div className="homePage">
      <HeroView settings={heroSettings} banners={catalog.heroBanners} products={heroProducts} />
      <JsonLd data={storeData()} />
      <CategoryStrip categories={catalog.categories} />
      <PromoBanner banner={promoBanner} />
      {collections.length > 0 && <section className="contentSection"><div className="sectionHeader"><div><span className="eyebrow">CURATED FOR YOU</span><h2>اختيارات تجمعها حكاية</h2></div><Link href="/collections">كل المجموعات</Link></div><div className="collectionGrid">{collections.map(collection => <CollectionCard key={collection.id} collection={collection} />)}</div></section>}

      <section className="contentSection categoryShowcaseSection">
        <div className="sectionHeader">
          <div>
            <span className="eyebrow">Shop by category</span>
            <h2>تسوّقي حسب الستايل</h2>
          </div>
          <Link href="/category/new-in">تسوّقي وصل حديثاً</Link>
        </div>
        <div className="categoryShowcaseGrid" role="region" aria-label="تصفّحي جميع التصنيفات" tabIndex={0}>
          {catalog.categories.map((category) => (
            <Link href={`/category/${category.slug}`} className="categoryShowcaseCard" key={category.slug}>
              <CatalogImage className="categoryShowcaseImg" src={getCategoryImage(category.slug, category.imageUrl)} fallbackSrc={getCategoryDefaultImage(category.slug)} transform={{ width: 480, height: 600, crop: 'fit' }} widths={[240, 480]} sizes="(max-width: 767px) 160px, 240px" loading="lazy" alt={category.name} />
              <div className="categoryShowcaseOverlay">
                <strong>{category.name}</strong>
                <span>{category.productCount ?? 0} منتجات</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="contentSection sectionPanel offersPanel">
        <div className="sectionHeader">
          <div>
            <span className="eyebrow">Today’s offers</span>
            <h2>عروض اليوم</h2>
          </div>
          <Link href="/category/sale">مشاهدة الكل</Link>
        </div>
        <ProductGrid products={catalog.todayOffers} />
      </section>

      <section className="boutiqueBand">
        <div className="boutiqueWordmark">
          <BrandLogo variant="header" />
        </div>
        <div>
          <span className="eyebrow">{brand.copy.boutiqueEyebrow}</span>
          <h2>{brand.copy.boutiqueTitle}</h2>
          <p>{brand.copy.boutiqueDescription}</p>
        </div>
      </section>

      <section className="contentSection">
        <div className="sectionHeader">
          <div>
            <span className="eyebrow">New arrivals</span>
            <h2>وصل حديثاً</h2>
          </div>
          <Link href="/category/new-in">مشاهدة الكل</Link>
        </div>
        <ProductGrid products={catalog.newArrivals} />
      </section>

      {catalog.bestSellers.length > 0 && <section className="contentSection sectionPanel bestSellerPanel">
        <div className="sectionHeader">
          <div>
            <span className="eyebrow">Best sellers</span>
            <h2>الأكثر مبيعاً</h2>
          </div>
          <Link href="/category/all?sort=best-sellers">شاهدي الأكثر مبيعاً</Link>
        </div>
        <ProductGrid products={catalog.bestSellers} />
      </section>}

      <section className="contentSection">
        <div className="sectionHeader">
          <div>
            <span className="eyebrow">Featured collection</span>
            <h2>{brand.copy.featuredCollectionTitle}</h2>
          </div>
          <Link href="/category/featured">اكتشفي المختارات</Link>
        </div>
        <ProductGrid products={catalog.featuredProducts} />
      </section>
      <RecentlyViewed />
    </div>
  );
}
