'use client';

import { useMemo, useState } from 'react';
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

export function ProductDetailClient({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const activeVariants = useMemo(() => product.variants.filter((variant) => variant.isActive), [product.variants]);
  const availableVariants = useMemo(() => activeVariants.filter((variant) => variant.quantity > 0), [activeVariants]);
  const firstAvailableVariant = availableVariants[0] ?? activeVariants[0];
  const hasColorOptions = activeVariants.some((variant) => variant.colorName || variant.colorValue);
  const hasSizeOptions = activeVariants.some((variant) => variant.size);

  const [selectedColor, setSelectedColor] = useState(firstAvailableVariant ? colorKey(firstAvailableVariant) : undefined);
  const [selectedSize, setSelectedSize] = useState(firstAvailableVariant?.size);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

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
    }) ?? firstAvailableVariant;
  }, [activeVariants, firstAvailableVariant, hasColorOptions, hasSizeOptions, selectedColor, selectedSize]);

  function handleColorChange(value: string) {
    setSelectedColor(value);
    const scopedVariants = activeVariants.filter((variant) => colorKey(variant) === value);
    const nextSize = scopedVariants.find((variant) => variant.quantity > 0)?.size ?? scopedVariants[0]?.size;
    setSelectedSize(nextSize ?? 'default');
    setQuantity(1);
  }

  function handleSizeChange(value: string) {
    setSelectedSize(value);
    setQuantity(1);
  }

  const isOutOfStock = product.isOutOfStock || !selectedVariant || selectedVariant.quantity <= 0;
  const showLowStock = selectedVariant && selectedVariant.quantity > 0 && selectedVariant.quantity <= selectedVariant.lowStockThreshold;
  const displayPrice = selectedVariant?.price ?? product.price;
  const displayCompareAtPrice = selectedVariant?.compareAtPrice ?? product.compareAtPrice;

  function onAddToCart() {
    if (isOutOfStock || !selectedVariant) return;
    addToCart({
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
      sku: selectedVariant.sku
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <div className="productDetailLayout">
      <ProductMediaGallery images={product.images} title={product.name} />
      <section className="productDetailPanel">
        <div className="productDetailHeader">
          <span className="eyebrow">{brand.copy.productEyebrow}</span>
          <h1>{product.name}</h1>
          <p>{product.subtitle}</p>
          <div className="detailRating">
            {product.rating ? `★ ${product.rating} · ` : ''}{product.soldCount}+ طلب
          </div>
          {product.isOutOfStock ? <div className="stockNotice">هذا المنتج غير متوفر حالياً. يمكنك مشاهدة التفاصيل والرجوع لاحقاً.</div> : null}
          {showLowStock ? <div className="stockNotice lowStockNotice">المتبقي {selectedVariant.quantity} فقط — باقي كمية محدودة</div> : null}
          <Price price={displayPrice} oldPrice={displayCompareAtPrice} currency={product.currency} size="large" />
        </div>

        <div className="detailControls">
          <VariantSelector label="اللون" options={colorOptions} value={selectedColor} onChange={handleColorChange} />
          <VariantSelector label="المقاس / الخيار" options={sizeOptions} value={selectedSize} onChange={handleSizeChange} />
          {selectedVariant ? <div className="skuLine">SKU: {selectedVariant.sku}</div> : null}
          <div className="quantityRow">
            <span>الكمية</span>
            <QuantitySelector value={quantity} onChange={setQuantity} max={selectedVariant?.quantity} />
          </div>
        </div>

        <button type="button" className="stickyAddButton" onClick={onAddToCart} disabled={isOutOfStock}>
          {isOutOfStock ? 'نفدت الكمية' : added ? 'تمت الإضافة للسلة ✓' : 'أضيفي للسلة'}
        </button>

        <div className="productStoryCard">
          <h2>تفاصيل المنتج</h2>
          <p>{product.description}</p>
          {product.details.length ? (
            <ul>
              {product.details.map((detail) => <li key={detail}>{detail}</li>)}
            </ul>
          ) : null}
          {product.careInstructions ? <p className="careInstructions">العناية: {product.careInstructions}</p> : null}
        </div>
      </section>
    </div>
  );
}
