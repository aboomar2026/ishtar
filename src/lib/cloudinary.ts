import 'server-only';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import type { UploadedImage, UploadKind } from '@/features/admin/uploads/upload-constants';

/**
 * Server-only Cloudinary wrapper. NEVER import this from a client component —
 * it reads CLOUDINARY_API_SECRET, which must stay on the server.
 */

type CloudinaryEnv = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
};

let cached: CloudinaryEnv | null = null;

function readEnv(): CloudinaryEnv {
  if (cached) return cached;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const folder = process.env.CLOUDINARY_FOLDER;

  const missing = [
    ['CLOUDINARY_CLOUD_NAME', cloudName],
    ['CLOUDINARY_API_KEY', apiKey],
    ['CLOUDINARY_API_SECRET', apiSecret],
    ['CLOUDINARY_FOLDER', folder]
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Cloudinary is not configured. Missing env vars: ${missing.join(', ')}`);
  }

  cached = {
    cloudName: cloudName as string,
    apiKey: apiKey as string,
    apiSecret: apiSecret as string,
    folder: folder as string
  };

  cloudinary.config({
    cloud_name: cached.cloudName,
    api_key: cached.apiKey,
    api_secret: cached.apiSecret,
    secure: true
  });

  return cached;
}

/** Returns true when all required Cloudinary env vars are present. */
export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET &&
      process.env.CLOUDINARY_FOLDER
  );
}

/** Map a logical upload kind to its Cloudinary sub-folder. */
function folderForKind(kind: UploadKind): string {
  const { folder } = readEnv();
  const sub = kind === 'banner' ? 'banners' : 'products';
  return `${folder}/${sub}`;
}

function toUploadedImage(result: UploadApiResponse): UploadedImage {
  return {
    secureUrl: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes
  };
}

/**
 * Upload an image buffer to Cloudinary using a signed server-side upload.
 * Returns the normalized image metadata for persistence.
 */
export async function uploadImageBuffer(buffer: Buffer, kind: UploadKind): Promise<UploadedImage> {
  readEnv(); // ensures config + env validation

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folderForKind(kind),
        resource_type: 'image',
        // Defense in depth: only let Cloudinary accept real raster image formats.
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
        overwrite: false
      },
      (error, uploaded) => {
        if (error || !uploaded) {
          reject(error ?? new Error('Cloudinary upload returned no result'));
          return;
        }
        resolve(uploaded);
      }
    );
    stream.end(buffer);
  });

  return toUploadedImage(result);
}

/** Delete an image from Cloudinary by its publicId. */
export async function deleteImageByPublicId(publicId: string): Promise<boolean> {
  readEnv();
  const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
  return result.result === 'ok' || result.result === 'not found';
}

/**
 * Build an optimized delivery URL (auto format + quality) for a stored publicId.
 * Useful for thumbnails; storefront can also just use the secure_url directly.
 */
export function optimizedImageUrl(publicId: string, width?: number): string {
  readEnv();
  return cloudinary.url(publicId, {
    secure: true,
    fetch_format: 'auto',
    quality: 'auto',
    ...(width ? { width, crop: 'limit' } : {})
  });
}
