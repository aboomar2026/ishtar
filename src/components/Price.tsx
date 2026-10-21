export function Price({
  price,
  oldPrice,
  currency = '₪',
  size = 'normal'
}: {
  price: number;
  oldPrice?: number;
  currency?: string;
  size?: 'normal' | 'large';
}) {
  const formattedPrice = Math.round(price) === price ? price.toString() : price.toFixed(2);
  const formattedOldPrice = oldPrice ? (Math.round(oldPrice) === oldPrice ? oldPrice.toString() : oldPrice.toFixed(2)) : undefined;

  return (
    <div className={`price ${size === 'large' ? 'priceLarge' : ''}`}>
      <span>{currency}{formattedPrice}</span>
      {formattedOldPrice ? <del>{currency}{formattedOldPrice}</del> : null}
    </div>
  );
}
