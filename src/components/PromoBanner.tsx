import Link from 'next/link';
import type { CatalogBanner } from '@/features/catalog/catalog.types';
import { brand } from '@/lib/brand';

export function PromoBanner({ banner }: { banner?: CatalogBanner }) {
  const useDatabaseCopy = brand.behavior.useDatabaseBannerCopy;
  const eyebrow = useDatabaseCopy ? banner?.eyebrow ?? brand.copy.promoEyebrow : brand.copy.promoEyebrow;
  const title = useDatabaseCopy ? banner?.title ?? brand.copy.promoTitle : brand.copy.promoTitle;
  const subtitle = useDatabaseCopy ? banner?.subtitle ?? brand.copy.promoSubtitle : brand.copy.promoSubtitle;
  const ctaLabel = useDatabaseCopy ? banner?.ctaLabel ?? brand.copy.promoCta : brand.copy.promoCta;

  return (
    <section className="promoBanner">
      <div className="promoCopy">
        <span>{eyebrow}</span>
        <strong>{title}</strong>
        <p>{subtitle}</p>
      </div>
      <Link href={banner?.href ?? '/category/sale'}>{ctaLabel}</Link>
    </section>
  );
}
