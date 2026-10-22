import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getHomeCatalog } from '@/features/catalog/catalog.queries';
import { DEFAULT_HERO_SETTINGS } from '@/features/hero/hero-config';
import { HeroReview } from '@/components/hero/HeroReview';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'معاينة الهيرو — عشتار', robots: { index: false, follow: false } };

export default async function HeroPreviewPage() {
  // A read-only test surface enabled solely on Netlify Deploy Previews.
  if (process.env.NEXT_PUBLIC_HERO_QA_ENABLED !== 'true') notFound();
  const catalog = await getHomeCatalog();
  const products = [...catalog.featuredProducts, ...catalog.newArrivals].filter((product, index, all) => all.findIndex(other => other.id === product.id) === index).slice(0, 3).map(product => ({ image: product.image, name: product.name, href: `/product/${product.slug}` }));
  const titles = ['تفاصيل صغيرة، حضور لا يُنسى', 'هدايا تترك أثراً', 'اختيارات أنيقة لكل إطلالة ولكل مناسبة — اكتشفي التفاصيل التي تعبّر عنكِ'];
  const banners = titles.map((title, index) => ({ id: `qa-${index}`, title, subtitle: index === 2 ? 'نص طويل لتجربة التفاف السطور على الشاشات الصغيرة، مع المحافظة على وضوح زر التسوق وثبات ارتفاع الشرائح أثناء التنقل بين الحملات.' : 'إكسسوارات وحقائب وعطور مختارة لتكمّل أسلوبك.', eyebrow: 'ISHTAR · ACCESSORIES', ctaLabel: 'تسوّقي الآن', href: '/category/all', imageUrl: products[index]?.image, placement: 'HOME_HERO' as const }));
  return <HeroReview settings={{ ...DEFAULT_HERO_SETTINGS, copySource: 'banners' }} banners={banners} products={products} />;
}
