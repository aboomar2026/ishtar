import Link from 'next/link';
import { CategoryStrip } from '@/components/CategoryStrip';
import { HeroBanner } from '@/components/HeroBanner';
import { ProductGrid } from '@/components/ProductGrid';
import { PromoBanner } from '@/components/PromoBanner';
import { getHomeCatalog } from '@/features/catalog/catalog.queries';
import { brand } from '@/lib/brand';
import { BrandLogo } from '@/components/BrandLogo';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const catalog = await getHomeCatalog();
  const heroBanner = catalog.heroBanners[0];
  const promoBanner = catalog.promoBanners[0];

  return (
    <div className="homePage">
      <HeroBanner banner={heroBanner} />
      <CategoryStrip categories={catalog.categories} />
      <PromoBanner banner={promoBanner} />

      <section className="contentSection categoryShowcaseSection">
        <div className="sectionHeader">
          <div>
            <span className="eyebrow">Shop by category</span>
            <h2>تسوّقي حسب الستايل</h2>
          </div>
          <Link href="/category/new-in">تسوّقي وصل حديثاً</Link>
        </div>
        <div className="categoryShowcaseGrid">
          {catalog.categories.map((category) => (
            <Link href={`/category/${category.slug}`} className="categoryShowcaseCard" key={category.slug}>
              <img className="categoryShowcaseImg" src={category.imageUrl ?? '/mock-products/gift-box.svg'} alt={category.name} />
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
        <div className="logoMedallion small">
          <BrandLogo variant="compact" />
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

      <section className="contentSection sectionPanel bestSellerPanel">
        <div className="sectionHeader">
          <div>
            <span className="eyebrow">Best sellers</span>
            <h2>الأكثر مبيعاً</h2>
          </div>
          <Link href="/category/bags">تسوّقي الآن</Link>
        </div>
        <ProductGrid products={catalog.bestSellers} />
      </section>

      <section className="contentSection">
        <div className="sectionHeader">
          <div>
            <span className="eyebrow">Featured collection</span>
            <h2>{brand.copy.featuredCollectionTitle}</h2>
          </div>
          <Link href="/category/accessories">اكتشفي المزيد</Link>
        </div>
        <ProductGrid products={catalog.featuredProducts} />
      </section>
    </div>
  );
}
