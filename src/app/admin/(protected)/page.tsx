import { requireOrderAdmin } from '@/features/admin/auth/admin-auth';
import { IconReceipt, IconTruck, IconPlus, IconPackage, IconBag, IconImages } from '@/components/Icons';
import Link from 'next/link';
import { getDashboardOverview } from '@/features/admin/dashboard/dashboard.queries';
import { formatCurrency, formatDateTime } from '@/features/admin/shared/admin-format';
import { OrderStatusBadge } from '@/components/admin/OrderStatusBadge';
import { DELIVERY_FEE_STATUS_LABEL_AR } from '@/features/orders/delivery-fee.labels';

export const dynamic = 'force-dynamic';

type Stat = { label: string; value: number | string; tone?: 'warn' | 'danger' | 'success'; href?: string; hint?: string };

function StatCard({ stat }: { stat: Stat }) {
  const body = (
    <>
      <div className="adminStatValue">{stat.value}</div>
      <div className="adminStatLabel">{stat.label}</div>
      {stat.hint && <div className="adminStatHint">{stat.hint}</div>}
    </>
  );

  const className = `adminStat${stat.tone ? ` ${stat.tone}` : ''}${stat.href ? ' isClickable' : ''}`;
  return stat.href ? (
    <Link href={stat.href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export default async function AdminDashboardPage() {
  await requireOrderAdmin();
  const overview = await getDashboardOverview();

  const priorityStats: Stat[] = [
    { label: 'طلبات تحتاج تأكيد', value: overview.pendingOrders, tone: overview.pendingOrders ? 'warn' : undefined, href: '/admin/orders?status=PENDING', hint: 'ابدأ بها أولاً' },
    { label: 'بانتظار تحديد التوصيل', value: overview.deliveryPendingOrders, tone: overview.deliveryPendingOrders ? 'warn' : undefined, href: '/admin/orders?delivery=PENDING', hint: 'لا تُشحن قبل التحديد' },
    { label: 'مخزون منخفض', value: overview.lowStockVariants, tone: overview.lowStockVariants ? 'warn' : undefined, href: '/admin/inventory', hint: 'راجع الكميات' },
    { label: 'نفد المخزون', value: overview.outOfStockVariants, tone: overview.outOfStockVariants ? 'danger' : undefined, href: '/admin/inventory', hint: 'خيارات غير متاحة' }
  ];

  const todayStats: Stat[] = [
    { label: 'طلبات اليوم', value: overview.todayOrders },
    { label: 'طلبات اليوم الجديدة', value: overview.todayPendingOrders, tone: overview.todayPendingOrders ? 'warn' : undefined, href: '/admin/orders?status=PENDING&date=today' },
    { label: 'قيمة اليوم', value: formatCurrency(overview.todayOrderValue), hint: 'عدا الملغي' }
  ];

  const catalogStats: Stat[] = [
    { label: 'إجمالي المنتجات', value: overview.totalProducts, href: '/admin/products' },
    { label: 'نشط', value: overview.activeProducts, href: '/admin/products?status=ACTIVE' },
    { label: 'مسودة', value: overview.draftProducts, href: '/admin/products?status=DRAFT' },
    { label: 'مؤرشف', value: overview.archivedProducts, href: '/admin/products?status=ARCHIVED' },
    { label: 'منتجات نشطة بدون خيارات', value: overview.activeProductsWithoutVariants, tone: overview.activeProductsWithoutVariants ? 'danger' : undefined, href: '/admin/products?status=ACTIVE' },
    { label: 'بنرات فعّالة', value: overview.activeBanners, href: '/admin/banners' }
  ];

  const orderStats: Stat[] = [
    { label: 'مؤكد / قيد التجهيز', value: overview.inProgressOrders, href: '/admin/orders?status=CONFIRMED' },
    { label: 'تم الشحن', value: overview.shippedOrders, href: '/admin/orders?status=SHIPPED' },
    { label: 'تم التسليم', value: overview.deliveredOrders, tone: 'success', href: '/admin/orders?status=DELIVERED' },
    { label: 'ملغي', value: overview.canceledOrders, tone: overview.canceledOrders ? 'danger' : undefined, href: '/admin/orders?status=CANCELED' }
  ];

  const quickLinks = [
    { href: '/admin/orders?status=PENDING', label: 'مراجعة الطلبات الجديدة', icon: <IconReceipt size={28} /> },
    { href: '/admin/orders?delivery=PENDING', label: 'تحديد أسعار التوصيل', icon: <IconTruck size={28} /> },
    { href: '/admin/products/new', label: 'إضافة منتج', icon: <IconPlus size={28} /> },
    { href: '/admin/inventory', label: 'فحص المخزون', icon: <IconPackage size={28} /> },
    { href: '/admin/products', label: 'إدارة المنتجات', icon: <IconBag size={28} /> },
    { href: '/admin/banners', label: 'إدارة البنرات', icon: <IconImages size={28} /> }
  ];

  return (
    <div>
      <div className="adminPageHeader">
        <div>
          <h1>لوحة التحكم</h1>
          <p className="adminMuted">نقطة البداية اليومية: الطلبات، التوصيل، والمخزون المهم.</p>
        </div>
        <div className="adminBtnRow">
          <Link href="/admin/orders?status=PENDING" className="adminBtn adminBtnPrimary">ابدأ بالطلبات الجديدة</Link>
          <Link href="/admin/products/new" className="adminBtn adminBtnGhost">+ إضافة منتج</Link>
        </div>
      </div>

      <div className="adminDashboardHero adminCard">
        <div>
          <span className="eyebrow">Today</span>
          <h2>ملخص اليوم</h2>
          <p>تابع ما يحتاج قرار سريع قبل تجهيز الطلبات أو الشحن.</p>
        </div>
        <div className="adminStatGrid compact">
          {todayStats.map((stat) => <StatCard key={stat.label} stat={stat} />)}
        </div>
      </div>

      <div className="adminCard">
        <div className="adminCardHeader">
          <div>
            <h2>الأولوية الآن</h2>
            <p>هذه البطاقات قابلة للضغط وتوصلك للصفحة المناسبة مباشرة.</p>
          </div>
        </div>
        <div className="adminStatGrid">
          {priorityStats.map((stat) => <StatCard key={stat.label} stat={stat} />)}
        </div>
      </div>

      <div className="adminDashboardSplit">
        <div className="adminCard">
          <div className="adminCardHeader">
            <div>
              <h2>آخر الطلبات</h2>
              <p>آخر 6 طلبات وصلت للنظام.</p>
            </div>
            <Link href="/admin/orders" className="adminBtn adminBtnGhost adminBtnSm">فتح الكل</Link>
          </div>
          {overview.recentOrders.length === 0 ? (
            <p className="adminMuted">لا توجد طلبات بعد.</p>
          ) : (
            <div className="adminCardList">
              {overview.recentOrders.map((order) => (
                <Link key={order.id} href={`/admin/orders/${order.id}`} className="adminRecordCard adminDashboardOrderCard">
                  <div className="adminRecordTop">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <strong>{order.orderNumber}</strong>
                      <div className="adminMuted" style={{ fontSize: 12 }}>
                        {order.customerName} · {order.customerPhone}{order.customerWhatsappPhone ? ` · واتساب: ${order.customerWhatsappPhone}` : ''}
                      </div>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <div className="adminRecordMeta">
                    <span>{order.city} · {order.area}</span>
                    <span>{order.itemCount} عنصر</span>
                    <span>{DELIVERY_FEE_STATUS_LABEL_AR[order.deliveryFeeStatus]}</span>
                    <span><b>{formatCurrency(order.total)}</b></span>
                    <span>{formatDateTime(order.createdAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="adminCard">
          <div className="adminCardHeader">
            <div>
              <h2>تنبيهات المخزون</h2>
              <p>أقل الخيارات المتاحة حسب حد المخزون المنخفض.</p>
            </div>
            <Link href="/admin/inventory" className="adminBtn adminBtnGhost adminBtnSm">فتح المخزون</Link>
          </div>
          {overview.stockAlerts.length === 0 ? (
            <div className="adminAlert isSuccess">لا توجد تنبيهات مخزون حالياً.</div>
          ) : (
            <div className="adminCardList">
              {overview.stockAlerts.map((variant) => (
                <Link key={variant.id} href="/admin/inventory" className="adminRecordCard adminDashboardStockCard">
                  <div className="adminRecordTop">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <strong>{variant.productName}</strong>
                      <div className="adminMuted" style={{ fontSize: 12 }}>
                        {variant.sku} · {[variant.colorName, variant.size].filter(Boolean).join(' · ') || 'بدون خيار'}
                      </div>
                    </div>
                    <span className={variant.quantity <= 0 ? 'adminPill adminPillDanger' : 'adminPill adminPillWarning'}>
                      {variant.quantity <= 0 ? 'نفد' : 'منخفض'}
                    </span>
                  </div>
                  <div className="adminRecordMeta">
                    <span>المتاح: <b>{variant.quantity}</b></span>
                    <span>الحد: {variant.lowStockThreshold}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="adminCard">
        <div className="adminCardHeader">
          <h2>حالة الطلبات</h2>
          <Link href="/admin/orders" className="adminBtn adminBtnGhost adminBtnSm">إدارة الطلبات</Link>
        </div>
        <div className="adminStatGrid">
          {orderStats.map((stat) => <StatCard key={stat.label} stat={stat} />)}
        </div>
      </div>

      <div className="adminCard">
        <div className="adminCardHeader">
          <h2>الكتالوج</h2>
          <Link href="/admin/products" className="adminBtn adminBtnGhost adminBtnSm">إدارة المنتجات</Link>
        </div>
        <div className="adminStatGrid">
          {catalogStats.map((stat) => <StatCard key={stat.label} stat={stat} />)}
        </div>
      </div>

      <div className="adminCard">
        <div className="adminCardHeader">
          <h2>إجراءات سريعة</h2>
        </div>
        <div className="adminQuickGrid">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href} className="adminQuickLink">
              <span>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
