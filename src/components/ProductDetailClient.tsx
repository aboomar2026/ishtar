'use client';
import { ShareProductButton } from './ShareProductButton';
import { WishlistButton } from './WishlistButton';
import { IconStar, IconCheck } from './Icons';
import { showCatalogMetrics } from '@/lib/catalog-display';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Product } from '@/lib/types';
import type { CatalogProductVariant } from '@/features/catalog/catalog.types';
import { useCart } from './CartProvider';
import { brand } from '@/lib/brand';
import { Price } from './Price';
import { ProductMediaGallery } from './ProductMediaGallery';
import { QuantitySelector } from './QuantitySelector';
import { VariantSelector } from './VariantSelector';

function colorKey(variant: CatalogProductVariant) {
  return variant.colorValue || variant.colorName || 'default';
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function ProductDetailClient({ product, shareOrigin, compact = false }: { product: Product; shareOrigin?: string; compact?: boolean }) {
  const { addToCart, isCartLoaded } = useCart();
  const addedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => { if (addedTimer.current) clearTimeout(addedTimer.current); }, []);
  const activeVariants = useMemo(() => product.variants.filter((variant) => variant.isActive), [product.variants]);
  const availableVariants = useMemo(() => activeVariants.filter((variant) => variant.quantity > 0), [activeVariants]);
  const firstAvailableVariant = availableVariants[0] ?? activeVariants[0];
  const hasColorOptions = activeVariants.some((variant) => variant.colorName || variant.colorValue);
  const hasSizeOptions = activeVariants.some((variant) => variant.size);

  const [selectedColor, setSelectedColor] = useState(firstAvailableVariant ? colorKey(firstAvailableVariant) : undefined);
  const [selectedSize, setSelectedSize] = useState(firstAvailableVariant?.size ?? 'default');
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [addFailed, setAddFailed] = useState(false);

  const colorOptions = useMemo(() => {
    if (!hasColorOptions) return [];
    return uniqueBy(activeVariants, colorKey).map((variant) => {
      const key = colorKey(variant);
      const colorVariants = activeVariants.filter((item) => colorKey(item) === key);
      return {
        label: variant.colorName ?? 'الخيار',
        value: key,
        colorValue: variant.colorValue,
        disabled: colorVariants.every((item) => item.quantity <= 0)
      };
    });
  }, [activeVariants, hasColorOptions]);

  const sizeVariants = useMemo(() => {
    if (!hasSizeOptions) return [];
    const scoped = selectedColor && hasColorOptions
      ? activeVariants.filter((variant) => colorKey(variant) === selectedColor)
      : activeVariants;
    return uniqueBy(scoped, (variant) => variant.size ?? 'default');
  }, [activeVariants, hasColorOptions, hasSizeOptions, selectedColor]);

  const sizeOptions = useMemo(() => sizeVariants.map((variant) => ({
    label: variant.size ?? 'مقاس موحد',
    value: variant.size ?? 'default',
    disabled: variant.quantity <= 0
  })), [sizeVariants]);

  const selectedVariant = useMemo(() => {
    if (!activeVariants.length) return undefined;
    return activeVariants.find((variant) => {
      const colorMatches = !hasColorOptions || colorKey(variant) === selectedColor;
      const sizeMatches = !hasSizeOptions || (variant.size ?? 'default') === selectedSize;
      return colorMatches && sizeMatches;
    });
  }, [activeVariants, hasColorOptions, hasSizeOptions, selectedColor, selectedSize]);

  function handleColorChange(value: string) {
    setAdded(false); setAddFailed(false);
    setSelectedColor(value);
    const scopedVariants = activeVariants.filter((variant) => colorKey(variant) === value);
    const nextSize = scopedVariants.find((variant) => variant.quantity > 0)?.size ?? scopedVariants[0]?.size;
    setSelectedSize(nextSize ?? 'default');
    setQuantity(1);
  }

  function handleSizeChange(value: string) {
    setAdded(false); setAddFailed(false);
    setSelectedSize(value);
    setQuantity(1);
  }

  const isOutOfStock = product.isOutOfStock || !selectedVariant || selectedVariant.quantity <= 0;
  const showLowStock = selectedVariant && selectedVariant.quantity > 0 && selectedVariant.quantity <= selectedVariant.lowStockThreshold;
  const displayPrice = selectedVariant?.price ?? product.price;
  const displayCompareAtPrice = selectedVariant?.compareAtPrice ?? product.compareAtPrice;

  function onAddToCart() {
    if (!isCartLoaded || isOutOfStock || !selectedVariant) return;
    const accepted = addToCart({
      productId: product.id,
      variantId: selectedVariant.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      selectedColorName: selectedVariant.colorName,
      selectedColorValue: selectedVariant.colorValue,
      selectedSize: selectedVariant.size,
      quantity,
      unitPrice: selectedVariant.price,
      compareAtPrice: selectedVariant.compareAtPrice,
      maxQuantity: selectedVariant.quantity,
      sku: selectedVariant.sku
    });
    setAddFailed(!accepted);
    if (!accepted) return;
    setAdded(true);
    if (addedTimer.current) clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAdded(false), 1600);
  }

  return (
    <div className="productDetailLayout">
      <ProductMediaGallery images={product.images} title={product.name} allowZoom={!compact} />
      <section className="productDetailPanel">
        <div className="productDetailHeader">
          <span className="eyebrow">{brand.copy.productEyebrow}</span>
          {compact ? <h2>{product.name}</h2> : <h1>{product.name}</h1>}
          {!compact && <div className="productDiscoveryActions">
            <WishlistButton id={product.id} name={product.name} label />
            <ShareProductButton name={product.name} path={`/product/${encodeURIComponent(product.slug)}`} canonicalOrigin={shareOrigin} />
          </div>}
          <p>{product.subtitle}</p>
          {showCatalogMetrics && <div className="detailRating">
            {product.rating ? <><IconStar size={16} weight="fill" /> {product.rating} · </> : null}{product.soldCount}+ طلب
          </div>}
          {product.isOutOfStock ? <div className="stockNotice">هذا المنتج غير متوفر حالياً. يمكنك مشاهدة التفاصيل والرجوع لاحقاً.</div> : null}
          {showLowStock ? <div className="stockNotice lowStockNotice">المتبقي {selectedVariant.quantity} فقط — باقي كمية محدودة</div> : null}
          <Price price={displayPrice} oldPrice={displayCompareAtPrice} currency={product.currency} size="large" />
        </div>

        <div className="detailControls">
          {hasColorOptions && <p className="fieldHint">الصور عامة للمنتج؛ اختاري اللون المطلوب من الخيارات أدناه.</p>}
          <VariantSelector label="اللون" options={colorOptions} value={selectedColor} onChange={handleColorChange} />
          <VariantSelector label="المقاس / الخيار" options={sizeOptions} value={selectedSize} onChange={handleSizeChange} />
          <div className="quantityRow">
            <span>الكمية</span>
            <QuantitySelector value={quantity} onChange={setQuantity} max={selectedVariant?.quantity} />
          </div>
        </div>

        <button type="button" className="stickyAddButton" onClick={onAddToCart} disabled={!isCartLoaded || isOutOfStock}>
          {isOutOfStock ? 'نفدت الكمية' : added ? <><IconCheck size={20} /> تمت الإضافة للسلة</> : 'أضيفي للسلة'}
        </button>

        <p role="alert">{addFailed ? "وصلتِ للكمية المتاحة في السلة." : ""}</p>
        <span className="srOnly" role="status">{added ? "تمت الإضافة للسلة" : ""}</span>
        {!compact && <div className="productStoryCard">
          <h2>تفاصيل المنتج</h2>
          <p>{product.description}</p>
          {product.details.length ? (
            <ul>
              {product.details.map((detail) => <li key={detail}>{detail}</li>)}
            </ul>
          ) : null}
          {product.careInstructions ? <p className="careInstructions">العناية: {product.careInstructions}</p> : null}
          {selectedVariant ? <p className="productSku">رمز المنتج: <bdi>{selectedVariant.sku}</bdi></p> : null}
        </div>}
      </section>
    </div>
  );
}
