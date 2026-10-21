/**
 * Shared upload constants and helpers used by BOTH the client upload UI and the
 * server route handler. Keep this file free of server-only imports so it can be
 * bundled into client components.
 */

export const UPLOAD_KINDS = ['product', 'banner'] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

/** Allowed image MIME types. SVG/GIF are intentionally excluded for this sprint. */
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif'
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

/** Max upload size: 5MB for product images and banners. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = '5 ميجابايت';

/** Human-friendly accept attribute for the file input. */
export const UPLOAD_ACCEPT_ATTR = ALLOWED_IMAGE_MIME_TYPES.join(',');

export function isAllowedMimeType(type: string): type is AllowedImageMimeType {
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(type);
}

export function isUploadKind(value: unknown): value is UploadKind {
  return typeof value === 'string' && (UPLOAD_KINDS as readonly string[]).includes(value);
}

/** Shape returned to the client on a successful upload. */
export type UploadedImage = {
  secureUrl: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
};

export type UploadResponse =
  | { success: true; image: UploadedImage }
  | { success: false; error: string };

/** Arabic-first messages shared by client + server validation. */
export const UPLOAD_MESSAGES = {
  noFile: 'لم يتم اختيار صورة.',
  badType: 'نوع الملف غير مدعوم. الصيغ المسموحة: JPG، PNG، WebP، AVIF.',
  tooLarge: `حجم الصورة كبير جداً. الحد الأقصى ${MAX_UPLOAD_LABEL}.`,
  unauthorized: 'يجب تسجيل الدخول كمشرف لرفع الصور.',
  uploadFailed: 'فشل رفع الصورة. حاول مرة أخرى.',
  deleteFailed: 'تعذّر حذف الصورة من الخادم.',
  missingPublicId: 'معرّف الصورة مفقود.'
} as const;

/**
 * Client-side pre-validation. Returns an Arabic error string, or null when valid.
 * The server repeats these checks — this is only a fast UX guard.
 */
export function validateImageFile(file: File): string | null {
  if (!file) return UPLOAD_MESSAGES.noFile;
  if (!isAllowedMimeType(file.type)) return UPLOAD_MESSAGES.badType;
  if (file.size > MAX_UPLOAD_BYTES) return UPLOAD_MESSAGES.tooLarge;
  return null;
}
