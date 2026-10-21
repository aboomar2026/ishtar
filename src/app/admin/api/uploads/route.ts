import { NextResponse } from 'next/server';
import { getAdminSession } from '@/features/admin/auth/admin-auth';
import { uploadImageBuffer } from '@/lib/cloudinary';
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_MESSAGES,
  isAllowedMimeType,
  isUploadKind,
  type UploadResponse
} from '@/features/admin/uploads/upload-constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(body: UploadResponse, status: number) {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  // 1. Require an authenticated admin session.
  const session = await getAdminSession();
  if (!session) {
    return json({ success: false, error: UPLOAD_MESSAGES.unauthorized }, 401);
  }

  // 2. Parse multipart/form-data.
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json({ success: false, error: UPLOAD_MESSAGES.uploadFailed }, 400);
  }

  const file = formData.get('file');
  const kindRaw = formData.get('kind');
  const kind = isUploadKind(kindRaw) ? kindRaw : 'product';

  // 3. Validate the file exists and is a Blob/File.
  if (!file || typeof file === 'string') {
    return json({ success: false, error: UPLOAD_MESSAGES.noFile }, 400);
  }

  // 4. Validate MIME type (SVG/GIF/etc rejected).
  if (!isAllowedMimeType(file.type)) {
    return json({ success: false, error: UPLOAD_MESSAGES.badType }, 415);
  }

  // 5. Validate size (5MB max).
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    return json({ success: false, error: UPLOAD_MESSAGES.tooLarge }, 413);
  }

  // 6. Upload to Cloudinary under the kind-specific folder.
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const image = await uploadImageBuffer(buffer, kind);
    return json({ success: true, image }, 200);
  } catch (error) {
    // Log server-side only; never leak secrets/stack traces to the client.
    console.error('[uploads] Cloudinary upload failed:', error);
    return json({ success: false, error: UPLOAD_MESSAGES.uploadFailed }, 500);
  }
}
