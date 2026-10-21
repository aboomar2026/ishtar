import { brand } from './brand';

/**
 * Demo media manifest — the single source of truth that maps each seeded
 * product / category / banner to its license-safe source image(s) on Pexels.
 *
 * This file intentionally contains NO secrets and NO server-only imports, so it
 * can be consumed by both the app and the standalone upload/apply scripts.
 *
 * Pipeline:
 *   1. scripts/upload-demo-media.ts  — resolves a source image (local file or
 *      Pexels API), uploads it to Cloudinary at a stable public id, and writes
 *      scripts/demo-media.generated.json.
 *   2. scripts/apply-demo-media.ts   — reads that JSON and writes the resulting
 *      Cloudinary URLs / public ids into the database.
 *
 * Stable Cloudinary public ids (see the *PublicId helpers below):
 *   bab-al-hara/demo/products/{slug}/01-main | 02-detail | 03-lifestyle
 *   bab-al-hara/demo/categories/{slug}
 *   bab-al-hara/demo/banners/home-hero | home-promo
 */

export type DemoImageRole = 'main' | 'detail' | 'lifestyle';

export type DemoProductImage = {
  role: DemoImageRole;
  /** Pexels photo page URL — the upload script extracts the photo id from it. */
  pexelsUrl: string;
  alt: string;
  sortOrder: number;
  isPrimary: boolean;
};

export type DemoProductMedia = {
  slug: string;
  name: string;
  images: DemoProductImage[];
};

export type DemoCategoryMedia = {
  slug: string;
  name: string;
  pexelsUrl: string;
};

export type DemoBannerKey = 'home-hero' | 'home-promo';
export type DemoBannerPlacement = 'HOME_HERO' | 'HOME_PROMO';

export type DemoBannerMedia = {
  key: DemoBannerKey;
  placement: DemoBannerPlacement;
  pexelsUrl: string;
  alt: string;
};

const ROLE_SLOT: Record<DemoImageRole, string> = {
  main: '01-main',
  detail: '02-detail',
  lifestyle: '03-lifestyle'
};

const ROLES: DemoImageRole[] = ['main', 'detail', 'lifestyle'];

/** Build a product media entry. Pass 1 url for a single-image product, up to 3 for hero products. */
function product(slug: string, name: string, pexelsUrls: string[]): DemoProductMedia {
  return {
    slug,
    name,
    images: pexelsUrls.map((pexelsUrl, index) => ({
      role: ROLES[index],
      pexelsUrl,
      alt: pexelsUrls.length > 1 ? `${name} ${index + 1}` : name,
      sortOrder: index,
      isPrimary: index === 0
    }))
  };
}

/**
 * Coverage: one primary image per product, plus detail + lifestyle images for
 * the five hero products (camel-boutique-bag, gold-perfume-set, ready-gift-box,
 * black-evening-clutch, daily-makeup-kit) per the media plan.
 */
export const DEMO_PRODUCT_MEDIA: DemoProductMedia[] = [
  product('camel-boutique-bag', 'شنطة بوتيك كاميل', [
    'https://www.pexels.com/photo/bag-on-white-background-22434765/',
    'https://www.pexels.com/photo/woman-holding-brown-leather-bag-26316180/',
    'https://www.pexels.com/photo/close-up-shot-of-a-brown-handbag-12992579/'
  ]),
  product('gold-perfume-set', 'طقم عطر ذهبي', [
    'https://www.pexels.com/photo/luxury-gold-perfume-bottle-on-elegant-fabric-31823739/',
    'https://www.pexels.com/photo/golden-perfume-box-19272234/',
    'https://www.pexels.com/photo/elegant-perfume-bottle-18833913/'
  ]),
  product('soft-sun-sunglasses', 'نظارة شمس كلاسيك', [
    'https://www.pexels.com/photo/sunglasses-lying-down-on-grass-16282782/'
  ]),
  product('evening-heels', 'كعب سهرة ناعم', [
    'https://www.pexels.com/photo/pair-of-beige-leather-open-toe-heeled-platform-shoes-on-white-textile-1445696/'
  ]),
  product('daily-makeup-kit', 'مجموعة مكياج يومية', [
    'https://www.pexels.com/photo/make-up-on-beige-background-7256102/',
    'https://www.pexels.com/photo/makeup-brushes-with-eyeshadows-on-beige-surface-7446413/',
    'https://www.pexels.com/photo/skincare-and-makeup-products-in-elegant-flat-lay-31552020/'
  ]),
  product('camel-soft-scarf', 'وشاح كاميل ناعم', [
    'https://www.pexels.com/photo/stylish-flat-lay-of-fashion-and-accessories-33482420/'
  ]),
  product('leather-wallet', 'محفظة جلد صغيرة', [
    'https://www.pexels.com/photo/the-leather-wallet-is-made-from-brown-leather-28028262/'
  ]),
  product('boutique-watch', 'ساعة بوتيك ذهبية', [
    'https://www.pexels.com/photo/brown-shirt-top-with-gold-watch-flat-lay-35675692/'
  ]),
  product('hair-clip-set', 'طقم مشابك شعر', [
    'https://www.pexels.com/photo/closeup-of-a-beige-hair-clip-on-a-book-cover-16037839/'
  ]),
  product('ready-gift-box', 'بوكس هدية عطر ومكياج', [
    'https://www.pexels.com/photo/elegant-perfume-gift-box-presentation-30999236/',
    'https://www.pexels.com/photo/elegant-gift-box-display-with-perfume-bottles-36459921/',
    'https://www.pexels.com/photo/beauty-products-and-gift-box-5632357/'
  ]),
  product('soft-beige-cardigan', 'كارديغان بيج خفيف', [
    'https://www.pexels.com/photo/brunette-in-cardigan-12811533/'
  ]),
  product('camel-daily-sandals', 'صندل يومي كاميل', [
    'https://www.pexels.com/photo/woman-wearing-beige-sandals-27046122/'
  ]),
  product('daily-soft-cream', 'كريم ترطيب يومي', [
    'https://www.pexels.com/photo/hand-holding-moisturizing-cream-jar-with-neutral-background-36207011/'
  ]),
  product('soft-basics-set', 'طقم أساسيات ناعم', [
    'https://www.pexels.com/photo/white-brassiere-on-top-of-a-magazine-8731351/'
  ]),
  product('warm-satin-pajama', 'بيجاما ساتان دافئة', [
    'https://www.pexels.com/photo/pajamas-with-flowers-on-brown-blanket-7235669/'
  ]),
  product('black-evening-clutch', 'شنطة سهرة سوداء', [
    'https://www.pexels.com/photo/black-purse-with-golden-chain-20591024/',
    'https://www.pexels.com/photo/woman-in-dress-and-with-bag-15234451/',
    'https://www.pexels.com/photo/person-in-yellow-gloves-holding-a-floral-clutch-bag-8339828/'
  ]),
  product('soft-musk-perfume', 'عطر مسك ناعم', [
    'https://www.pexels.com/photo/elegant-glass-perfume-bottle-on-display-36389333/'
  ]),
  product('cream-soft-blouse', 'بلوزة كريمية ناعمة', [
    'https://www.pexels.com/photo/yellow-retro-style-blouse-hanging-above-the-dresser-23495731/'
  ]),
  product('matte-earth-lipstick', 'روج ترابي مطفي', [
    'https://www.pexels.com/photo/three-assorted-colored-venus-matte-lipsticks-2587363/'
  ]),
  product('soft-gold-necklace', 'سلسلة ذهبية ناعمة', [
    'https://www.pexels.com/photo/gold-necklaces-with-pendants-4735888/'
  ]),
  product('beige-flat-shoes', 'حذاء مسطح بيج', [
    'https://www.pexels.com/photo/person-wearing-beige-flats-while-sitting-on-bench-1556668/'
  ]),
  product('vanilla-body-mist', 'معطر جسم فانيلا', [
    'https://www.pexels.com/photo/elegant-perfume-bottle-on-satin-18950992/'
  ])
];

export const DEMO_CATEGORY_MEDIA: DemoCategoryMedia[] = [
  { slug: 'accessories', name: 'إكسسوارات', pexelsUrl: 'https://www.pexels.com/photo/stylish-accessories-and-beauty-essentials-flat-lay-28973056/' },
  { slug: 'perfumes', name: 'عطور', pexelsUrl: 'https://www.pexels.com/photo/luxury-gold-perfume-bottle-on-elegant-fabric-31823739/' },
  { slug: 'clothes', name: 'ملابس', pexelsUrl: 'https://www.pexels.com/photo/stylish-flat-lay-of-fashion-and-accessories-33482420/' },
  { slug: 'shoes', name: 'أحذية', pexelsUrl: 'https://www.pexels.com/photo/pair-of-beige-leather-open-toe-heeled-platform-shoes-on-white-textile-1445696/' },
  { slug: 'underwear', name: 'ملابس داخلية', pexelsUrl: 'https://www.pexels.com/photo/pajamas-with-flowers-on-brown-blanket-7235669/' },
  { slug: 'creams-makeup', name: 'كريمات ومكياج', pexelsUrl: 'https://www.pexels.com/photo/make-up-on-beige-background-7256102/' },
  { slug: 'bags', name: 'شنط', pexelsUrl: 'https://www.pexels.com/photo/bag-on-white-background-22434765/' }
];

export const DEMO_BANNER_MEDIA: DemoBannerMedia[] = [
  { key: 'home-hero', placement: 'HOME_HERO', pexelsUrl: 'https://www.pexels.com/photo/flat-lay-of-stylish-accessories-with-handbag-34027231/', alt: brand.copy.heroTitle },
  { key: 'home-promo', placement: 'HOME_PROMO', pexelsUrl: 'https://www.pexels.com/photo/elegant-perfume-gift-box-presentation-30999236/', alt: 'عروض مختارة لفترة محدودة' }
];

/** Stable Cloudinary public id for a product image, e.g. bab-al-hara/demo/products/{slug}/01-main */
export function productImagePublicId(slug: string, role: DemoImageRole): string {
  return `bab-al-hara/demo/products/${slug}/${ROLE_SLOT[role]}`;
}

/** Stable Cloudinary public id for a category image, e.g. bab-al-hara/demo/categories/{slug} */
export function categoryImagePublicId(slug: string): string {
  return `bab-al-hara/demo/categories/${slug}`;
}

/** Stable Cloudinary public id for a banner image, e.g. bab-al-hara/demo/banners/home-hero */
export function bannerImagePublicId(key: DemoBannerKey): string {
  return `bab-al-hara/demo/banners/${key}`;
}

/**
 * Relative path (under scripts/source-media/) where the upload script looks for
 * a manually-downloaded source file before falling back to the Pexels API.
 * The extension is resolved by the script (any of jpg/jpeg/png/webp/avif).
 */
export function sourceMediaRelPath(publicId: string): string {
  return publicId.replace(/^bab-al-hara\/demo\//, '');
}
