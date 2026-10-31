'use client';
import { lockBodyScroll } from './dialog-scroll-lock';
import { useEffect, useRef, useState } from 'react';
import type { CatalogProductImage } from '@/features/catalog/catalog.types';
import { CatalogImage } from './CatalogImage';
import { PRODUCT_THUMB_IMAGE } from '@/lib/cloudinary-image';

export function imageCaption(image?: CatalogProductImage) {
  if (image?.alt?.startsWith('توضيح الاستخدام:')) return image.alt;
  return /مولّ?دة/.test(image?.alt ?? '') ? 'صورة توضيحية مولّدة؛ قد يختلف شكل اللبس الفعلي حسب المقاس.' : null;
}

// Native dialogs stay above the native quick-view dialog when nested.
export function ProductImageViewer({ images, title, index, onIndexChange, onClose }: {
  images: CatalogProductImage[]; title: string; index: number;
  onIndexChange: (index: number) => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [supported, setSupported] = useState(true);
  const activeIndex = Math.max(0, Math.min(index, images.length - 1));
  const image = images[activeIndex];
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || typeof dialog.showModal !== 'function') { setSupported(false); return; }
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    const unlockScroll = lockBodyScroll();
    return () => {
      dialog.close();
      unlockScroll();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  function select(next: number) {
    setZoomed(false);
    onIndexChange((next + images.length) % images.length);
  }
  if (!image) return null;
  if (!supported) return <div className="imageViewerFallback" role="status">
    <a href={image.url} target="_blank" rel="noopener noreferrer">فتح الصورة بالحجم الأصلي</a>
    <button type="button" onClick={onClose}>إغلاق معرض الصور</button>
  </div>;
  const caption = imageCaption(image);
  return <dialog ref={ref} className="productImageViewer" aria-label={`معرض صور ${title}`}
    onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    onKeyDown={event => {
      event.stopPropagation(); // Do not run the outer quick-view's focus handlers.
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); select(activeIndex + 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); select(activeIndex - 1); }
      if (event.key === 'Home') { event.preventDefault(); select(0); }
      if (event.key === 'End') { event.preventDefault(); select(images.length - 1); }
    }}>
    <div className="imageViewerSurface" dir="rtl">
      <header className="imageViewerHeader"><strong>{title}</strong>
        <button type="button" onClick={onClose} aria-label="إغلاق معرض الصور" autoFocus>إغلاق ×</button>
      </header>
      <div className={`imageViewerStage${zoomed ? ' isZoomed' : ''}`}
        onPointerDown={event => { pointer.current = !zoomed && event.isPrimary && event.pointerType !== 'mouse' ? { x: event.clientX, y: event.clientY } : null; }}
        onPointerCancel={() => { pointer.current = null; }}
        onPointerUp={event => {
          const start = pointer.current; pointer.current = null;
          if (!start || zoomed || images.length < 2) return;
          const dx = event.clientX - start.x, dy = event.clientY - start.y;
          if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.5) select(activeIndex + (dx > 0 ? 1 : -1));
        }}>
        <CatalogImage key={image.id} src={image.url} alt={image.alt || title}
          transform={{ width: 2400, height: 3000, crop: 'limit' }} widths={[800, 1200, 1800, 2400]}
          sizes={zoomed ? '2400px' : '(max-width: 780px) 96vw, 85vw'} loading="eager" draggable={false} />
      </div>
      <div className="imageViewerControls">
        <button type="button" aria-label="الصورة السابقة" disabled={images.length < 2} onClick={() => select(activeIndex - 1)}>السابق</button>
        <span role="status" aria-live="polite" aria-atomic="true">الصورة {activeIndex + 1} من {images.length}</span>
        <button type="button" aria-label="الصورة التالية" disabled={images.length < 2} onClick={() => select(activeIndex + 1)}>التالي</button>
        <button type="button" aria-pressed={zoomed} onClick={() => setZoomed(value => !value)}>{zoomed ? 'تصغير الصورة' : 'تكبير التفاصيل'}</button>
        <a href={image.url} target="_blank" rel="noopener noreferrer">الحجم الأصلي ↗</a>
      </div>
      {caption && <p className="imageViewerCaption">{caption}</p>}
      <div className="imageViewerThumbs" aria-label="صور هذا المنتج">
        {images.map((entry, position) => <button type="button" key={entry.id} aria-label={`الصورة ${position + 1} من ${images.length}`}
          aria-pressed={position === activeIndex} onClick={() => select(position)}>
          <CatalogImage src={entry.url} alt="" transform={{ ...PRODUCT_THUMB_IMAGE, crop: 'fit' }} sizes="64px" loading="lazy" />
        </button>)}
      </div>
    </div>
  </dialog>;
}

export function ProductImagePreview({ images, title, initialIndex = 0, imageClassName }: {
  images: CatalogProductImage[]; title: string; initialIndex?: number; imageClassName: string;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(initialIndex);
  const image = images[initialIndex] ?? images[0];
  if (!image) return null;
  return <>
    <button type="button" className="productImagePreviewButton" aria-label={`عرض صور ${title}`} onClick={() => { setIndex(initialIndex); setOpen(true); }}>
      <CatalogImage className={imageClassName} src={image.url} alt={image.alt || title} transform={{ ...PRODUCT_THUMB_IMAGE, crop: 'fit' }} sizes="100px" loading="lazy" />
    </button>
    {open && <ProductImageViewer images={images} title={title} index={index} onIndexChange={setIndex} onClose={() => setOpen(false)} />}
  </>;
}
