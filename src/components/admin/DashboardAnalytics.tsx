import Link from 'next/link';
import { getDashboardAnalytics } from '@/features/admin/dashboard/dashboard-analytics.queries';
import { DASHBOARD_PERIODS } from '@/features/admin/dashboard/dashboard-period';
import { formatCurrency } from '@/features/admin/shared/admin-format';

export function DashboardAnalytics({ analytics }: { analytics: Awaited<ReturnType<typeof getDashboardAnalytics>> }) {
  const { totals } = analytics;
  const maxOrders = Math.max(1, ...analytics.daily.map(day => day.orders));
  const stats = [
    ['إجمالي الطلبات', totals.orders, 'يشمل الطلبات الملغاة'],
    ['قيمة الطلبات غير الملغاة', formatCurrency(totals.orderValue), 'تشمل رسوم التوصيل المحددة فقط'],
    ['قيمة الطلبات المسلّمة', formatCurrency(totals.deliveredValue), `${totals.delivered} طلبًا بحالة تم التسليم`],
    ['متوسط الطلب غير الملغى', formatCurrency(analytics.averageOrderValue), 'القيمة ÷ عدد الطلبات غير الملغاة'],
    ['طلبات ملغاة', totals.canceled, 'مستبعدة من القيمة والمتوسط'],
    ['بانتظار تحديد التوصيل', totals.pendingDelivery, 'قيمة هذه الطلبات قد تتغيّر بعد تحديد الرسوم']
  ];
  return <section className="adminCard" aria-labelledby="dashboard-analytics-title">
    <div className="adminCardHeader">
      <div><h2 id="dashboard-analytics-title">أداء الطلبات — {analytics.label}</h2><p>حسب تاريخ إنشاء الطلب بتوقيت فلسطين وحالته الحالية؛ قيمة المسلّم ليست إثباتًا لتحصيل الأموال.</p></div>
      <nav className="adminBtnRow" aria-label="فترة ملخص الطلبات">
        {Object.entries(DASHBOARD_PERIODS).map(([key, label]) => <Link key={key} href={`/admin?period=${key}`} aria-current={analytics.period === key ? 'page' : undefined}
          className={`adminBtn adminBtnSm ${analytics.period === key ? 'adminBtnPrimary' : 'adminBtnGhost'}`}>{label}</Link>)}
      </nav>
    </div>
    <div className="adminStatGrid">{stats.map(([label, value, hint]) => <div className="adminStat" key={label}>
      <div className="adminStatValue">{value}</div><div className="adminStatLabel">{label}</div><div className="adminStatHint">{hint}</div>
    </div>)}</div>
    {totals.orders === 0 && <p className="adminMuted" role="status">لا توجد طلبات خلال هذه الفترة.</p>}
    <div className="adminAnalyticsTable" role="region" aria-label="تفصيل الطلبات اليومي، قابل للتمرير أفقيًا" tabIndex={0}>
      <table className="adminTable">
        <caption>التفصيل اليومي — أيام بلا طلبات تظهر بصفر</caption>
        <thead><tr><th scope="col">التاريخ</th><th scope="col">الطلبات</th><th scope="col">الملغاة</th><th scope="col">قيمة غير الملغى</th><th scope="col">قيمة المسلّم</th></tr></thead>
        <tbody>{analytics.daily.map(day => <tr key={day.day}>
          <th scope="row"><time dateTime={day.day}>{day.day}</time></th>
          <td><span className="adminAnalyticsCount"><b>{day.orders}</b><span aria-hidden="true" className="adminAnalyticsBar" style={{ width: `${day.orders / maxOrders * 80}px` }} /></span></td>
          <td>{day.canceled}</td><td>{formatCurrency(day.orderValue)}</td><td>{formatCurrency(day.deliveredValue)}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}
