"use client";
import Link from "next/link";
import {
  Gift,
  Heart,
  Sparkle,
  Flower,
  Handbag,
  ArrowLeft,
} from "@phosphor-icons/react";
import type { CollectionCardData } from "@/features/collections/collections.types";
import { CatalogImage } from "./CatalogImage";
export function CollectionSymbol({
  symbol,
  size = 28,
}: {
  symbol: string;
  size?: number;
}) {
  const Symbol =
    (
      { gift: Gift, heart: Heart, flower: Flower, bag: Handbag } as Record<
        string,
        typeof Gift
      >
    )[symbol] ?? Sparkle;
  return <Symbol size={size} weight="duotone" aria-hidden="true" />;
}
export function CollectionCard({
  collection,
  preview = false,
}: {
  collection: CollectionCardData;
  preview?: boolean;
}) {
  const images = collection.imageUrl
    ? [collection.imageUrl]
    : collection.images.slice(0, 3);
  return (
    <Link
      href={
        preview ? "#" : `/collections/${encodeURIComponent(collection.slug)}`
      }
      tabIndex={preview ? -1 : undefined}
      onClick={preview ? (event) => event.preventDefault() : undefined}
      className={`collectionCard collectionTone-${collection.tone}`}
    >
      <div
        className={`collectionArt ${images.length > 1 ? "isCollage" : ""}`}
        aria-hidden="true"
      >
        {images.map((src, index) => (
          <CatalogImage
            key={`${src}-${index}`}
            src={src} transform={{ width: 600, height: 600, crop: 'fit' }} widths={[320, 480, 600]}
            sizes={images.length > 1 ? '(max-width: 700px) 40vw, 180px' : '(max-width: 700px) 90vw, 400px'}
            alt=""
            loading="lazy"

          />
        ))}
        {!images.length && (
          <CollectionSymbol symbol={collection.symbol} size={80} />
        )}
        <span className="collectionSymbol">
          <CollectionSymbol symbol={collection.symbol} />
        </span>
      </div>
      <div className="collectionCopy">
        <small>{collection.productCount} منتجات</small>
        <h3>{collection.name}</h3>
        <p>{collection.description}</p>
        <span className="collectionExplore">
          اكتشفي المجموعة <ArrowLeft size={21} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
