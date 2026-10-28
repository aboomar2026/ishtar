'use client';

import { useState, type ImgHTMLAttributes } from 'react';
import { getCloudinaryResponsiveSource, type CloudinaryTransformOptions } from '@/lib/cloudinary-image';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'sizes' | 'onError'> & {
  src: string;
  transform: CloudinaryTransformOptions;
  widths?: readonly number[];
  sizes: string;
  fallbackSrc?: string;
};

/** Keeps source selection and failure handling identical in every catalogue view. */
export function CatalogImage({ src, transform, widths = [transform.width ?? 200], sizes, fallbackSrc = '/mock-products/gift-box.svg', alt = '', ...props }: Props) {
  const [failedSource, setFailedSource] = useState<string>();
  const failed = failedSource === src;
  const source = failed ? { src: fallbackSrc } : getCloudinaryResponsiveSource(src || fallbackSrc, transform, widths, sizes);
  return <img {...props} {...source} alt={alt} decoding="async" onError={() => { if (!failed) setFailedSource(src); }} />;
}
