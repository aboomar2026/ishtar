/** Curated category artwork. Admin uploads always take precedence. */
export const CATEGORY_IMAGES: Readonly<Record<string, string>> = {
  accessories: '/category-images/accessories.avif',
  perfumes: '/category-images/perfumes.avif',
  clothes: '/category-images/clothes.avif',
  shoes: '/category-images/shoes.avif',
  underwear: '/category-images/underwear.avif',
  'creams-makeup': '/category-images/makeup.avif',
  bags: '/category-images/bags.avif',
  cosmetics: '/category-images/makeup.avif',
  'collection-womens-shoes': '/category-images/shoes.avif',
  'collection-womens-bags': '/category-images/bags.avif',
  'collection-womens-watches': '/category-images/watches.avif',
  'collection-fragrances': '/category-images/perfumes.avif',
  'collection-skin-care': '/category-images/skin-care.avif',
  'collection-womens-dresses': '/category-images/dresses.avif',
  'collection-womens-jewellery': '/category-images/jewellery.avif',
  'collection-beauty': '/category-images/makeup.avif',
  'collection-tops': '/category-images/tops.avif',
  'collection-sunglasses': '/category-images/sunglasses.avif',
};

const LEGACY_PHOTOS: Readonly<Record<string, string>> = {
  '28973056': 'accessories', '31823739': 'perfumes', '33482420': 'clothes',
  '1445696': 'shoes', '7235669': 'underwear', '7256102': 'creams-makeup', '22434765': 'bags',
};

export function getCategoryDefaultImage(slug: string): string {
  return CATEGORY_IMAGES[slug] ?? CATEGORY_IMAGES.accessories;
}

export function getCategoryImage(slug: string, imageUrl?: string | null): string {
  const src = imageUrl?.trim();
  if (!src || src.startsWith('/mock-products/')) return getCategoryDefaultImage(slug);
  // Serve unchanged legacy Pexels presets locally; retain all custom uploads/URLs.
  try {
    const url = new URL(src);
    const id = url.pathname.match(/^\/photos\/(\d+)\//)?.[1];
    if (url.hostname === 'images.pexels.com' && id && LEGACY_PHOTOS[id]) return getCategoryDefaultImage(LEGACY_PHOTOS[id]);
  } catch { /* A local path is also a valid administrator choice. */ }
  return src;
}
