import { PrismaClient, ProductStatus, BannerPlacement, AdminRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Seed a local admin user from ADMIN_EMAIL / ADMIN_PASSWORD env vars.
 * Only the bcrypt hash is stored; the plaintext password is never logged.
 * If the env vars are missing the step is skipped (the seed still succeeds).
 */
async function seedAdminUser() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'Saad Center Admin';

  if (!email || !password) {
    console.log('ADMIN_EMAIL/ADMIN_PASSWORD not set, skipping admin user seed.');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.adminUser.upsert({
    where: { email },
    update: { name, passwordHash, role: AdminRole.SUPER_ADMIN, isActive: true },
    create: { email, name, passwordHash, role: AdminRole.SUPER_ADMIN, isActive: true }
  });
  console.log(`Seeded admin user "${email}" (role SUPER_ADMIN).`);
}

const categories = [
  { name: 'إكسسوارات', slug: 'accessories', description: 'نظارات، ساعات، مشابك ولمسات نهائية للإطلالة.', imageUrl: '/mock-products/sunglasses.svg' },
  { name: 'عطور', slug: 'perfumes', description: 'روائح دافئة وتغليف أنيق مناسب للهدايا.', imageUrl: '/mock-products/perfume-gold.svg' },
  { name: 'ملابس', slug: 'clothes', description: 'قطع يومية ناعمة وإطلالات بوتيك مريحة.', imageUrl: '/mock-products/scarf.svg' },
  { name: 'أحذية', slug: 'shoes', description: 'أحذية وكعوب مختارة للمناسبات واليوميات.', imageUrl: '/mock-products/heels.svg' },
  { name: 'ملابس داخلية', slug: 'underwear', description: 'أساسيات مريحة بتفاصيل ناعمة وألوان هادئة.', imageUrl: '/mock-products/gift-box.svg' },
  { name: 'كريمات ومكياج', slug: 'creams-makeup', description: 'مكياج يومي وكريمات عناية بستايل دافئ.', imageUrl: '/mock-products/makeup-set.svg' },
  { name: 'شنط', slug: 'bags', description: 'شنط ومحافظ عملية بألوان كاميل وبني وأسود.', imageUrl: '/mock-products/bag-camel.svg' }
];

type VariantSeed = {
  sku: string;
  colorName?: string;
  colorValue?: string;
  size?: string;
  price: number;
  compareAtPrice?: number;
  quantity: number;
  lowStockThreshold?: number;
};

type ProductSeed = {
  categorySlug: string;
  name: string;
  slug: string;
  subtitle: string;
  description: string;
  details: string[];
  careInstructions?: string;
  brand?: string;
  basePrice: number;
  compareAtPrice?: number;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  rating?: number;
  reviewCount?: number;
  soldCount?: number;
  tags?: string[];
  images: string[];
  variants: VariantSeed[];
};

const products: ProductSeed[] = [
  {
    categorySlug: 'bags',
    name: 'شنطة بوتيك كاميل',
    slug: 'camel-boutique-bag',
    subtitle: 'جلد ناعم • عملية وأنيقة',
    description: 'شنطة يومية بلون كاميل دافئ، مناسبة للخروجات السريعة والإطلالات الراقية.',
    details: ['مساحة داخلية مرتبة', 'سير قابل للتعديل', 'لون كاميل دافئ من مجموعة سعد سنتر'],
    brand: 'Saad Center Select',
    basePrice: 89,
    compareAtPrice: 119,
    isFeatured: true,
    isNewArrival: true,
    isBestSeller: true,
    rating: 4.8,
    reviewCount: 64,
    soldCount: 328,
    tags: ['شنط', 'كاميل', 'بوتيك'],
    images: ['/mock-products/bag-camel.svg', '/mock-products/wallet.svg', '/mock-products/gift-box.svg'],
    variants: [
      { sku: 'BAH-BAG-CAM-M', colorName: 'كاميل', colorValue: '#bd8754', size: 'متوسط', price: 89, compareAtPrice: 119, quantity: 8 },
      { sku: 'BAH-BAG-BRN-M', colorName: 'بني', colorValue: '#6b432e', size: 'متوسط', price: 89, compareAtPrice: 119, quantity: 3 },
      { sku: 'BAH-BAG-BLK-M', colorName: 'أسود', colorValue: '#111111', size: 'متوسط', price: 95, compareAtPrice: 125, quantity: 0 }
    ]
  },
  {
    categorySlug: 'perfumes',
    name: 'طقم عطر ذهبي',
    slug: 'gold-perfume-set',
    subtitle: 'رائحة ناعمة • تغليف فاخر',
    description: 'طقم عطر بتقديم راقٍ يليق بالهدايا والمناسبات اليومية.',
    details: ['تغليف مناسب للهدايا', 'نفحات دافئة', 'مناسب للاستخدام اليومي'],
    basePrice: 69,
    compareAtPrice: 85,
    isFeatured: true,
    isBestSeller: true,
    rating: 4.7,
    reviewCount: 41,
    soldCount: 214,
    tags: ['عطور', 'هدايا', 'ذهبي'],
    images: ['/mock-products/perfume-gold.svg', '/mock-products/makeup-set.svg', '/mock-products/gift-box.svg'],
    variants: [
      { sku: 'BAH-PRF-GLD-50', colorName: 'ذهبي', colorValue: '#c9a65a', size: '50ml', price: 69, compareAtPrice: 85, quantity: 6 },
      { sku: 'BAH-PRF-GLD-100', colorName: 'ذهبي', colorValue: '#c9a65a', size: '100ml', price: 105, compareAtPrice: 125, quantity: 2 },
      { sku: 'BAH-PRF-BEG-50', colorName: 'بيج', colorValue: '#ead8c1', size: '50ml', price: 69, compareAtPrice: 85, quantity: 0 }
    ]
  },
  {
    categorySlug: 'accessories',
    name: 'نظارة شمس كلاسيك',
    slug: 'soft-sun-sunglasses',
    subtitle: 'إطار أسود • عدسات دافئة',
    description: 'نظارة شمس بسيطة تضيف لمسة Boutique لأي إطلالة.',
    details: ['خفيفة على الوجه', 'ستايل يومي', 'تصميم غير مبالغ فيه'],
    basePrice: 45,
    compareAtPrice: 59,
    isBestSeller: true,
    rating: 4.6,
    reviewCount: 89,
    soldCount: 410,
    tags: ['نظارات', 'إكسسوارات'],
    images: ['/mock-products/sunglasses.svg', '/mock-products/hair-clip.svg', '/mock-products/scarf.svg'],
    variants: [
      { sku: 'BAH-ACC-SUN-BLK', colorName: 'أسود', colorValue: '#111111', size: 'مقاس موحد', price: 45, compareAtPrice: 59, quantity: 11 },
      { sku: 'BAH-ACC-SUN-BRN', colorName: 'بني', colorValue: '#6b432e', size: 'مقاس موحد', price: 45, compareAtPrice: 59, quantity: 4 }
    ]
  },
  {
    categorySlug: 'shoes',
    name: 'كعب سهرة ناعم',
    slug: 'evening-heels',
    subtitle: 'تصميم أنيق • لون بني وردي',
    description: 'كعب سهرة بتصميم ناعم يناسب المناسبات والإطلالات الرسمية.',
    details: ['مريح نسبياً', 'ستايل أنثوي', 'مناسب مع شنط كاميل أو سوداء'],
    careInstructions: 'ينظف بقطعة قماش ناعمة ويحفظ بعيداً عن الرطوبة.',
    basePrice: 115,
    isFeatured: true,
    isNewArrival: true,
    rating: 4.9,
    reviewCount: 21,
    soldCount: 95,
    tags: ['أحذية', 'كعب', 'سهرة'],
    images: ['/mock-products/heels.svg', '/mock-products/bag-camel.svg', '/mock-products/perfume-gold.svg'],
    variants: [
      { sku: 'BAH-SHOE-MOC-36', colorName: 'موكا', colorValue: '#8a5b45', size: '36', price: 115, quantity: 3 },
      { sku: 'BAH-SHOE-MOC-37', colorName: 'موكا', colorValue: '#8a5b45', size: '37', price: 115, quantity: 0 },
      { sku: 'BAH-SHOE-MOC-38', colorName: 'موكا', colorValue: '#8a5b45', size: '38', price: 115, quantity: 1, lowStockThreshold: 2 },
      { sku: 'BAH-SHOE-BLK-38', colorName: 'أسود', colorValue: '#111111', size: '38', price: 119, quantity: 4 },
      { sku: 'BAH-SHOE-BLK-39', colorName: 'أسود', colorValue: '#111111', size: '39', price: 119, quantity: 2 }
    ]
  },
  {
    categorySlug: 'creams-makeup',
    name: 'مجموعة مكياج يومية',
    slug: 'daily-makeup-kit',
    subtitle: 'ألوان ترابية • مناسبة لكل يوم',
    description: 'مجموعة مكياج صغيرة للاستخدام اليومي بألوان دافئة متناسقة مناسبة لجميع الإطلالات.',
    details: ['ألوان ناعمة', 'سهلة الحمل', 'مناسبة كهدية صغيرة'],
    basePrice: 54,
    compareAtPrice: 72,
    isNewArrival: true,
    rating: 4.5,
    reviewCount: 36,
    soldCount: 287,
    tags: ['مكياج', 'جمال', 'ترابي'],
    images: ['/mock-products/makeup-set.svg', '/mock-products/perfume-gold.svg', '/mock-products/hair-clip.svg'],
    variants: [
      { sku: 'BAH-MUP-EAR-BASIC', colorName: 'ترابي', colorValue: '#b8815c', size: 'Basic', price: 54, compareAtPrice: 72, quantity: 7 },
      { sku: 'BAH-MUP-EAR-FULL', colorName: 'ترابي', colorValue: '#b8815c', size: 'Full', price: 84, compareAtPrice: 105, quantity: 2 },
      { sku: 'BAH-MUP-ROS-BASIC', colorName: 'وردي', colorValue: '#d79a9a', size: 'Basic', price: 54, compareAtPrice: 72, quantity: 0 }
    ]
  },
  {
    categorySlug: 'clothes',
    name: 'وشاح كاميل ناعم',
    slug: 'camel-soft-scarf',
    subtitle: 'قطعة خفيفة • لمسة شتوية',
    description: 'وشاح خفيف بدرجات بيج وكاميل لإطلالة دافئة وراقية.',
    details: ['ملمس ناعم', 'خفيف وسهل التنسيق', 'ألوان Boutique هادئة'],
    basePrice: 39,
    isFeatured: true,
    rating: 4.7,
    reviewCount: 32,
    soldCount: 177,
    tags: ['ملابس', 'وشاح', 'كاميل'],
    images: ['/mock-products/scarf.svg', '/mock-products/watch.svg', '/mock-products/bag-camel.svg'],
    variants: [
      { sku: 'BAH-CLO-SCRF-CAM', colorName: 'كاميل', colorValue: '#bd8754', size: 'مقاس موحد', price: 39, quantity: 12 },
      { sku: 'BAH-CLO-SCRF-CRM', colorName: 'كريمي', colorValue: '#f1dfc8', size: 'مقاس موحد', price: 39, quantity: 5 }
    ]
  },
  {
    categorySlug: 'bags',
    name: 'محفظة جلد صغيرة',
    slug: 'leather-wallet',
    subtitle: 'عملية • لون بني عميق',
    description: 'محفظة صغيرة بتصميم عملي مناسب للاستخدام اليومي.',
    details: ['جيوب متعددة', 'حجم صغير', 'تصميم نظيف'],
    basePrice: 29,
    compareAtPrice: 39,
    isBestSeller: true,
    rating: 4.4,
    reviewCount: 76,
    soldCount: 501,
    tags: ['محفظة', 'شنط', 'جلد'],
    images: ['/mock-products/wallet.svg', '/mock-products/bag-camel.svg', '/mock-products/gift-box.svg'],
    variants: [
      { sku: 'BAH-WAL-BRN-ONE', colorName: 'بني', colorValue: '#6b432e', size: 'مقاس موحد', price: 29, compareAtPrice: 39, quantity: 9 },
      { sku: 'BAH-WAL-BLK-ONE', colorName: 'أسود', colorValue: '#111111', size: 'مقاس موحد', price: 29, compareAtPrice: 39, quantity: 0 }
    ]
  },
  {
    categorySlug: 'accessories',
    name: 'ساعة بوتيك ذهبية',
    slug: 'boutique-watch',
    subtitle: 'لمعة خفيفة • سوار أنيق',
    description: 'ساعة بتفاصيل ذهبية رقيقة تضيف لمسة فاخرة دون مبالغة.',
    details: ['خفيفة', 'تصلح للهدايا', 'تناسق مع الإكسسوارات الذهبية'],
    basePrice: 79,
    compareAtPrice: 99,
    isFeatured: true,
    rating: 4.6,
    reviewCount: 33,
    soldCount: 143,
    tags: ['ساعة', 'إكسسوارات', 'ذهبي'],
    images: ['/mock-products/watch.svg', '/mock-products/hair-clip.svg', '/mock-products/sunglasses.svg'],
    variants: [
      { sku: 'BAH-WCH-GLD-ONE', colorName: 'ذهبي', colorValue: '#c9a65a', size: 'مقاس موحد', price: 79, compareAtPrice: 99, quantity: 4 },
      { sku: 'BAH-WCH-ROSE-ONE', colorName: 'روز', colorValue: '#d4a49c', size: 'مقاس موحد', price: 82, compareAtPrice: 105, quantity: 1, lowStockThreshold: 2 }
    ]
  },
  {
    categorySlug: 'accessories',
    name: 'طقم مشابك شعر',
    slug: 'hair-clip-set',
    subtitle: 'بيج وذهبي • ستايل ناعم',
    description: 'طقم مشابك بسيط وناعم مناسب للتنسيق اليومي والسريع.',
    details: ['خفيفة', 'ألوان هادئة', 'مناسبة للفتيات والسيدات'],
    basePrice: 18,
    isBestSeller: true,
    rating: 4.3,
    reviewCount: 91,
    soldCount: 622,
    tags: ['مشابك', 'شعر', 'إكسسوارات'],
    images: ['/mock-products/hair-clip.svg', '/mock-products/scarf.svg', '/mock-products/makeup-set.svg'],
    variants: [
      { sku: 'BAH-HCLP-BEG-3', colorName: 'بيج', colorValue: '#ead8c1', size: '3 قطع', price: 18, quantity: 0 },
      { sku: 'BAH-HCLP-GLD-5', colorName: 'ذهبي', colorValue: '#c9a65a', size: '5 قطع', price: 25, quantity: 0 }
    ]
  },
  {
    categorySlug: 'perfumes',
    name: 'بوكس هدية عطر ومكياج',
    slug: 'ready-gift-box',
    subtitle: 'عطر + لمسة مكياج + تغليف فاخر',
    description: 'بوكس هدية بتقديم أنيق يجمع لمسات الجمال والعطر والشوكولاتة.',
    details: ['جاهز للإهداء', 'تغليف فاخر', 'مناسب للمناسبات الخاصة'],
    basePrice: 129,
    compareAtPrice: 149,
    isFeatured: true,
    isNewArrival: true,
    rating: 4.9,
    reviewCount: 18,
    soldCount: 78,
    tags: ['هدايا', 'عطور', 'بوكس'],
    images: ['/mock-products/gift-box.svg', '/mock-products/perfume-gold.svg', '/mock-products/makeup-set.svg'],
    variants: [
      { sku: 'BAH-GIFT-STD', colorName: 'ذهبي', colorValue: '#c9a65a', size: 'Standard', price: 129, compareAtPrice: 149, quantity: 5 },
      { sku: 'BAH-GIFT-PRM', colorName: 'كريمي', colorValue: '#f1dfc8', size: 'Premium', price: 159, compareAtPrice: 189, quantity: 2 }
    ]
  },
  {
    categorySlug: 'clothes',
    name: 'كارديغان بيج خفيف',
    slug: 'soft-beige-cardigan',
    subtitle: 'ناعم • يومي • سهل التنسيق',
    description: 'كارديغان خفيف بألوان دافئة يناسب الطقس المعتدل والإطلالات اليومية.',
    details: ['قماش لطيف', 'قصّة مريحة', 'يناسب الجينز والتنانير'],
    basePrice: 74,
    compareAtPrice: 95,
    isNewArrival: true,
    rating: 4.5,
    reviewCount: 24,
    soldCount: 86,
    tags: ['ملابس', 'كارديغان', 'بيج'],
    images: ['/mock-products/scarf.svg', '/mock-products/bag-camel.svg'],
    variants: [
      { sku: 'BAH-CARD-BEG-S', colorName: 'بيج', colorValue: '#ead8c1', size: 'S', price: 74, compareAtPrice: 95, quantity: 3 },
      { sku: 'BAH-CARD-BEG-M', colorName: 'بيج', colorValue: '#ead8c1', size: 'M', price: 74, compareAtPrice: 95, quantity: 7 },
      { sku: 'BAH-CARD-CAM-M', colorName: 'كاميل', colorValue: '#bd8754', size: 'M', price: 79, compareAtPrice: 99, quantity: 0 }
    ]
  },
  {
    categorySlug: 'shoes',
    name: 'صندل يومي كاميل',
    slug: 'camel-daily-sandals',
    subtitle: 'مريح وخفيف للمشاوير',
    description: 'صندل يومي بلون كاميل عملي مع تفاصيل ناعمة.',
    details: ['نعل مريح', 'لون سهل التنسيق', 'خفيف'],
    basePrice: 68,
    isNewArrival: true,
    rating: 4.4,
    reviewCount: 19,
    soldCount: 54,
    tags: ['أحذية', 'صندل', 'كاميل'],
    images: ['/mock-products/heels.svg', '/mock-products/wallet.svg'],
    variants: [
      { sku: 'BAH-SND-CAM-37', colorName: 'كاميل', colorValue: '#bd8754', size: '37', price: 68, quantity: 5 },
      { sku: 'BAH-SND-CAM-38', colorName: 'كاميل', colorValue: '#bd8754', size: '38', price: 68, quantity: 2, lowStockThreshold: 3 },
      { sku: 'BAH-SND-CAM-39', colorName: 'كاميل', colorValue: '#bd8754', size: '39', price: 68, quantity: 0 }
    ]
  },
  {
    categorySlug: 'creams-makeup',
    name: 'كريم ترطيب يومي',
    slug: 'daily-soft-cream',
    subtitle: 'ترطيب خفيف • مناسب للروتين اليومي',
    description: 'كريم ترطيب بنهاية ناعمة مناسب للاستخدام اليومي.',
    details: ['قوام خفيف', 'سهل الحمل', 'مناسب قبل المكياج'],
    basePrice: 32,
    rating: 4.2,
    reviewCount: 28,
    soldCount: 139,
    tags: ['كريم', 'عناية', 'مكياج'],
    images: ['/mock-products/makeup-set.svg', '/mock-products/perfume-gold.svg'],
    variants: [
      { sku: 'BAH-CRM-50', size: '50ml', price: 32, quantity: 10 },
      { sku: 'BAH-CRM-100', size: '100ml', price: 49, quantity: 4 }
    ]
  },
  {
    categorySlug: 'underwear',
    name: 'طقم أساسيات ناعم',
    slug: 'soft-basics-set',
    subtitle: 'ألوان هادئة • مريح للاستخدام اليومي',
    description: 'طقم أساسيات بتصميم بسيط وخامات مريحة.',
    details: ['قماش مرن', 'ألوان هادئة', 'مناسب للاستخدام اليومي'],
    basePrice: 42,
    compareAtPrice: 55,
    rating: 4.3,
    reviewCount: 17,
    soldCount: 72,
    tags: ['ملابس داخلية', 'أساسيات'],
    images: ['/mock-products/gift-box.svg', '/mock-products/scarf.svg'],
    variants: [
      { sku: 'BAH-UND-CRM-S', colorName: 'كريمي', colorValue: '#f1dfc8', size: 'S', price: 42, compareAtPrice: 55, quantity: 5 },
      { sku: 'BAH-UND-CRM-M', colorName: 'كريمي', colorValue: '#f1dfc8', size: 'M', price: 42, compareAtPrice: 55, quantity: 0 },
      { sku: 'BAH-UND-BLK-M', colorName: 'أسود', colorValue: '#111111', size: 'M', price: 45, compareAtPrice: 59, quantity: 3 }
    ]
  },
  {
    categorySlug: 'underwear',
    name: 'بيجاما ساتان دافئة',
    slug: 'warm-satin-pajama',
    subtitle: 'ناعم • أنيق • ألوان بوتيك',
    description: 'بيجاما ساتان مريحة بتفاصيل أنثوية دافئة.',
    details: ['ملمس ناعم', 'قصّة مريحة', 'مناسبة للهدايا'],
    basePrice: 88,
    compareAtPrice: 110,
    isFeatured: true,
    rating: 4.6,
    reviewCount: 22,
    soldCount: 65,
    tags: ['ملابس داخلية', 'بيجاما', 'ساتان'],
    images: ['/mock-products/gift-box.svg', '/mock-products/bag-camel.svg'],
    variants: [
      { sku: 'BAH-PAJ-ROS-S', colorName: 'روز', colorValue: '#d4a49c', size: 'S', price: 88, compareAtPrice: 110, quantity: 2, lowStockThreshold: 3 },
      { sku: 'BAH-PAJ-ROS-M', colorName: 'روز', colorValue: '#d4a49c', size: 'M', price: 88, compareAtPrice: 110, quantity: 4 },
      { sku: 'BAH-PAJ-BRN-L', colorName: 'بني', colorValue: '#6b432e', size: 'L', price: 92, compareAtPrice: 115, quantity: 0 }
    ]
  },
  {
    categorySlug: 'bags',
    name: 'شنطة سهرة سوداء',
    slug: 'black-evening-clutch',
    subtitle: 'صغيرة • لمسة ذهبية',
    description: 'شنطة سهرة سوداء بتفاصيل ذهبية خفيفة للمناسبات.',
    details: ['حجم مناسب للمناسبات', 'تفاصيل معدنية ذهبية', 'سير اختياري'],
    basePrice: 96,
    compareAtPrice: 125,
    isBestSeller: true,
    rating: 4.8,
    reviewCount: 39,
    soldCount: 112,
    tags: ['شنط', 'سهرة', 'أسود'],
    images: ['/mock-products/bag-camel.svg', '/mock-products/watch.svg'],
    variants: [
      { sku: 'BAH-CLTCH-BLK-ONE', colorName: 'أسود', colorValue: '#111111', size: 'مقاس موحد', price: 96, compareAtPrice: 125, quantity: 6 }
    ]
  },
  {
    categorySlug: 'perfumes',
    name: 'عطر مسك ناعم',
    slug: 'soft-musk-perfume',
    subtitle: 'هادئ • يومي • ثابت',
    description: 'عطر مسك ناعم برائحة نظيفة ودافئة للاستخدام اليومي.',
    details: ['رائحة ناعمة', 'ثبات جيد', 'تغليف جميل'],
    basePrice: 58,
    isNewArrival: true,
    rating: 4.5,
    reviewCount: 25,
    soldCount: 88,
    tags: ['عطر', 'مسك', 'يومي'],
    images: ['/mock-products/perfume-gold.svg', '/mock-products/gift-box.svg'],
    variants: [
      { sku: 'BAH-MUSK-30', size: '30ml', price: 58, quantity: 9 },
      { sku: 'BAH-MUSK-50', size: '50ml', price: 76, quantity: 1, lowStockThreshold: 2 }
    ]
  },
  {
    categorySlug: 'clothes',
    name: 'بلوزة كريمية ناعمة',
    slug: 'cream-soft-blouse',
    subtitle: 'ستايل يومي أنيق',
    description: 'بلوزة كريمية بتصميم ناعم تصلح للعمل والخروجات.',
    details: ['قصّة مريحة', 'لون كريمي دافئ', 'سهل التنسيق'],
    basePrice: 59,
    isFeatured: true,
    rating: 4.4,
    reviewCount: 27,
    soldCount: 104,
    tags: ['ملابس', 'بلوزة', 'كريمي'],
    images: ['/mock-products/scarf.svg', '/mock-products/sunglasses.svg'],
    variants: [
      { sku: 'BAH-BLO-CRM-S', colorName: 'كريمي', colorValue: '#f1dfc8', size: 'S', price: 59, quantity: 4 },
      { sku: 'BAH-BLO-CRM-M', colorName: 'كريمي', colorValue: '#f1dfc8', size: 'M', price: 59, quantity: 5 },
      { sku: 'BAH-BLO-BRN-M', colorName: 'بني فاتح', colorValue: '#b8815c', size: 'M', price: 62, quantity: 0 }
    ]
  },
  {
    categorySlug: 'creams-makeup',
    name: 'روج ترابي مطفي',
    slug: 'matte-earth-lipstick',
    subtitle: 'لون دافئ • مناسب لكل يوم',
    description: 'روج مطفي بدرجات ترابية دافئة يناسب مكياج يومي ناعم.',
    details: ['لون ثابت', 'ملمس مريح', 'درجات دافئة'],
    basePrice: 24,
    compareAtPrice: 32,
    isBestSeller: true,
    rating: 4.5,
    reviewCount: 44,
    soldCount: 203,
    tags: ['روج', 'مكياج', 'ترابي'],
    images: ['/mock-products/makeup-set.svg', '/mock-products/hair-clip.svg'],
    variants: [
      { sku: 'BAH-LIP-CIN', colorName: 'قرفة', colorValue: '#a75b45', size: 'مقاس موحد', price: 24, compareAtPrice: 32, quantity: 8 },
      { sku: 'BAH-LIP-ROS', colorName: 'روز دافئ', colorValue: '#c57978', size: 'مقاس موحد', price: 24, compareAtPrice: 32, quantity: 0 }
    ]
  },
  {
    categorySlug: 'accessories',
    name: 'سلسلة ذهبية ناعمة',
    slug: 'soft-gold-necklace',
    subtitle: 'تفصيل بسيط • لمعة أنيقة',
    description: 'سلسلة ناعمة بلمعة ذهبية خفيفة تناسب الإطلالات اليومية.',
    details: ['خفيفة', 'مناسبة للتكديس', 'هدية بسيطة'],
    basePrice: 34,
    compareAtPrice: 45,
    isNewArrival: true,
    rating: 4.4,
    reviewCount: 13,
    soldCount: 57,
    tags: ['سلسلة', 'إكسسوارات', 'ذهبي'],
    images: ['/mock-products/watch.svg', '/mock-products/hair-clip.svg'],
    variants: [
      { sku: 'BAH-NCK-GLD-ONE', colorName: 'ذهبي', colorValue: '#c9a65a', size: 'مقاس موحد', price: 34, compareAtPrice: 45, quantity: 7 }
    ]
  },
  {
    categorySlug: 'shoes',
    name: 'حذاء مسطح بيج',
    slug: 'beige-flat-shoes',
    subtitle: 'مريح • يومي • أنيق',
    description: 'حذاء مسطح بلون بيج مناسب للمشاوير اليومية.',
    details: ['خفيف', 'مريح للمشي', 'لون محايد'],
    basePrice: 73,
    rating: 4.3,
    reviewCount: 15,
    soldCount: 48,
    tags: ['أحذية', 'بيج', 'مسطح'],
    images: ['/mock-products/heels.svg', '/mock-products/scarf.svg'],
    variants: [
      { sku: 'BAH-FLAT-BEG-37', colorName: 'بيج', colorValue: '#ead8c1', size: '37', price: 73, quantity: 3 },
      { sku: 'BAH-FLAT-BEG-38', colorName: 'بيج', colorValue: '#ead8c1', size: '38', price: 73, quantity: 0 },
      { sku: 'BAH-FLAT-BEG-39', colorName: 'بيج', colorValue: '#ead8c1', size: '39', price: 73, quantity: 2 }
    ]
  },
  {
    categorySlug: 'perfumes',
    name: 'معطر جسم فانيلا',
    slug: 'vanilla-body-mist',
    subtitle: 'خفيف • رائحة دافئة',
    description: 'معطر جسم برائحة فانيلا دافئة وخفيفة للاستخدام اليومي.',
    details: ['سهل الحمل', 'رائحة ناعمة', 'مناسب بعد الاستحمام'],
    basePrice: 37,
    compareAtPrice: 48,
    rating: 4.1,
    reviewCount: 21,
    soldCount: 116,
    tags: ['معطر', 'فانيلا', 'عطور'],
    images: ['/mock-products/perfume-gold.svg', '/mock-products/makeup-set.svg'],
    variants: [
      { sku: 'BAH-MIST-VAN-ONE', colorName: 'فانيلا', colorValue: '#f1dfc8', size: '150ml', price: 37, compareAtPrice: 48, quantity: 0 }
    ]
  }
];

async function main() {
  await prisma.backInStockRequest.deleteMany();
  await prisma.abandonedCart.deleteMany();
  await prisma.inventoryLog.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.category.deleteMany();

  const categoryBySlug = new Map<string, string>();

  for (const [index, category] of categories.entries()) {
    const created = await prisma.category.create({
      data: {
        ...category,
        sortOrder: index + 1,
        isActive: true
      }
    });
    categoryBySlug.set(category.slug, created.id);
  }

  await prisma.banner.createMany({
    data: [
      {
        title: 'جمالك يبدأ من سعد سنتر',
        subtitle: 'مستحضرات تجميل، عطور، عناية وإكسسوارات مختارة بعناية مع لمسات خاصة لتجهيز العرائس.',
        eyebrow: 'Saad Center Beauty & Bridal',
        imageUrl: '/mock-products/bag-camel.svg',
        href: '/category/new-in',
        ctaLabel: 'تسوّقي الآن',
        placement: BannerPlacement.HOME_HERO,
        sortOrder: 1,
        isActive: true
      },
      {
        title: 'عروض مختارة لفترة محدودة',
        subtitle: 'خصومات دافئة على قطع بوتيك مميزة، والتوصيل مجاني للطلبات فوق ₪150.',
        eyebrow: 'Today Offers',
        imageUrl: '/mock-products/gift-box.svg',
        href: '/category/sale',
        ctaLabel: 'شاهدي العروض',
        placement: BannerPlacement.HOME_PROMO,
        sortOrder: 1,
        isActive: true
      }
    ]
  });

  for (const product of products) {
    const categoryId = categoryBySlug.get(product.categorySlug);
    if (!categoryId) throw new Error(`Missing category for ${product.categorySlug}`);

    await prisma.product.create({
      data: {
        categoryId,
        name: product.name,
        slug: product.slug,
        subtitle: product.subtitle,
        description: product.description,
        details: product.details,
        careInstructions: product.careInstructions,
        brand: product.brand,
        basePrice: product.basePrice,
        compareAtPrice: product.compareAtPrice,
        status: ProductStatus.ACTIVE,
        isFeatured: product.isFeatured ?? false,
        isNewArrival: product.isNewArrival ?? false,
        isBestSeller: product.isBestSeller ?? false,
        rating: product.rating,
        reviewCount: product.reviewCount ?? 0,
        soldCount: product.soldCount ?? 0,
        tags: product.tags ?? [],
        images: {
          create: product.images.map((url, index) => ({
            url,
            alt: `${product.name} ${index + 1}`,
            sortOrder: index,
            isPrimary: index === 0
          }))
        },
        variants: {
          create: product.variants.map((variant) => ({
            sku: variant.sku,
            colorName: variant.colorName,
            colorValue: variant.colorValue,
            size: variant.size,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice,
            quantity: variant.quantity,
            lowStockThreshold: variant.lowStockThreshold ?? 5,
            isActive: true
          }))
        }
      }
    });
  }

  console.log(`Seeded ${categories.length} categories, 2 banners, ${products.length} products.`);

  await seedAdminUser();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
