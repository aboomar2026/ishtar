import type { CatalogProduct } from '@/features/catalog/catalog.types';
import { brand } from './brand';
import { absoluteUrl, catalogPath, plainDescription } from './seo';

export function breadcrumbData(items: { name: string; path: string }[]) {
  if (!absoluteUrl('/')) return undefined;
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((item, index) => ({
    '@type': 'ListItem', position: index + 1, name: item.name, item: absoluteUrl(item.path)
  })) };
}

export function storeData() {
  const url = absoluteUrl('/');
  if (!url) return undefined;
  return { '@context': 'https://schema.org', '@graph': [
    { '@type': 'OnlineStore', '@id': `${url}#store`, name: brand.name, alternateName: brand.englishName, url,
      logo: absoluteUrl(brand.assets.appleTouchIcon || brand.assets.icon || '/icon.svg'), description: brand.seo.description },
    { '@type': 'WebSite', '@id': `${url}#website`, name: brand.name, alternateName: brand.englishName, url, inLanguage: 'ar', publisher: { '@id': `${url}#store` } }
  ] };
}

export function productData(product: CatalogProduct) {
  const url = absoluteUrl(catalogPath('product', product.slug));
  const home = absoluteUrl('/');
  if (!url || !home) return undefined;
  const variants = product.variants.filter((variant) => variant.isActive && Number.isFinite(variant.price) && variant.price >= 0);
  const images = product.images.map((image) => absoluteUrl(image.url)).filter((image): image is string => Boolean(image));
  return { '@context': 'https://schema.org', '@type': 'Product', '@id': `${url}#product`, url,
    name: product.name, description: plainDescription(product.description),
    image: images.length ? [...new Set(images)] : undefined,
    category: product.category?.name,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    sku: variants.length === 1 ? variants[0].sku : undefined,
    // Each selectable option has its actual price and stock. No sample ratings or policy claims.
    offers: variants.length ? variants.map((variant) => ({ '@type': 'Offer', url,
      name: [product.name, variant.colorName, variant.size].filter(Boolean).join(' · '),
      price: variant.price.toFixed(2), priceCurrency: 'ILS',
      availability: `https://schema.org/${variant.quantity > 0 ? 'InStock' : 'OutOfStock'}`,
      seller: { '@type': 'OnlineStore', '@id': `${home}#store`, name: brand.name }
    })) : undefined
  };
}
