import { BrandLogo, BrandMark } from '@/components/BrandLogo';
import type { AdminOrderDetail } from '@/features/admin/orders/order-admin.queries';
import { STATUS_LABEL_AR } from '@/features/admin/orders/order-admin.validation';
import { formatCurrency, formatDateTime } from '@/features/admin/shared/admin-format';
import { brand } from '@/lib/brand';

export function PrintableInvoice({
  order,
  invoiceNumber,
  qrDataUrl
}: {
  order: AdminOrderDetail;
  invoiceNumber: string;
  qrDataUrl: string;
}) {
  return (
    <div className="printSheet" dir="rtl">
      {order.deliveryFeeStatus === 'PENDING' && <div className="printDraftNotice">مسودة — رسوم التوصيل غير مؤكدة. هذه ليست فاتورة نهائية.</div>}
      <header className="printHeader">
        <div className="printBrand">
          {brand.key === 'ishtar' ? (
            <BrandLogo variant="print" />
          ) : (
            <span className="printBrandMark"><BrandMark size={34} /></span>
          )}
          <div>
            <strong>{brand.name}</strong>
            <span>{brand.copy.invoiceSubtitle}</span>
          </div>
        </div>
        <div className="printDocMeta">
          <h1>فاتورة طلب · COD Invoice</h1>
          <div>رقم الفاتورة: <strong>{invoiceNumber}</strong></div>
          <div>رقم الطلب: <strong>{order.orderNumber}</strong></div>
          <div>التاريخ: {formatDateTime(order.createdAt)}</div>
          <div>الحالة: {STATUS_LABEL_AR[order.status]}</div>
        </div>
      </header>

      <section className="printParties">
        <div>
          <h2>بيانات العميل</h2>
          <div>{order.customerName}</div>
          <div>{order.customerPhone}</div>
          {order.customerWhatsappPhone && <div>واتساب: {order.customerWhatsappPhone}</div>}
          <div>{order.city} · {order.area}</div>
          <div>{order.address}</div>
        </div>
        <div className="printQr">
          <img src={qrDataUrl} alt="رمز تتبع الطلب" width={120} height={120} />
          <span>تتبع الطلب</span>
        </div>
      </section>

      <table className="printTable">
        <thead>
          <tr>
            <th>المنتج</th>
            <th>SKU</th>
            <th>الخيار</th>
            <th>الكمية</th>
            <th>السعر</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td>{item.productName}</td>
              <td>{item.sku ?? '—'}</td>
              <td>{[item.colorName, item.size].filter(Boolean).join(' · ') || '—'}</td>
              <td>{item.quantity}</td>
              <td>{formatCurrency(item.unitPrice)}</td>
              <td>{formatCurrency(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="printTotals">
        <div><span>المجموع الفرعي</span><strong>{formatCurrency(order.subtotal)}</strong></div>
        <div><span>التوصيل</span><strong>{order.deliveryFeeStatus === 'PENDING' ? 'بانتظار التحديد' : order.deliveryFeeStatus === 'FREE' ? 'مجاني' : formatCurrency(order.deliveryFee)}</strong></div>
        {order.discount > 0 && <div><span>الخصم</span><strong>−{formatCurrency(order.discount)}</strong></div>}
        <div className="grand"><span>{order.deliveryFeeStatus === 'PENDING' ? 'الإجمالي قبل التوصيل' : 'الإجمالي'}</span><strong>{formatCurrency(order.total)}</strong></div>
        <div className="printPayment">طريقة الدفع: الدفع عند الاستلام</div>
      </div>

      <footer className="printFooter">
        <p>الدفع عند الاستلام · يرجى التأكد من محتويات الطلب عند الاستلام.</p>
        <p>{brand.copy.invoiceThanks}</p>
      </footer>
    </div>
  );
}
