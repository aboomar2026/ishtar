/**
 * Build a transformed Cloudinary delivery URL from a stored secure_url by
 * injecting a transformation segment after `/upload/`. Non-Cloudinary URLs
 * (e.g. the local `/mock-products/*.svg` fallbacks) are returned unchanged, so
 * this is always safe to call at render time.
 */

export type CloudinaryCrop = 'fill' | 'fit' | 'limit';

export type CloudinaryTransformOptions = {
  width?: number;
  height?: number;
  crop?: CloudinaryCrop;
  gravity?: string;
};

export function getCloudinaryTransformedUrl(
  url: string,
  options: CloudinaryTransformOptions = {}
): string {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;

  const width = options.width ?? 800;
  const height = options.height ?? 1000;
  const crop = options.crop ?? 'fill';
  const gravity = options.gravity ?? 'auto';

  return url.replace(
    '/upload/',
    `/upload/f_auto,q_auto,w_${width},h_${height},c_${crop},g_${gravity}/`
  );
}

/** 4:5 product card thumbnail. */
export const PRODUCT_CARD_IMAGE: CloudinaryTransformOptions = { width: 800, height: 1000, crop: 'fill', gravity: 'auto' };

/** Larger 4:5 image for the product detail gallery main view. */
export const PRODUCT_GALLERY_IMAGE: CloudinaryTransformOptions = { width: 1000, height: 1250, crop: 'fill', gravity: 'auto' };

/** Small square-ish gallery thumbnail. */
export const PRODUCT_THUMB_IMAGE: CloudinaryTransformOptions = { width: 200, height: 250, crop: 'fill', gravity: 'auto' };

/** Home hero collage tile. */
export const BANNER_IMAGE: CloudinaryTransformOptions = { width: 900, height: 760, crop: 'fill', gravity: 'auto' };
