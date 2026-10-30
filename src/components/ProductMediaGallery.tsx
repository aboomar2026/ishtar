'use client';

import { useDialog } from './useDialog';
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CatalogProductImage } from '@/features/catalog/catalog.types';
import { FALLBACK_PRODUCT_IMAGE } from '@/features/catalog/catalog.utils';
import { brand } from '@/lib/brand';
import { CatalogImage } from './CatalogImage';
import { PRODUCT_GALLERY_IMAGE, PRODUCT_THUMB_IMAGE } from '@/lib/cloudinary-image';

const galleryTransform = brand.key === 'ishtar' ? { ...PRODUCT_GALLERY_IMAGE, crop: 'fit' as const } : PRODUCT_GALLERY_IMAGE;
const thumbTransform = brand.key === 'ishtar' ? { ...PRODUCT_THUMB_IMAGE, crop: 'fit' as const } : PRODUCT_THUMB_IMAGE;

export function ProductMediaGallery({ images, title, allowZoom = true }: { images: CatalogProductImage[]; title: string; allowZoom?: boolean }) {
  const galleryImages = useMemo(
    () => {
      if (!images.length) return [{ id: 'fallback', url: FALLBACK_PRODUCT_IMAGE, alt: title, sortOrder: 0, isPrimary: true }];
      const primary = images.find(image => image.isPrimary) ?? images[0];
      const rest = images.filter(image => image.id !== primary.id);
      return [primary, ...rest.filter(image => image.alt?.startsWith('توضيح الاستخدام:')), ...rest.filter(image => !image.alt?.startsWith('توضيح الاستخدام:'))];
    },
    [images, title]
  );
  const [activeImage, setActiveImage] = useState(galleryImages[0]?.url ?? FALLBACK_PRODUCT_IMAGE);

  const activeEntry = galleryImages.find(image => image.url === activeImage);
  const usageCaption = activeEntry?.alt?.startsWith('توضيح الاستخدام:') ? activeEntry.alt : null;

  const [zoomOpen, setZoomOpen] = useState(false);
  const zoomRef = useDialog(zoomOpen, () => setZoomOpen(false));
  const mainImage = <CatalogImage src={activeImage} transform={galleryTransform} widths={[480, 800, 1000]}
    sizes="(max-width: 780px) calc(100vw - 52px), (max-width: 1200px) 48vw, 580px"
    alt={activeEntry?.alt || title} loading="eager" fetchPriority="high" />;
  return (
    <div className="mediaGallery">
      {allowZoom ? <button type="button" className="mediaMain" aria-label={`تكبير صورة ${title}`} onClick={() => setZoomOpen(true)}>
        {mainImage}
      </button> : <div className="mediaMain">{mainImage}</div>}
      {usageCaption && <p className="mediaUsageCaption">{usageCaption}</p>}
      <div className="mediaThumbs">
        {galleryImages.map((image) => (
          <button
            type="button"
            key={image.id}
            className={activeImage === image.url ? 'active' : ''}
            aria-label={`عرض ${image.alt || title}`} aria-pressed={activeImage === image.url}
            onClick={() => setActiveImage(image.url)}
          >
            <CatalogImage
              src={image.url} transform={thumbTransform} sizes="(max-width: 780px) 30vw, 180px" loading="lazy"
              alt={image.alt ?? ''}
            />
          </button>
        ))}
      </div>
      {zoomOpen && createPortal(<div className="galleryZoomBackdrop" onClick={(event) => { if (event.target === event.currentTarget) setZoomOpen(false); }}>
        <div className="galleryZoom" role="dialog" aria-modal="true" aria-label={`صورة ${title}`} ref={zoomRef} tabIndex={-1}>
          <button type="button" className="ghostButton" onClick={() => setZoomOpen(false)}>إغلاق الصورة</button>
          <CatalogImage src={activeImage} transform={galleryTransform} sizes="90vw" alt={activeEntry?.alt || title} />
          {usageCaption && <p className="mediaUsageCaption">{usageCaption}</p>}
        </div>
      </div>, document.body)}
    </div>
  );
}
