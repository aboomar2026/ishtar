/** Curated category artwork. Admin uploads always take precedence. */
const photo = (id: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=640`;
export const CATEGORY_IMAGES: Readonly<Record<string, string>> = {
  accessories: '/category-images/accessories.jpg',
  perfumes: '/category-images/perfumes.jpg',
  clothes: '/category-images/clothes.jpg',
  shoes: '/category-images/shoes.jpg',
  underwear: '/category-images/underwear.jpg',
  'creams-makeup': '/category-images/makeup.jpg',
  bags: '/category-images/bags.jpg',
  cosmetics: '/category-images/makeup.jpg',
  'collection-womens-shoes': '/category-images/shoes.jpg',
  'collection-womens-bags': '/category-images/bags.jpg',
  'collection-womens-watches': photo(14808296),
  'collection-fragrances': '/category-images/perfumes.jpg',
  'collection-skin-care': photo(4857811),
  'collection-womens-dresses': photo(35538618),
  'collection-womens-jewellery': photo(10581732),
  'collection-beauty': '/category-images/makeup.jpg',
  'collection-tops': photo(11674381),
  'collection-sunglasses': photo(10388460),
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
