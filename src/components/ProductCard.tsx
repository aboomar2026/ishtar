'use client';
import { WishlistButton } from './WishlistButton';
import { IconStar } from './Icons';
import { showCatalogMetrics } from '@/lib/catalog-display';
import { brand } from '@/lib/brand';

import Link from 'next/link';
import { useQuickView } from './QuickViewProvider';
import { useState } from 'react';
import type { Product } from '@/lib/types';
import { FALLBACK_PRODUCT_IMAGE } from '@/features/catalog/catalog.utils';
import { getCloudinaryTransformedUrl, PRODUCT_CARD_IMAGE } from '@/lib/cloudinary-image';
import { useCart } from './CartProvider';
import { Price } from './Price';
import { SaleBadge } from './SaleBadge';
import { IconCheck, IconPlus } from './Icons';

export function ProductCard({ product }: { product: Product }) {
  const { openQuickView } = useQuickView();
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);
  const [addFailed, setAddFailed] = useState(false);
  const availableVariants = product.variants.filter((variant) => variant.isActive && variant.quantity > 0);
  const canQuickAdd = availableVariants.length === 1;
  const quickVariant = availableVariants[0];

  function handleQuickAdd() {
    if (product.isOutOfStock) return;

    if (!canQuickAdd || !quickVariant) {
      openQuickView(product);
      return;
    }

    const accepted = addToCart({
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
      maxQuantity: quickVariant.quantity,
      sku: quickVariant.sku
    });
    setAddFailed(!accepted);
    if (!accepted) return;
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1300);
  }

  return (
    <article className={`productCard ${product.isOutOfStock ? 'isOutOfStock' : ''}`}>
      <Link href={`/product/${product.slug}`} className="productImageWrap" aria-label={product.name}>
        <img
          src={getCloudinaryTransformedUrl(product.image, brand.key === 'ishtar' ? { ...PRODUCT_CARD_IMAGE, crop: 'fit' } : PRODUCT_CARD_IMAGE)}
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
        {showCatalogMetrics && product.isBestSeller ? <span className="sellerBadge">الأكثر مبيعاً</span> : null}
        {product.isOutOfStock ? <span className="stockOverlay"><span>غير متوفر حالياً</span></span> : null}
      </Link>
      <div className="productCardBody">
        {addFailed && <p role="alert">وصلتِ للكمية المتاحة في السلة.</p>}
        <div className="productInfoBlock">
          <div className="productTitleRow"><Link href={`/product/${product.slug}`} className="productTitle">{product.name}</Link><WishlistButton id={product.id} name={product.name} /></div>
          <p className="productSubtitle">{product.subtitle}</p>
          {showCatalogMetrics && <div className="productMeta">
            {product.rating ? <span className="iconLabel"><IconStar size={15} weight="fill" />{product.rating}</span> : null}
            <span>{product.soldCount}+ طلب</span>
          </div>}
        </div>
        <button type="button" className="quickViewButton" aria-haspopup="dialog" aria-label={`عرض سريع: ${product.name}`} onClick={() => openQuickView(product)}>عرض سريع</button>
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
                <span role="status">تمت</span>
              </>
            ) : canQuickAdd ? (
              <>
                <IconPlus size={16} />
              <span>أضيفي</span>
              </>
            ) : (
              <span>الخيارات</span>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
