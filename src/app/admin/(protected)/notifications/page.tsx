import Link from 'next/link';
import { requireOrderAdmin } from '@/features/admin/auth/admin-auth';
import { getNotifications } from '@/features/notifications/notification.queries';
import { formatDateTime } from '@/features/admin/shared/admin-format';
import { NotificationActions, NotificationToolbar } from '@/components/admin/NotificationActions';

export const dynamic = 'force-dynamic';
const labels: Record<string, string> = {
  PENDING: 'بانتظار الإرسال', PROCESSING: 'جارٍ الإرسال', RETRY: 'محاولة أخرى مجدولة', SENT: 'أُرسل إلى تيليجرام', FAILED: 'تعذّر الإرسال', UNCERTAIN: 'نتيجة الإرسال غير مؤكدة'
};
const errors: Record<string, string> = {
  MISSING_CONFIG: 'راجعي إعدادات تيليجرام.', CHAT_MIGRATED: 'انتقلت المجموعة؛ راجعي معرّف مجموعة تيليجرام.',
  ORDER_MISSING: 'الطلب المرتبط غير موجود.', REJECTED: 'رفض تيليجرام الطلب؛ راجعي صلاحية البوت وإعداداته.',
  RETRYABLE: 'تعذّر الإرسال مؤقتًا.', UNCERTAIN: 'قد تكون الرسالة وصلت بالفعل؛ راجعي القناة قبل إعادة المحاولة.',
  LEASE_EXPIRED: 'توقفت محاولة سابقة دون نتيجة مؤكدة؛ راجعي القناة قبل إعادة المحاولة.'
};
export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const admin = await requireOrderAdmin();
  const data = await getNotifications(admin.id, Number((await searchParams).page));
  const scheduled = process.env.ORDER_OUTBOX_WORKER_ENABLED === 'true' && process.env.CONTEXT === 'production' && (process.env.ORDER_OUTBOX_WORKER_SECRET?.length ?? 0) >= 32;
  return <div>
    <div className="adminPageHeader"><div><h1>التنبيهات</h1><p className="adminMuted">سجل الطلبات الجديدة وحالة إرسالها إلى تيليجرام. قراءة التنبيه لا تعني تأكيد الطلب.</p></div></div>
    {!data.enabled ? <div className="adminCard"><p>إشعارات تيليجرام تستخدم المسار الحالي. سجل التنبيهات المحفوظ غير مفعّل بعد.</p></div> : <>
      <p className="adminMuted">غير المقروءة: {data.unread}</p>
      {!scheduled && <p className="adminPill adminPillWarning">المعالجة المجدولة غير مفعّلة في هذه النسخة. استخدمي زر الإرسال لمعالجة المحاولات المؤجلة.</p>}
      <NotificationToolbar />
      {data.rows.length === 0 && <div className="adminCard">لا توجد تنبيهات محفوظة بعد. تظهر هنا الطلبات الجديدة بعد التفعيل.</div>}
      {data.rows.map(row => <article key={row.id} className="adminCard">
        <div className="adminCardHeader"><div><h2>{row.orderNumber ? <Link href={`/admin/orders/${row.orderId}`}>طلب {row.orderNumber}</Link> : 'طلب غير متاح'}</h2><p>{formatDateTime(row.createdAt)} · {row.read ? 'مقروء' : 'جديد'}</p></div>
          <span className={`adminPill ${['FAILED', 'UNCERTAIN'].includes(row.status) ? 'adminPillWarning' : ''}`}>{labels[row.status] ?? 'تحتاج مراجعة'}</span></div>
        <p className="adminMuted">محاولات الإرسال: {row.attempts}</p>
        {row.errorCode && <p>{errors[row.errorCode] ?? 'راجعي حالة الإرسال.'}</p>}
        <NotificationActions id={row.id} read={row.read} status={row.status} />
      </article>)}
      {data.pageCount > 1 && <nav className="adminBtnRow" aria-label="صفحات التنبيهات">
        {data.page > 1 && <Link className="adminBtn adminBtnGhost" href={`/admin/notifications?page=${data.page - 1}`}>السابق</Link>}
        <span>الصفحة {data.page} من {data.pageCount}</span>
        {data.page < data.pageCount && <Link className="adminBtn adminBtnGhost" href={`/admin/notifications?page=${data.page + 1}`}>التالي</Link>}
      </nav>}
    </>}
  </div>;
}
