'use client';

import Link from 'next/link';
import { useCart } from './CartProvider';
import { CartSummary } from './CartSummary';
import { EmptyState } from './EmptyState';
import { Price } from './Price';
import { QuantitySelector } from './QuantitySelector';

export function CartPageClient() {
  const { lines, subtotal, deliveryFee, total, updateQuantity, removeLine } = useCart();

  if (!lines.length) {
    return <EmptyState title="سلتك فارغة" description="ابدئي من المنتجات الجديدة أو العروض المختارة." actionHref="/" actionLabel="العودة للتسوق" />;
  }

  return (
    <div className="cartLayout">
      <section className="cartItems">
        {lines.map((line, index) => (
          <article className="cartItem" key={`${line.variantId}-${index}`}>
            <Link href={`/product/${line.slug}`} className="cartItemImage"><img src={line.image} alt={line.name} /></Link>
            <div className="cartItemInfo">
              <Link href={`/product/${line.slug}`} className="cartItemTitle">{line.name}</Link>
              <p className="cartVariantLine">
                {line.selectedColorName ? `اللون: ${line.selectedColorName}` : ''}
                {line.selectedColorName && line.selectedSize ? ' · ' : ''}
                {line.selectedSize ? `الخيار: ${line.selectedSize}` : ''}
                {line.sku ? ` · SKU: ${line.sku}` : ''}
              </p>
              <Price price={line.unitPrice} oldPrice={line.compareAtPrice} />
              <div className="cartItemActions">
                <QuantitySelector value={line.quantity} onChange={(value) => updateQuantity(index, value)} />
                <button type="button" onClick={() => removeLine(index)}>حذف</button>
              </div>
            </div>
          </article>
        ))}
      </section>
      <CartSummary subtotal={subtotal} deliveryFee={deliveryFee} total={total} />
    </div>
  );
}
