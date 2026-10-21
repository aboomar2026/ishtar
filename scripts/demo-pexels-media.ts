/**
 * Sprint 7A — Demo product media using DIRECT Pexels CDN image URLs.
 *
 * This is the authoritative, license-safe shortlist for the demo phase. We are
 * NOT uploading to Cloudinary yet; these images.pexels.com URLs are written
 * straight into the database. After demo approval the approved images will be
 * uploaded to Cloudinary and the URLs swapped (cloudinaryPublicId stays null
 * for now).
 *
 * Direct URLs are built from the public Pexels photo id with the canonical CDN
 * pattern (verified to resolve): images.pexels.com/photos/{id}/pexels-photo-{id}.jpeg
 * The original Pexels page URL is kept alongside each image as a source record
 * (see docs/demo-pexels-media-map.md, generated from this file).
 */

export type DemoImage = {
  /** Pexels photo id (numeric, taken from the photo page URL). */
  id: number;
  /** Original Pexels photo page URL — kept for attribution / later review. */
  page: string;
  alt: string;
  /** Reviewer notes: anything to double-check before final approval. */
  notes?: string;
};

export type DemoProductEntry = {
  slug: string;
  name: string;
  images: DemoImage[];
};

export type DemoCategoryEntry = {
  slug: string;
  name: string;
  image: DemoImage;
};

export type DemoBannerEntry = {
  key: string;
  name: string;
  placement: 'HOME_HERO' | 'HOME_PROMO';
  image: DemoImage;
};

/**
 * Build a direct images.pexels.com URL. Pexels honours sizing/crop via query
 * params, so we keep them generic (no exact-match query string needed in the
 * Next remotePatterns config).
 */
export function pexelsImageUrl(id: number, opts: { w?: number; h?: number; fit?: boolean } = {}): string {
  const params = new URLSearchParams({ auto: 'compress', cs: 'tinysrgb' });
  if (opts.w) params.set('w', String(opts.w));
  if (opts.h) params.set('h', String(opts.h));
  if (opts.fit) params.set('fit', 'crop');
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?${params.toString()}`;
}

/** Versatile product image: wide enough for the gallery, CSS object-fit crops cards to 4:5. */
export const productImageUrl = (id: number) => pexelsImageUrl(id, { w: 1200 });
/** Category tile image. */
export const categoryImageUrl = (id: number) => pexelsImageUrl(id, { w: 1000 });
/** Wide landscape crop for banners so overlaid RTL text stays readable. */
export const bannerImageUrl = (id: number) => pexelsImageUrl(id, { w: 1600, h: 900, fit: true });

export const DEMO_PRODUCTS: DemoProductEntry[] = [
  {
    slug: 'camel-boutique-bag',
    name: 'شنطة بوتيك كاميل',
    images: [
      { id: 22434765, page: 'https://www.pexels.com/photo/bag-on-white-background-22434765/', alt: 'شنطة بوتيك كاميل على خلفية فاتحة' },
      { id: 26316180, page: 'https://www.pexels.com/photo/woman-holding-brown-leather-bag-26316180/', alt: 'شنطة جلد بنية محمولة', notes: 'لقطة lifestyle' },
      { id: 12992579, page: 'https://www.pexels.com/photo/close-up-shot-of-a-brown-handbag-12992579/', alt: 'تفاصيل شنطة بنية' }
    ]
  },
  {
    slug: 'gold-perfume-set',
    name: 'طقم عطر ذهبي',
    images: [
      { id: 31823739, page: 'https://www.pexels.com/photo/luxury-gold-perfume-bottle-on-elegant-fabric-31823739/', alt: 'عطر ذهبي فاخر على قماش' },
      { id: 19272234, page: 'https://www.pexels.com/photo/golden-perfume-box-19272234/', alt: 'علبة عطر ذهبية' },
      { id: 18833913, page: 'https://www.pexels.com/photo/elegant-perfume-bottle-18833913/', alt: 'زجاجة عطر أنيقة' }
    ]
  },
  {
    slug: 'soft-sun-sunglasses',
    name: 'نظارة شمس كلاسيك',
    images: [
      { id: 16282782, page: 'https://www.pexels.com/photo/sunglasses-lying-down-on-grass-16282782/', alt: 'نظارة شمس كلاسيك' }
    ]
  },
  {
    slug: 'evening-heels',
    name: 'كعب سهرة ناعم',
    images: [
      { id: 1445696, page: 'https://www.pexels.com/photo/pair-of-beige-leather-open-toe-heeled-platform-shoes-on-white-textile-1445696/', alt: 'كعب سهرة بيج أنيق' }
    ]
  },
  {
    slug: 'daily-makeup-kit',
    name: 'مجموعة مكياج يومية',
    images: [
      { id: 7256102, page: 'https://www.pexels.com/photo/make-up-on-beige-background-7256102/', alt: 'مكياج بألوان ترابية' },
      { id: 7446413, page: 'https://www.pexels.com/photo/makeup-brushes-with-eyeshadows-on-beige-surface-7446413/', alt: 'فرش مكياج وظلال' },
      { id: 31552020, page: 'https://www.pexels.com/photo/skincare-and-makeup-products-in-elegant-flat-lay-31552020/', alt: 'منتجات مكياج وعناية flat lay' }
    ]
  },
  {
    slug: 'camel-soft-scarf',
    name: 'وشاح كاميل ناعم',
    images: [
      { id: 33482420, page: 'https://www.pexels.com/photo/stylish-flat-lay-of-fashion-and-accessories-33482420/', alt: 'إطلالة وإكسسوارات بألوان دافئة' }
    ]
  },
  {
    slug: 'leather-wallet',
    name: 'محفظة جلد صغيرة',
    images: [
      { id: 28028262, page: 'https://www.pexels.com/photo/the-leather-wallet-is-made-from-brown-leather-28028262/', alt: 'محفظة جلد بني' }
    ]
  },
  {
    slug: 'boutique-watch',
    name: 'ساعة بوتيك ذهبية',
    images: [
      { id: 35675692, page: 'https://www.pexels.com/photo/brown-shirt-top-with-gold-watch-flat-lay-35675692/', alt: 'ساعة ذهبية مع إكسسوارات' }
    ]
  },
  {
    slug: 'hair-clip-set',
    name: 'طقم مشابك شعر',
    images: [
      { id: 16037839, page: 'https://www.pexels.com/photo/closeup-of-a-beige-hair-clip-on-a-book-cover-16037839/', alt: 'مشبك شعر بيج' }
    ]
  },
  {
    slug: 'ready-gift-box',
    name: 'بوكس هدية عطر ومكياج',
    images: [
      { id: 30999236, page: 'https://www.pexels.com/photo/elegant-perfume-gift-box-presentation-30999236/', alt: 'بوكس هدية عطر أنيق' },
      { id: 36459921, page: 'https://www.pexels.com/photo/elegant-gift-box-display-with-perfume-bottles-36459921/', alt: 'بوكس هدايا مع زجاجات عطر' },
      { id: 5632357, page: 'https://www.pexels.com/photo/beauty-products-and-gift-box-5632357/', alt: 'منتجات جمال وبوكس هدية' }
    ]
  },
  {
    slug: 'soft-beige-cardigan',
    name: 'كارديغان بيج خفيف',
    images: [
      { id: 12811533, page: 'https://www.pexels.com/photo/brunette-in-cardigan-12811533/', alt: 'كارديغان بيج ناعم', notes: 'صورة عارضة (قد يظهر وجه) — يفضّل استبدالها بصورة flat-lay عند توفرها' }
    ]
  },
  {
    slug: 'camel-daily-sandals',
    name: 'صندل يومي كاميل',
    images: [
      { id: 27046122, page: 'https://www.pexels.com/photo/woman-wearing-beige-sandals-27046122/', alt: 'صندل بيج كاميل' }
    ]
  },
  {
    slug: 'daily-soft-cream',
    name: 'كريم ترطيب يومي',
    images: [
      { id: 36207011, page: 'https://www.pexels.com/photo/hand-holding-moisturizing-cream-jar-with-neutral-background-36207011/', alt: 'علبة كريم ترطيب' }
    ]
  },
  {
    slug: 'soft-basics-set',
    name: 'طقم أساسيات ناعم',
    images: [
      { id: 8731351, page: 'https://www.pexels.com/photo/white-brassiere-on-top-of-a-magazine-8731351/', alt: 'قطعة أساسيات بيضاء flat lay', notes: 'flat-lay محتشم بدون جسم' }
    ]
  },
  {
    slug: 'warm-satin-pajama',
    name: 'بيجاما ساتان دافئة',
    images: [
      { id: 7235669, page: 'https://www.pexels.com/photo/pajamas-with-flowers-on-brown-blanket-7235669/', alt: 'بيجاما على بطانية بنية', notes: 'flat-lay محتشم' }
    ]
  },
  {
    slug: 'black-evening-clutch',
    name: 'شنطة سهرة سوداء',
    images: [
      { id: 20591024, page: 'https://www.pexels.com/photo/black-purse-with-golden-chain-20591024/', alt: 'شنطة سهرة سوداء بسلسلة ذهبية' },
      { id: 15234451, page: 'https://www.pexels.com/photo/woman-in-dress-and-with-bag-15234451/', alt: 'إطلالة سهرة مع شنطة', notes: 'لقطة lifestyle' },
      { id: 8339828, page: 'https://www.pexels.com/photo/person-in-yellow-gloves-holding-a-floral-clutch-bag-8339828/', alt: 'كلاتش محمول', notes: 'كلاتش بنقشة مختلفة — للمراجعة' }
    ]
  },
  {
    slug: 'soft-musk-perfume',
    name: 'عطر مسك ناعم',
    images: [
      { id: 36389333, page: 'https://www.pexels.com/photo/elegant-glass-perfume-bottle-on-display-36389333/', alt: 'زجاجة عطر زجاجية أنيقة' },
      { id: 18950992, page: 'https://www.pexels.com/photo/elegant-perfume-bottle-on-satin-18950992/', alt: 'عطر على ساتان' },
      { id: 16748105, page: 'https://www.pexels.com/photo/a-blue-cosmetic-bottle-16748105/', alt: 'زجاجة عطر', notes: 'لون أزرق — للمراجعة، قد لا يناسب نفحة المسك الدافئة' }
    ]
  },
  {
    slug: 'cream-soft-blouse',
    name: 'بلوزة كريمية ناعمة',
    images: [
      { id: 23495731, page: 'https://www.pexels.com/photo/yellow-retro-style-blouse-hanging-above-the-dresser-23495731/', alt: 'بلوزة معلّقة بستايل كلاسيك', notes: 'درجة اللون مائلة للأصفر — للمراجعة مقابل الكريمي' }
    ]
  },
  {
    slug: 'matte-earth-lipstick',
    name: 'روج ترابي مطفي',
    images: [
      { id: 2587363, page: 'https://www.pexels.com/photo/three-assorted-colored-venus-matte-lipsticks-2587363/', alt: 'أحمر شفاه مطفي بدرجات', notes: 'احتمال ظهور كتابة ماركة على التغليف — يُفضّل استبدالها بصورة بدون براند' }
    ]
  },
  {
    slug: 'soft-gold-necklace',
    name: 'سلسلة ذهبية ناعمة',
    images: [
      { id: 4735888, page: 'https://www.pexels.com/photo/gold-necklaces-with-pendants-4735888/', alt: 'سلاسل ذهبية ناعمة' }
    ]
  },
  {
    slug: 'beige-flat-shoes',
    name: 'حذاء مسطح بيج',
    images: [
      { id: 1556668, page: 'https://www.pexels.com/photo/person-wearing-beige-flats-while-sitting-on-bench-1556668/', alt: 'حذاء مسطح بيج' }
    ]
  },
  {
    slug: 'vanilla-body-mist',
    name: 'معطر جسم فانيلا',
    images: [
      { id: 23070578, page: 'https://www.pexels.com/photo/a-bottle-of-perfume-lying-on-sand-23070578/', alt: 'زجاجة معطر فاتحة اللون' }
    ]
  }
];

export const DEMO_CATEGORIES: DemoCategoryEntry[] = [
  { slug: 'accessories', name: 'إكسسوارات', image: { id: 28973056, page: 'https://www.pexels.com/photo/stylish-accessories-and-beauty-essentials-flat-lay-28973056/', alt: 'إكسسوارات وأساسيات جمال' } },
  { slug: 'perfumes', name: 'عطور', image: { id: 31823739, page: 'https://www.pexels.com/photo/luxury-gold-perfume-bottle-on-elegant-fabric-31823739/', alt: 'عطر ذهبي فاخر' } },
  { slug: 'clothes', name: 'ملابس', image: { id: 33482420, page: 'https://www.pexels.com/photo/stylish-flat-lay-of-fashion-and-accessories-33482420/', alt: 'إطلالة ملابس وإكسسوارات' } },
  { slug: 'shoes', name: 'أحذية', image: { id: 1445696, page: 'https://www.pexels.com/photo/pair-of-beige-leather-open-toe-heeled-platform-shoes-on-white-textile-1445696/', alt: 'أحذية بيج أنيقة' } },
  { slug: 'underwear', name: 'ملابس داخلية', image: { id: 7235669, page: 'https://www.pexels.com/photo/pajamas-with-flowers-on-brown-blanket-7235669/', alt: 'ملابس نوم flat lay محتشمة' } },
  { slug: 'creams-makeup', name: 'كريمات ومكياج', image: { id: 7256102, page: 'https://www.pexels.com/photo/make-up-on-beige-background-7256102/', alt: 'مكياج بألوان ترابية' } },
  { slug: 'bags', name: 'شنط', image: { id: 22434765, page: 'https://www.pexels.com/photo/bag-on-white-background-22434765/', alt: 'شنطة على خلفية فاتحة' } }
];

export const DEMO_BANNERS: DemoBannerEntry[] = [
  { key: 'home-hero', name: 'بنر الرئيسية', placement: 'HOME_HERO', image: { id: 34027231, page: 'https://www.pexels.com/photo/flat-lay-of-stylish-accessories-with-handbag-34027231/', alt: 'إطلالتك تبدأ من باب الحارة' } },
  { key: 'home-promo', name: 'بنر العروض', placement: 'HOME_PROMO', image: { id: 30999236, page: 'https://www.pexels.com/photo/elegant-perfume-gift-box-presentation-30999236/', alt: 'عروض مختارة لفترة محدودة' } }
];
