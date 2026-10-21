import { NextResponse } from 'next/server';
import { getAdminSession } from '@/features/admin/auth/admin-auth';
import { deleteImageByPublicId } from '@/lib/cloudinary';
import { UPLOAD_MESSAGES } from '@/features/admin/uploads/upload-constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Conservative delete: only removes a Cloudinary asset when an authenticated
 * admin explicitly asks for it (e.g. replacing/removing an image). We never
 * auto-delete on product/banner edits.
 */
export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, error: UPLOAD_MESSAGES.unauthorized }, { status: 401 });
  }

  let publicId: unknown;
  try {
    const body = await request.json();
    publicId = body?.publicId;
  } catch {
    publicId = undefined;
  }

  if (typeof publicId !== 'string' || publicId.trim() === '') {
    return NextResponse.json({ success: false, error: UPLOAD_MESSAGES.missingPublicId }, { status: 400 });
  }

  try {
    const ok = await deleteImageByPublicId(publicId.trim());
    if (!ok) {
      return NextResponse.json({ success: false, error: UPLOAD_MESSAGES.deleteFailed }, { status: 502 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[uploads/delete] Cloudinary delete failed:', error);
    return NextResponse.json({ success: false, error: UPLOAD_MESSAGES.deleteFailed }, { status: 500 });
  }
}
