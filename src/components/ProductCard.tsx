'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Product } from '@/lib/types';
import { FALLBACK_PRODUCT_IMAGE } from '@/features/catalog/catalog.utils';
import { getCloudinaryTransformedUrl, PRODUCT_CARD_IMAGE } from '@/lib/cloudinary-image';
import { useCart } from './CartProvider';
import { Price } from './Price';
import { SaleBadge } from './SaleBadge';
import { IconCheck, IconPlus } from './Icons';

export function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);
  const availableVariants = product.variants.filter((variant) => variant.isActive && variant.quantity > 0);
  const canQuickAdd = availableVariants.length === 1;
  const quickVariant = availableVariants[0];

  function handleQuickAdd() {
    if (product.isOutOfStock) return;

    if (!canQuickAdd || !quickVariant) {
      router.push(`/product/${product.slug}`);
      return;
    }

    addToCart({
      productId: product.id,
      variantId: quickVariant.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      selectedColorName: quickVariant.colorName,
      selectedColorValue: quickVariant.colorValue,
      selectedSize: quickVariant.size,
      quantity: 1,
      unitPrice: quickVariant.price,
      compareAtPrice: quickVariant.compareAtPrice,
      sku: quickVariant.sku
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1300);
  }

  return (
    <article className={`productCard ${product.isOutOfStock ? 'isOutOfStock' : ''}`}>
      <Link href={`/product/${product.slug}`} className="productImageWrap" aria-label={product.name}>
        <img
          src={getCloudinaryTransformedUrl(product.image, PRODUCT_CARD_IMAGE)}
          alt={product.name}
          className="productImage"
          loading="lazy"
          onError={(event) => {
            if (event.currentTarget.src.endsWith(FALLBACK_PRODUCT_IMAGE)) return;
            event.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
          }}
        />
        <SaleBadge oldPrice={product.compareAtPrice} price={product.price} discountPercent={product.discountPercent} />
        {product.isNewArrival ? <span className="newBadge">جديد</span> : null}
        {product.isBestSeller ? <span className="sellerBadge">الأكثر مبيعاً</span> : null}
        {product.isOutOfStock ? <span className="stockOverlay"><span>غير متوفر حالياً</span></span> : null}
      </Link>
      <div className="productCardBody">
        <div className="productInfoBlock">
          <Link href={`/product/${product.slug}`} className="productTitle">{product.name}</Link>
          <p className="productSubtitle">{product.subtitle}</p>
          <div className="productMeta">
            {product.rating ? <span>★ {product.rating}</span> : null}
            <span>{product.soldCount}+ طلب</span>
          </div>
        </div>
        <div className="productBuyRow">
          <Price price={product.price} oldPrice={product.compareAtPrice} currency={product.currency} />
          <button
            type="button"
            className={`quickAddButton${added ? ' isAdded' : ''}${!canQuickAdd && !product.isOutOfStock ? ' isChoose' : ''}`}
            onClick={handleQuickAdd}
            disabled={product.isOutOfStock}
            aria-label={product.isOutOfStock ? 'المنتج غير متوفر' : canQuickAdd ? `إضافة ${product.name} للسلة` : `اختيار تفاصيل ${product.name}`}
          >
            {product.isOutOfStock ? (
              <span>نفد</span>
            ) : added ? (
              <>
                <IconCheck size={16} />
                <span>تمت</span>
              </>
            ) : canQuickAdd ? (
              <>
                <IconPlus size={16} />
                <span>أضف</span>
              </>
            ) : (
              <span>اختيار</span>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
