import Link from 'next/link';
import type { CatalogBanner } from '@/features/catalog/catalog.types';
import { BANNER_IMAGE, getCloudinaryTransformedUrl } from '@/lib/cloudinary-image';
import { brand } from '@/lib/brand';
import { BrandLogo } from './BrandLogo';

export function HeroBanner({ banner }: { banner?: CatalogBanner }) {
  const href = banner?.href ?? '/category/new-in';
  const useDatabaseCopy = brand.behavior.useDatabaseBannerCopy;
  const title = useDatabaseCopy ? banner?.title ?? brand.copy.heroTitle : brand.copy.heroTitle;
  const subtitle = useDatabaseCopy ? banner?.subtitle ?? brand.copy.heroSubtitle : brand.copy.heroSubtitle;
  const eyebrow = useDatabaseCopy ? banner?.eyebrow ?? brand.copy.heroEyebrow : brand.copy.heroEyebrow;
  const ctaLabel = useDatabaseCopy ? banner?.ctaLabel ?? brand.copy.heroCta : brand.copy.heroCta;

  return (
    <section className="heroBanner">
      <div className="heroCopy">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <div className="heroActions">
          <Link href={href} className="primaryButton">{ctaLabel}</Link>
          <Link href="/category/sale" className="ghostButton">{brand.copy.heroSecondaryCta}</Link>
        </div>
        <div className="heroTrustRow" aria-label="مميزات التسوق">
          {brand.copy.heroTrustItems.map((item) => <span key={item}>{item}</span>)}
        </div>
      </div>

      <div className="heroCollage" aria-hidden="true">
        <div className="heroGlow" />
        <div className="logoMedallion">
          <BrandLogo variant="compact" />
        </div>
        <div className="collageTile collageLarge">
          <img src={getCloudinaryTransformedUrl(banner?.imageUrl ?? '/mock-products/bag-camel.svg', BANNER_IMAGE)} alt="" />
          <span>{brand.copy.heroCollageLabel}</span>
        </div>
        <div className="collageTile collageSmallOne">
          <img src="https://images.pexels.com/photos/31823739/pexels-photo-31823739.jpeg?auto=compress&cs=tinysrgb&w=600" alt="" />
          <span>عطور</span>
        </div>
        <div className="collageTile collageSmallTwo">
          <img src="https://images.pexels.com/photos/28973056/pexels-photo-28973056.jpeg?auto=compress&cs=tinysrgb&w=600" alt="" />
          <span>إكسسوارات</span>
        </div>
        <div className="collageTile collageSmallThree">
          <img src="https://images.pexels.com/photos/30999236/pexels-photo-30999236.jpeg?auto=compress&cs=tinysrgb&w=600" alt="" />
          <span>Gift Box</span>
        </div>
      </div>
    </section>
  );
}
