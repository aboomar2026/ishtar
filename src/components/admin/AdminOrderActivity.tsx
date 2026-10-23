'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useOrderActivity } from './useOrderActivity';

export function AdminOrderActivity() {
  const pathname = usePathname();
  const router = useRouter();
  const pendingRefresh = useRef(false);
  const [changed, setChanged] = useState(false);
  const { activity, unavailable } = useOrderActivity((_next, different) => {
    if (different) { pendingRefresh.current = true; setChanged(true); }
    const editing = document.activeElement?.matches('input,textarea,select,[contenteditable="true"]');
    if (pendingRefresh.current && !editing && ['/admin', '/admin/orders', '/admin/notifications'].includes(pathname)) {
      pendingRefresh.current = false; setChanged(false); router.refresh();
    }
  }, () => router.refresh());
  return <div className="adminOrderActivity" role="region" aria-label="متابعة الطلبات">
    <Link className="adminBtn adminBtnGhost adminBtnSm" href="/admin/orders?status=PENDING">طلبات بانتظار التأكيد{activity ? `: ${activity.pendingOrders}` : ''}</Link>
    <Link className="adminBtn adminBtnGhost adminBtnSm" href="/admin/notifications">التنبيهات{activity?.outboxEnabled ? `: ${activity.unread} غير مقروءة` : ''}</Link>
    {!!activity?.failed && <span className="adminPill adminPillWarning">تنبيهات تحتاج مراجعة: {activity.failed}</span>}
    <span className="adminMuted" role="status">{unavailable ? 'التحديث التلقائي متعذر مؤقتًا؛ تبقى الصفحة قابلة للاستخدام.' : changed ? 'توجد تحديثات جديدة للطلبات.' : activity ? 'تُحدّث الطلبات تلقائيًا أثناء فتح الصفحة.' : 'جارٍ التحقق من الطلبات…'}</span>
    <button className="adminBtn adminBtnGhost adminBtnSm" type="button" onClick={() => { pendingRefresh.current = false; setChanged(false); router.refresh(); }}>تحديث الصفحة</button>
  </div>;
}
