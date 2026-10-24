import { IconCheck } from '@/components/Icons';
import { BrandLogo, BrandMark } from '@/components/BrandLogo';
import type { AdminOrderDetail } from '@/features/admin/orders/order-admin.queries';
import { formatDateTime } from '@/features/admin/shared/admin-format';
import { brand } from '@/lib/brand';

export function PrintablePackingSlip({
  order,
  qrDataUrl
}: {
  order: AdminOrderDetail;
  qrDataUrl: string;
}) {
  const totalUnits = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="printSheet" dir="rtl">
      <header className="printHeader">
        <div className="printBrand">
          {brand.key === 'ishtar' ? (
            <BrandLogo variant="print" />
          ) : (
            <span className="printBrandMark"><BrandMark size={34} /></span>
          )}
          <div>
            <strong>{brand.name}</strong>
            <span>{brand.copy.packingSlipSubtitle}</span>
          </div>
        </div>
        <div className="printDocMeta">
          <h1>ورقة تجهيز الطلب</h1>
          <div>رقم الطلب: <strong>{order.orderNumber}</strong></div>
          <div>التاريخ: {formatDateTime(order.createdAt)}</div>
          <div>عدد القطع: <strong>{totalUnits}</strong></div>
        </div>
      </header>

      <section className="printParties">
        <div>
          <h2>التوصيل إلى</h2>
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
            <th className="checkCol" aria-label="تأكيد التجهيز"><IconCheck size={18} /></th>
            <th>المنتج</th>
            <th>SKU</th>
            <th>اللون</th>
            <th>المقاس</th>
            <th>الكمية</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td className="checkCol"><span className="packCheckbox" /></td>
              <td>{item.productName}</td>
              <td>{item.sku ?? '—'}</td>
              <td>{item.colorName ?? '—'}</td>
              <td>{item.size ?? '—'}</td>
              <td><strong>{item.quantity}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>

      {order.packagingNote && (
        <div className="printNoteBox">
          <strong>ملاحظات التغليف:</strong> {order.packagingNote}
        </div>
      )}

      <footer className="printFooter">
        <p>الدفع عند الاستلام — لا تُعرض الأسعار على ورقة التجهيز.</p>
      </footer>
    </div>
  );
}
