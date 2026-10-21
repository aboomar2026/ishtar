import Link from 'next/link';
import { getOrderSuccessSummaryByNumber } from '@/features/orders/order.queries';
import { ORDER_STATUS_LABEL_AR } from '@/features/orders/order-status.labels';

export const dynamic = 'force-dynamic';

function formatOrderDate(value: Date) {
  return new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Hebron' }).format(value);
}

export default async function OrderSuccessPage({ searchParams }: { searchParams?: Promise<{ order?: string }> }) {
  const resolved = searchParams ? await searchParams : {};
  const orderNumber = resolved.order ?? '';
  const order = orderNumber ? await getOrderSuccessSummaryByNumber(orderNumber) : null;

  if (!order) {
    return (
      <div className="successPage">
        <div className="successCard">
          <div className="successIcon">!</div>
          <span className="eyebrow">Order</span>
          <h1>لم نجد هذا الطلب</h1>
          <p>تأكدي من رقم الطلب أو تابعي طلبك من صفحة التتبع.</p>
          <div className="heroActions center">
            <Link href="/" className="primaryButton">العودة للرئيسية</Link>
            <Link href="/track-order" className="ghostButton">تتبع الطلب</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="plainPage orderSuccessPage">
      <div className="successCard orderSuccessCard">
        <div className="successIcon">✓</div>
        <span className="eyebrow">Order received</span>
        <h1>تم استلام طلبك</h1>
        <p>
          وصلنا طلبك بنجاح. سنراجع التفاصيل ونتواصل معك لتأكيد الطلب وسعر التوصيل حسب المنطقة قبل التجهيز.
          طريقة الدفع: <strong>كاش عند الاستلام</strong>.
        </p>
        <div className="orderBadgeRow">
          <span className="orderNumberPill">رقم الطلب: <strong>{order.orderNumber}</strong></span>
          <span className={`orderStatusBadge status-${order.status}`}>{ORDER_STATUS_LABEL_AR[order.status]}</span>
        </div>
        <div className="orderSuccessSummaryGrid" aria-label="ملخص الطلب">
          <div>
            <span>تاريخ الطلب</span>
            <strong>{formatOrderDate(order.createdAt)}</strong>
          </div>
          <div>
            <span>{order.deliveryFeeStatus === 'PENDING' ? 'الإجمالي قبل التوصيل' : 'الإجمالي'}</span>
            <strong>₪{order.total}</strong>
          </div>
          <div>
            <span>التوصيل</span>
            <strong>{order.deliveryFeeStatus === 'PENDING' ? 'يحدد عند التأكيد' : order.deliveryFeeStatus === 'FREE' ? 'مجاني' : 'تم تحديده'}</strong>
          </div>
        </div>
        <p className="localOrderHint">
          لحماية الخصوصية لا نعرض تفاصيل العنوان والمنتجات من رابط رقم الطلب فقط. يمكنك متابعة التفاصيل من صفحة التتبع باستخدام رقم الطلب والجوال، أو من الطلبات المحفوظة على هذا الجهاز.
        </p>
      </div>

      <div className="formCard orderSuccessNextSteps">
        <span className="eyebrow">Next steps</span>
        <h2>ماذا يحدث الآن؟</h2>
        <div className="successStepsGrid">
          <div>
            <strong>1</strong>
            <span>تأكيد الطلب</span>
            <p>سنتواصل معك للتأكد من البيانات وتوفر المنتجات.</p>
          </div>
          <div>
            <strong>2</strong>
            <span>تحديد التوصيل</span>
            <p>سعر التوصيل يحدد حسب المنطقة وظروف التوصيل، وليس تلقائياً.</p>
          </div>
          <div>
            <strong>3</strong>
            <span>التجهيز والتسليم</span>
            <p>بعد التأكيد يتم تجهيز الطلب والدفع يكون عند الاستلام.</p>
          </div>
        </div>
      </div>

      <div className="heroActions center">
        <Link href={`/track-order?order=${encodeURIComponent(order.orderNumber)}`} className="primaryButton">تتبع هذا الطلب</Link>
        <Link href="/category/new-in" className="ghostButton">تسوقي المزيد</Link>
        <Link href="/" className="ghostButton">العودة للرئيسية</Link>
      </div>
    </div>
  );
}
