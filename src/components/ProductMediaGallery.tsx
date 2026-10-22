'use client';

import { useDialog } from './useDialog';
import { useMemo, useState, type SyntheticEvent } from 'react';
import type { CatalogProductImage } from '@/features/catalog/catalog.types';
import { FALLBACK_PRODUCT_IMAGE } from '@/features/catalog/catalog.utils';
import { brand } from '@/lib/brand';
import { getCloudinaryTransformedUrl, PRODUCT_GALLERY_IMAGE, PRODUCT_THUMB_IMAGE } from '@/lib/cloudinary-image';

function handleImageError(event: SyntheticEvent<HTMLImageElement>) {
  if (event.currentTarget.src.endsWith(FALLBACK_PRODUCT_IMAGE)) return;
  event.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
}

const galleryTransform = brand.key === 'ishtar' ? { ...PRODUCT_GALLERY_IMAGE, crop: 'fit' as const } : PRODUCT_GALLERY_IMAGE;
const thumbTransform = brand.key === 'ishtar' ? { ...PRODUCT_THUMB_IMAGE, crop: 'fit' as const } : PRODUCT_THUMB_IMAGE;

export function ProductMediaGallery({ images, title }: { images: CatalogProductImage[]; title: string }) {
  const galleryImages = useMemo(
    () => images.length ? images : [{ id: 'fallback', url: FALLBACK_PRODUCT_IMAGE, alt: title, sortOrder: 0, isPrimary: true }],
    [images, title]
  );
  const [activeImage, setActiveImage] = useState(galleryImages[0]?.url ?? FALLBACK_PRODUCT_IMAGE);

  const [zoomOpen, setZoomOpen] = useState(false);
  const zoomRef = useDialog(zoomOpen, () => setZoomOpen(false));
  return (
    <div className="mediaGallery">
      <button type="button" className="mediaMain" aria-label={`تكبير صورة ${title}`} onClick={() => setZoomOpen(true)}>
        <img
          src={getCloudinaryTransformedUrl(activeImage, galleryTransform)}
          alt={title}
          onError={handleImageError}
        />
      </button>
      <div className="mediaThumbs">
        {galleryImages.map((image) => (
          <button
            type="button"
            key={image.id}
            className={activeImage === image.url ? 'active' : ''}
            aria-label={`عرض ${image.alt || title}`} aria-pressed={activeImage === image.url}
            onClick={() => setActiveImage(image.url)}
          >
            <img
              src={getCloudinaryTransformedUrl(image.url, thumbTransform)}
              alt={image.alt ?? ''}
              onError={handleImageError}
            />
          </button>
        ))}
      </div>
      {zoomOpen && <div className="galleryZoomBackdrop" onClick={(event) => { if (event.target === event.currentTarget) setZoomOpen(false); }}>
        <div className="galleryZoom" role="dialog" aria-modal="true" aria-label={`صورة ${title}`} ref={zoomRef} tabIndex={-1}>
          <button type="button" className="ghostButton" onClick={() => setZoomOpen(false)}>إغلاق الصورة</button>
          <img src={getCloudinaryTransformedUrl(activeImage, galleryTransform)} alt={title} onError={handleImageError} />
        </div>
      </div>}
    </div>
  );
}
