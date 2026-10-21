export function SaleBadge({ oldPrice, price, discountPercent }: { oldPrice?: number; price: number; discountPercent?: number }) {
  const discount = discountPercent ?? (oldPrice && oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : undefined);
  if (!discount) return null;
  return <span className="saleBadge">-{discount}%</span>;
}
