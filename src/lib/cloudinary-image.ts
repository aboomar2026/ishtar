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

function isCloudinaryUpload(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname === 'res.cloudinary.com' && parsed.pathname.includes('/image/upload/');
  } catch { return false; }
}

/** A bounded set of delivery variants, shared by foreground/backdrop images.
 * External/local assets must not get a srcset advertising identical originals.
 */
export function getCloudinaryResponsiveSource(url: string, options: CloudinaryTransformOptions, widths: readonly number[], sizes: string) {
  const src = getCloudinaryTransformedUrl(url, options);
  if (!isCloudinaryUpload(url)) return { src };
  const baseWidth = options.width ?? 800;
  const ratio = (options.height ?? 1000) / baseWidth;
  const candidates = [...new Set(widths)].filter(width => Number.isInteger(width) && width > 0 && width <= baseWidth).sort((a, b) => a - b);
  return { src, srcSet: candidates.map(width => `${getCloudinaryTransformedUrl(url, { ...options, width, height: Math.round(width * ratio) })} ${width}w`).join(', ') || undefined, sizes };
}

export function getCloudinaryTransformedUrl(
  url: string,
  options: CloudinaryTransformOptions = {}
): string {
  if (!isCloudinaryUpload(url)) return url;

  const width = options.width ?? 800;
  const height = options.height ?? 1000;
  const crop = options.crop ?? 'fill';
  const gravity = options.gravity ?? 'auto';
  // Fit/limit resize the whole image; Cloudinary rejects auto gravity with them.
  const gravityTransform = crop === 'fill' ? `,g_${gravity}` : '';

  return url.replace(
    '/upload/',
    `/upload/f_auto,q_auto,w_${width},h_${height},c_${crop}${gravityTransform}/`
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
