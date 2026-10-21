'use client';

import { useMemo, useState, type SyntheticEvent } from 'react';
import type { CatalogProductImage } from '@/features/catalog/catalog.types';
import { FALLBACK_PRODUCT_IMAGE } from '@/features/catalog/catalog.utils';
import { getCloudinaryTransformedUrl, PRODUCT_GALLERY_IMAGE, PRODUCT_THUMB_IMAGE } from '@/lib/cloudinary-image';

function handleImageError(event: SyntheticEvent<HTMLImageElement>) {
  if (event.currentTarget.src.endsWith(FALLBACK_PRODUCT_IMAGE)) return;
  event.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
}

export function ProductMediaGallery({ images, title }: { images: CatalogProductImage[]; title: string }) {
  const galleryImages = useMemo(
    () => images.length ? images : [{ id: 'fallback', url: FALLBACK_PRODUCT_IMAGE, alt: title, sortOrder: 0, isPrimary: true }],
    [images, title]
  );
  const [activeImage, setActiveImage] = useState(galleryImages[0]?.url ?? FALLBACK_PRODUCT_IMAGE);

  return (
    <div className="mediaGallery">
      <div className="mediaMain">
        <img
          src={getCloudinaryTransformedUrl(activeImage, PRODUCT_GALLERY_IMAGE)}
          alt={title}
          onError={handleImageError}
        />
      </div>
      <div className="mediaThumbs">
        {galleryImages.map((image) => (
          <button
            type="button"
            key={image.id}
            className={activeImage === image.url ? 'active' : ''}
            onClick={() => setActiveImage(image.url)}
          >
            <img
              src={getCloudinaryTransformedUrl(image.url, PRODUCT_THUMB_IMAGE)}
              alt={image.alt ?? ''}
              onError={handleImageError}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
