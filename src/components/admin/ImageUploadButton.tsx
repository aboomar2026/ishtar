'use client';

import { useId, useRef } from 'react';
import { useImageUpload } from '@/features/admin/uploads/use-image-upload';
import { UPLOAD_ACCEPT_ATTR, type UploadKind, type UploadedImage } from '@/features/admin/uploads/upload-constants';

/**
 * Reusable admin image uploader: a button that opens a file picker, validates,
 * uploads to the protected route, and reports the stored image back to the form.
 * Keeps idle / uploading / success / error states and blocks double uploads.
 */
export function ImageUploadButton({
  kind,
  onUploaded,
  label = 'رفع صورة',
  className = 'adminBtn adminBtnGhost adminBtnSm'
}: {
  kind: UploadKind;
  onUploaded: (image: UploadedImage) => void;
  label?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const { status, error, upload, isUploading } = useImageUpload(kind);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset the input so selecting the same file again re-triggers change.
    event.target.value = '';
    if (!file) return;
    const image = await upload(file);
    if (image) onUploaded(image);
  }

  return (
    <span className="adminUploader">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={UPLOAD_ACCEPT_ATTR}
        className="adminUploaderInput"
        onChange={handleChange}
        disabled={isUploading}
      />
      <button
        type="button"
        className={className}
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        aria-busy={isUploading}
      >
        {isUploading ? 'جارٍ الرفع…' : label}
      </button>
      {status === 'success' && <span className="adminUploaderOk">تم رفع الصورة</span>}
      {status === 'error' && error && <span className="adminUploaderError">{error}</span>}
    </span>
  );
}
