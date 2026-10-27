'use client';
import { CatalogImage } from '@/components/CatalogImage';
import { PRODUCT_THUMB_IMAGE } from '@/lib/cloudinary-image';

import { formatMoney } from '@/lib/numbers';
import Link from '@/components/NavigationLink';
import { useCart } from './CartProvider';
import { CartSummary } from './CartSummary';
import { EmptyState } from './EmptyState';
import { Price } from './Price';
import { QuantitySelector } from './QuantitySelector';

export function CartPageClient() {
  const { lines, subtotal, deliveryFee, total, updateQuantity, removeLine, isCartLoaded, refreshing, cartError, refreshCart, canUndo, undoRemove } = useCart();

  if (!isCartLoaded) return <p role="status">جاري استعادة السلة...</p>;
  const undo = canUndo ? <div role="status" className="cartFeedback">تم حذف المنتج. <button type="button" onClick={undoRemove}>تراجع</button></div> : null;
  if (!lines.length) {
    return <>{undo}<EmptyState title="سلتك فارغة" description="ابدئي من المنتجات الجديدة أو العروض المختارة." actionHref="/" actionLabel="العودة للتسوق" /></>;
  }

  return (
    <> {undo}
      {cartError && <div role="alert">{cartError} <button type="button" onClick={() => void refreshCart()}>إعادة المحاولة</button></div>}
      <p className="fieldHint" role="status">{refreshing ? "جاري تحديث الأسعار والمخزون..." : "الكميات والأسعار حسب آخر تحديث؛ نتحقق منها مجددًا عند التأكيد."}</p>
    <div className="cartLayout">
      <section className="cartItems">
        {lines.map((line, index) => (
          <article className="cartItem" key={`${line.variantId}-${index}`}>
            <Link href={`/product/${line.slug}`} className="cartItemImage"><CatalogImage src={line.image} alt={line.name}  transform={{ ...PRODUCT_THUMB_IMAGE, crop: 'fit' }} sizes="100px" loading="lazy" /></Link>
            <div className="cartItemInfo">
              <Link href={`/product/${line.slug}`} className="cartItemTitle">{line.name}</Link>
              <p className="cartVariantLine">
                {line.selectedColorName ? `اللون: ${line.selectedColorName}` : ''}
                {line.selectedColorName && line.selectedSize ? ' · ' : ''}
                {line.selectedSize ? `الخيار: ${line.selectedSize}` : ''}
                {line.sku ? ` · SKU: ${line.sku}` : ''}
              </p>
              <span className="fieldHint">سعر القطعة</span><Price price={line.unitPrice} oldPrice={line.compareAtPrice} />
              <strong>مجموع المنتج: <bdi>{formatMoney(line.unitPrice * line.quantity)}</bdi></strong>
              {line.maxQuantity === 0 && <p role="alert">غير متوفر حاليًا — احذفيه لإتمام الطلب.</p>}
              <div className="cartItemActions">
                <QuantitySelector value={line.quantity} max={line.maxQuantity} onChange={(value) => updateQuantity(index, value)} />
                <button type="button" onClick={() => removeLine(index)}>حذف</button>
              </div>
            </div>
          </article>
        ))}
      </section>
      <CartSummary subtotal={subtotal} deliveryFee={deliveryFee} total={total} checkout={!refreshing && !cartError && lines.every((line) => line.maxQuantity !== undefined && line.maxQuantity > 0)} />
    </div></>
  );
}
