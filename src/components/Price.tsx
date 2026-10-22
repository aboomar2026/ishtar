import { formatMoney } from '@/lib/numbers';
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
  const formattedPrice = formatMoney(price, currency);
  const formattedOldPrice = oldPrice && oldPrice > price ? formatMoney(oldPrice, currency) : undefined;

  return (
    <div className={`price ${size === 'large' ? 'priceLarge' : ''}`}>
      <bdi className="priceCurrent">{formattedPrice}</bdi>
      {formattedOldPrice ? <del><bdi>{formattedOldPrice}</bdi></del> : null}
    </div>
  );
}
