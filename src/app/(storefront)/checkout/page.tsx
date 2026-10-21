import { CheckoutForm } from '@/components/CheckoutForm';

export default function CheckoutPage() {
  return (
    <div className="plainPage">
      <div className="pageTitleBlock">
        <span className="eyebrow">Checkout</span>
        <h1>إتمام الطلب</h1>
        <p>الدفع المتاح حالياً هو كاش عند الاستلام، وسنتواصل معك لتأكيد الطلب قبل التجهيز.</p>
      </div>
      <CheckoutForm />
    </div>
  );
}
