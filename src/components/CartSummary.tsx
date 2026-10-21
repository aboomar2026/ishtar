import Link from 'next/link';

export function CartSummary({
  subtotal,
  deliveryFee,
  total,
  checkout = true
}: {
  subtotal: number;
  deliveryFee: number;
  total: number;
  checkout?: boolean;
}) {
  const hasConfirmedDeliveryFee = deliveryFee > 0;

  return (
    <aside className="cartSummary">
      <h2>ملخص الطلب</h2>
      <div className="summaryLine"><span>المجموع الفرعي</span><strong>₪{subtotal}</strong></div>
      <div className="summaryLine">
        <span>التوصيل</span>
        <strong className={hasConfirmedDeliveryFee ? undefined : 'deliveryPendingText'}>
          {hasConfirmedDeliveryFee ? `₪${deliveryFee}` : 'يحدد عند التأكيد'}
        </strong>
      </div>
      <div className="summaryDivider" />
      <div className="summaryTotal"><span>{hasConfirmedDeliveryFee ? 'الإجمالي' : 'الإجمالي قبل التوصيل'}</span><strong>₪{total}</strong></div>
      <p>الدفع المتاح حالياً: كاش عند الاستلام. سنتواصل معك لتأكيد سعر التوصيل حسب المنطقة.</p>
      {checkout ? <Link href="/checkout" className="primaryButton fullWidth">إتمام الطلب</Link> : null}
    </aside>
  );
}
