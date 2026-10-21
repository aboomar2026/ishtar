'use client';

import { useState } from 'react';
import {
  UPLOAD_MESSAGES,
  validateImageFile,
  type UploadKind,
  type UploadResponse,
  type UploadedImage
} from './upload-constants';

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

/**
 * Send one image file to the protected admin upload route.
 * Performs client-side pre-validation, then posts multipart/form-data.
 */
export async function uploadImage(file: File, kind: UploadKind): Promise<UploadResponse> {
  const clientError = validateImageFile(file);
  if (clientError) return { success: false, error: clientError };

  const body = new FormData();
  body.append('file', file);
  body.append('kind', kind);

  try {
    const res = await fetch('/admin/api/uploads', { method: 'POST', body });
    const data = (await res.json()) as UploadResponse;
    return data;
  } catch {
    return { success: false, error: UPLOAD_MESSAGES.uploadFailed };
  }
}

/**
 * Small hook bundling upload state for a single uploader.
 * Prevents double uploads and surfaces idle/uploading/success/error states.
 */
export function useImageUpload(kind: UploadKind) {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File): Promise<UploadedImage | null> {
    if (status === 'uploading') return null; // guard against double upload
    setError(null);
    setStatus('uploading');

    const result = await uploadImage(file, kind);
    if (result.success) {
      setStatus('success');
      return result.image;
    }
    setError(result.error);
    setStatus('error');
    return null;
  }

  function reset() {
    setStatus('idle');
    setError(null);
  }

  return { status, error, upload, reset, isUploading: status === 'uploading' };
}
