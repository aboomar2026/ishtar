import { CatalogImage } from '@/components/CatalogImage';
import { PRODUCT_THUMB_IMAGE } from '@/lib/cloudinary-image';
import { requireOrderAdmin } from '@/features/admin/auth/admin-auth';
import { IconArrowRight, IconArrowLeft } from '@/components/Icons';
import Link from '@/components/NavigationLink';
import { notFound } from 'next/navigation';
import { getAdminOrderById } from '@/features/admin/orders/order-admin.queries';
import { STATUS_LABEL_AR } from '@/features/admin/orders/order-admin.validation';
import { formatCurrency, formatDateTime } from '@/features/admin/shared/admin-format';
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge';
import { OrderStatusActions } from '@/components/admin/OrderStatusActions';
import { OrderOperations } from '@/components/admin/OrderOperations';
import { OrderNotesForm } from '@/components/admin/OrderNotesForm';
import { OrderDeliveryFeeForm } from '@/components/admin/OrderDeliveryFeeForm';
import { OrderWorkflowChecklist } from '@/components/admin/OrderWorkflowChecklist';

export const dynamic = 'force-dynamic';

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOrderAdmin();
  const { id } = await params;
  const order = await getAdminOrderById(id);
  if (!order) notFound();

  const summaryText = [
    `الطلب ${order.orderNumber} (${STATUS_LABEL_AR[order.status]})`,
    `${order.customerName} · ${order.customerPhone}${order.customerWhatsappPhone ? ` · واتساب: ${order.customerWhatsappPhone}` : ''}`,
    `${order.city} · ${order.area} · ${order.address}`,
    ...order.items.map((item) => `- ${item.productName} ×${item.quantity} = ${formatCurrency(item.total)}`),
    `التوصيل: ${order.deliveryFeeStatus === 'PENDING' ? 'بانتظار التحديد' : order.deliveryFeeStatus === 'FREE' ? 'مجاني' : formatCurrency(order.deliveryFee)}`,
    `الإجمالي (الدفع عند الاستلام): ${formatCurrency(order.total)}`
  ].join('\n');

  return (
    <div>
      <div className="adminPageHeader">
        <div>
          <h1>{order.orderNumber}</h1>
          <p className="adminMuted">تاريخ الطلب {formatDateTime(order.createdAt)} · <OrderStatusBadge status={order.status} /></p>
        </div>
        <Link href="/admin/orders" className="adminBtn adminBtnGhost"><IconArrowRight size={20} /> رجوع</Link>
      </div>

      <div className="adminCard">
        <div className="adminCardHeader">
          <div>
            <h2>خط سير الطلب</h2>
            <p>اتبع الخطوات بالترتيب حتى لا تُطبع فاتورة أو يشحن طلب قبل تحديد التوصيل.</p>
          </div>
        </div>
        <OrderWorkflowChecklist
          status={order.status}
          deliveryFeeStatus={order.deliveryFeeStatus}
          deliveryFee={order.deliveryFee}
          isPacked={order.isPacked}
        />
      </div>

      <div className="adminCard">
        <div className="adminCardHeader"><h2>العمليات</h2></div>
        <OrderOperations
          orderId={order.id}
          status={order.status}
          deliveryFeeStatus={order.deliveryFeeStatus}
          isPacked={order.isPacked}
          invoicePrintCount={order.invoicePrintCount}
          packingSlipPrintCount={order.packingSlipPrintCount}
          summaryText={summaryText}
        />
      </div>

      <div className="adminCard">
        <div className="adminCardHeader"><h2>تحديث الحالة</h2></div>
        <OrderStatusActions orderId={order.id} status={order.status} deliveryFeeStatus={order.deliveryFeeStatus} />
      </div>

      <div className="adminCard">
        <div className="adminCardHeader"><h2>تحديد سعر التوصيل</h2></div>
        <OrderDeliveryFeeForm
          orderId={order.id}
          status={order.status}
          deliveryFee={order.deliveryFee}
          deliveryFeeStatus={order.deliveryFeeStatus}
          subtotal={order.subtotal}
          total={order.total}
        />
      </div>

      <div className="adminCard">
        <div className="adminCardHeader"><h2>ملاحظات</h2></div>
        <OrderNotesForm
          orderId={order.id}
          internalNote={order.internalNote}
          packagingNote={order.packagingNote}
          deliveryNote={order.deliveryNote}
        />
      </div>

      <div className="adminCard">
        <div className="adminCardHeader"><h2>العميل والتوصيل</h2></div>
        <div className="adminFormGrid two">
          <div className="adminField"><span className="adminFieldLabel">الاسم</span><div>{order.customerName}</div></div>
          <div className="adminField"><span className="adminFieldLabel">الهاتف</span><div>{order.customerPhone}</div></div>
          <div className="adminField"><span className="adminFieldLabel">واتساب</span><div>{order.customerWhatsappPhone ?? 'نفس رقم الجوال / غير محدد'}</div></div>
          <div className="adminField"><span className="adminFieldLabel">المدينة</span><div>{order.city}</div></div>
          <div className="adminField"><span className="adminFieldLabel">المنطقة</span><div>{order.area}</div></div>
          <div className="adminField spanTwo"><span className="adminFieldLabel">العنوان</span><div>{order.address}</div></div>
          {order.notes && <div className="adminField spanTwo"><span className="adminFieldLabel">ملاحظات العميل</span><div>{order.notes}</div></div>}
          {order.cancelReason && <div className="adminField spanTwo"><span className="adminFieldLabel">سبب الإلغاء</span><div>{order.cancelReason}</div></div>}
        </div>
      </div>

      <div className="adminCard">
        <div className="adminCardHeader"><h2>العناصر</h2></div>
        <div className="adminTableWrap">
          <table className="adminTable" style={{ minWidth: 520 }}>
            <thead>
              <tr><th>المنتج</th><th>الخيار</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="adminCellMain">
                      <CatalogImage className="adminThumb" src={item.image ?? '/mock-products/gift-box.svg'} alt={item.productName}  transform={{ ...PRODUCT_THUMB_IMAGE, crop: 'fit' }} sizes="100px" loading="lazy" />
                      <div><strong>{item.productName}</strong><small>{item.sku ?? '—'}</small></div>
                    </div>
                  </td>
                  <td>{[item.colorName, item.size].filter(Boolean).join(' · ') || '—'}</td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.unitPrice)}</td>
                  <td>{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="summaryDivider" style={{ margin: '14px 0' }} />
        <div className="adminTotalsRow"><span>المجموع الفرعي</span><strong>{formatCurrency(order.subtotal)}</strong></div>
        <div className="adminTotalsRow"><span>التوصيل</span><strong>{order.deliveryFeeStatus === 'PENDING' ? 'بانتظار التحديد' : order.deliveryFeeStatus === 'FREE' ? 'مجاني' : formatCurrency(order.deliveryFee)}</strong></div>
        {order.discount > 0 && <div className="adminTotalsRow"><span>الخصم</span><strong>−{formatCurrency(order.discount)}</strong></div>}
        <div className="adminTotalsRow grand"><span>{order.deliveryFeeStatus === 'PENDING' ? 'الإجمالي قبل التوصيل' : 'الإجمالي (الدفع عند الاستلام)'}</span><strong>{formatCurrency(order.total)}</strong></div>
      </div>

      <div className="adminCard">
        <div className="adminCardHeader"><h2>سجل الحالات</h2></div>
        <ol className="adminTimeline">
          {order.statusHistory.map((entry) => (
            <li key={entry.id}>
              <span className="adminTimelineDot" />
              <div>
                <strong>{entry.fromStatus ? <>{STATUS_LABEL_AR[entry.fromStatus]} <IconArrowLeft size={16} /> </> : null}{STATUS_LABEL_AR[entry.toStatus]}</strong>
                <div className="adminMuted" style={{ fontSize: 12 }}>{formatDateTime(entry.createdAt)}{entry.note ? ` · ${entry.note}` : ''}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {order.inventoryLogs.length > 0 && (
        <div className="adminCard">
          <div className="adminCardHeader"><h2>سجل المخزون</h2></div>
          <div className="adminCardList">
            {order.inventoryLogs.map((log) => (
              <div key={log.id} className="adminRecordMeta">
                <span><b>{log.type}</b></span>
                <span>{log.quantityChange > 0 ? `+${log.quantityChange}` : log.quantityChange}</span>
                <span className="adminMuted">{formatDateTime(log.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
