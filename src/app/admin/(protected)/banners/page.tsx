import { getAdminBanners } from '@/features/admin/banners/banner-admin.queries';
import { HeroEditor } from '@/components/admin/HeroEditor';
import { getHeroSettings } from '@/features/hero/hero.queries';
import { getActiveBanners, getNewArrivals } from '@/features/catalog/catalog.queries';
import { BannerManager } from '@/components/admin/BannerManager';

export const dynamic = 'force-dynamic';

export default async function AdminBannersPage() {
  const [banners, settings, heroBanners, products] = await Promise.all([getAdminBanners(), getHeroSettings(), getActiveBanners('HOME_HERO'), getNewArrivals(3)]);

  return (
    <div>
      <div className="adminPageHeader">
        <div>
          <h1>البنرات</h1>
          <p className="adminMuted">تصميم الواجهة وبنرات الصفحة الرئيسية والتصنيفات.</p>
        </div>
      </div>
      <HeroEditor initial={settings} banners={heroBanners} products={products.map(product => ({ image: product.image, name: product.name, href: `/product/${product.slug}` }))} />
      <BannerManager banners={banners} />
    </div>
  );
}
