'use client';
import { useMemo, useState } from 'react';
import type { CatalogProductImage } from '@/features/catalog/catalog.types';
import { FALLBACK_PRODUCT_IMAGE } from '@/features/catalog/catalog.utils';
import { brand } from '@/lib/brand';
import { CatalogImage } from './CatalogImage';
import { PRODUCT_GALLERY_IMAGE, PRODUCT_THUMB_IMAGE } from '@/lib/cloudinary-image';
import { productImageAlt, ProductImageViewer } from './ProductImageViewer';

const galleryTransform = brand.key === 'ishtar' ? { ...PRODUCT_GALLERY_IMAGE, crop: 'fit' as const } : PRODUCT_GALLERY_IMAGE;
const thumbTransform = { ...PRODUCT_THUMB_IMAGE, crop: 'fit' as const };
export function ProductMediaGallery({ images, title, caption }: { images: CatalogProductImage[]; title: string; caption?: string }) {
  const galleryImages = useMemo(() => {
    if (!images.length) return [{ id: 'fallback', url: FALLBACK_PRODUCT_IMAGE, alt: title, sortOrder: 0, isPrimary: true }];
    const primary = images.find(image => image.isPrimary) ?? images[0];
    const rest = images.filter(image => image.id !== primary.id);
    return [primary, ...rest.filter(image => image.alt?.startsWith('توضيح الاستخدام:')), ...rest.filter(image => !image.alt?.startsWith('توضيح الاستخدام:'))];
  }, [images, title]);
  const [activeId, setActiveId] = useState(galleryImages[0].id);
  const [open, setOpen] = useState(false);
  const index = Math.max(0, galleryImages.findIndex(image => image.id === activeId));
  const active = galleryImages[index];
  function select(position: number) { setActiveId(galleryImages[position].id); }
  return <div className="mediaGallery">
    <button type="button" className="mediaMain" aria-label={`فتح معرض صور ${title}`} onClick={() => setOpen(true)}>
      <CatalogImage src={active.url} transform={galleryTransform} widths={[480, 800, 1000]}
        sizes="(max-width: 780px) calc(100vw - 52px), (max-width: 1200px) 48vw, 580px"
        alt={productImageAlt(active, title)} loading="eager" fetchPriority="high" />
    </button>
    <p className="mediaUsageCaption">{caption?.trim() || title}</p>
    <div className="mediaThumbs">
      {galleryImages.map((image, position) => <button type="button" key={image.id}
        className={position === index ? 'active' : ''} aria-label={`فتح الصورة ${position + 1}: ${productImageAlt(image, title)}`} aria-pressed={position === index}
        onClick={() => { select(position); setOpen(true); }}>
        <CatalogImage src={image.url} transform={thumbTransform} sizes="(max-width: 780px) 30vw, 180px" loading="lazy" alt={productImageAlt(image, title)} />
      </button>)}
    </div>
    {open && <ProductImageViewer images={galleryImages} title={title} caption={caption} index={index} onIndexChange={select} onClose={() => setOpen(false)} />}
  </div>;
}
