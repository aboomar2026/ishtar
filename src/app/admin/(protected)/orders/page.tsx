import { IconSearch, IconReceipt } from '@/components/Icons';
import Link from 'next/link';
import type { DeliveryFeeStatus, OrderStatus } from '@prisma/client';
import { getAdminOrders, type AdminOrderDateFilter, type AdminDeliveryFeeFilter } from '@/features/admin/orders/order-admin.queries';
import { formatCurrency, formatDateTime } from '@/features/admin/shared/admin-format';
import { OrderFilters } from '@/components/admin/OrderFilters';
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { DELIVERY_FEE_STATUS_LABEL_AR } from '@/features/orders/delivery-fee.labels';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ q?: string; status?: string; date?: string; delivery?: string }>;

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const orders = await getAdminOrders({
    q: sp.q,
    status: (sp.status as OrderStatus | 'ALL') ?? 'ALL',
    date: (sp.date as AdminOrderDateFilter) ?? 'all',
    delivery: (sp.delivery as AdminDeliveryFeeFilter) ?? 'ALL'
  });

  const exportQuery = new URLSearchParams();
  if (sp.q) exportQuery.set('q', sp.q);
  if (sp.status) exportQuery.set('status', sp.status);
  if (sp.date) exportQuery.set('date', sp.date);
  if (sp.delivery) exportQuery.set('delivery', sp.delivery);
  const exportHref = `/admin/orders/export${exportQuery.toString() ? `?${exportQuery.toString()}` : ''}`;

  const hasFilters = Boolean(sp.q || (sp.status && sp.status !== 'ALL') || (sp.date && sp.date !== 'all') || (sp.delivery && sp.delivery !== 'ALL'));

  function renderDelivery(order: { deliveryFeeStatus: DeliveryFeeStatus; deliveryFee: number }) {
    if (order.deliveryFeeStatus === 'PENDING') {
      return <span className="adminPill adminPillWarning">بانتظار التوصيل</span>;
    }
    if (order.deliveryFeeStatus === 'FREE') {
      return <span className="adminPill adminPillSuccess">توصيل مجاني</span>;
    }
    return <span className="adminPill">توصيل {formatCurrency(order.deliveryFee)}</span>;
  }

  return (
    <div>
      <div className="adminPageHeader">
        <div>
          <h1>الطلبات</h1>
          <p className="adminMuted">عرض {orders.length} طلب · الدفع عند الاستلام فقط · التوصيل يحدد من الأدمن.</p>
        </div>
        <a href={exportHref} className="adminBtn adminBtnGhost" download>⬇ تصدير CSV</a>
      </div>

      <OrderFilters />

      {orders.length === 0 ? (
        hasFilters ? (
          <AdminEmptyState
            icon={<IconSearch size={40} />}
            title="لا توجد نتائج مطابقة"
            description="لا توجد طلبات تطابق عوامل التصفية الحالية. جرّب تعديل البحث أو الفلاتر."
            actionHref="/admin/orders"
            actionLabel="مسح الفلاتر"
          />
        ) : (
          <AdminEmptyState
            icon={<IconReceipt size={40} />}
            title="لا توجد طلبات بعد"
            description="ستظهر هنا الطلبات الجديدة فور إتمام العملاء للشراء بالدفع عند الاستلام."
          />
        )
      ) : (
        <>
          {/* Desktop table */}
          <div className="adminCard adminOnlyDesktop" style={{ padding: 0 }}>
            <div className="adminTableWrap">
              <table className="adminTable">
                <thead>
                  <tr>
                    <th>الطلب</th>
                    <th>العميل</th>
                    <th>الموقع</th>
                    <th>الحالة</th>
                    <th>العناصر</th>
                    <th>التوصيل</th>
                    <th>الإجمالي</th>
                    <th>تاريخ الطلب</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td><strong>{order.orderNumber}</strong>{order.status === 'PENDING' && <span className="adminNewPill">جديد</span>}</td>
                      <td>
                        <div className="adminCellMain">
                          <div>
                            <strong>{order.customerName}</strong>
                            <small>{order.customerPhone}</small>
                            {order.customerWhatsappPhone && <small>واتساب: {order.customerWhatsappPhone}</small>}
                          </div>
                        </div>
                      </td>
                      <td>{order.city} · {order.area}</td>
                      <td><OrderStatusBadge status={order.status} /></td>
                      <td>{order.itemCount}</td>
                      <td>{renderDelivery(order)}</td>
                      <td>
                        <strong>{formatCurrency(order.total)}</strong>
                        {order.deliveryFeeStatus === 'PENDING' && <small className="adminMuted" style={{ display: 'block' }}>قبل التوصيل</small>}
                      </td>
                      <td className="adminMuted">{formatDateTime(order.createdAt)}</td>
                      <td><Link href={`/admin/orders/${order.id}`} className="adminBtn adminBtnSm">عرض</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="adminCardList adminOnlyMobile">
            {orders.map((order) => (
              <Link href={`/admin/orders/${order.id}`} key={order.id} className="adminRecordCard" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="adminRecordTop">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <strong>{order.orderNumber}</strong>{order.status === 'PENDING' && <span className="adminNewPill">جديد</span>}
                    <div className="adminMuted" style={{ fontSize: 12 }}>
                      {order.customerName} · {order.customerPhone}{order.customerWhatsappPhone ? ` · واتساب: ${order.customerWhatsappPhone}` : ''}
                    </div>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="adminRecordMeta">
                  <span>{order.city} · {order.area}</span>
                  <span>{order.itemCount} عنصر</span>
                  <span>{DELIVERY_FEE_STATUS_LABEL_AR[order.deliveryFeeStatus]}{order.deliveryFeeStatus === 'SET' ? ` · ${formatCurrency(order.deliveryFee)}` : ''}</span>
                  <span><b>{formatCurrency(order.total)}</b>{order.deliveryFeeStatus === 'PENDING' ? ' · قبل التوصيل' : ''}</span>
                  <span>{formatDateTime(order.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
