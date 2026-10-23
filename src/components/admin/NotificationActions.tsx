'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { markNotificationReadAction, retryNotificationAction, markAllNotificationsReadAction, processQueuedNotificationsAction } from '@/features/notifications/notification.actions';

export function NotificationToolbar() {
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function run(dispatch: boolean) {
    startTransition(async () => {
      try {
        const result = await (dispatch ? processQueuedNotificationsAction() : markAllNotificationsReadAction());
        setMessage(result.message); if (result.ok) router.refresh();
      } catch { setMessage('تعذّر تنفيذ الإجراء. حدّثي الصفحة وتحققي من تسجيل الدخول.'); }
    });
  }
  return <div className="adminCard">
    <div className="adminBtnRow">
      <button className="adminBtn adminBtnGhost" disabled={pending} onClick={() => run(false)}>تحديد الكل كمقروء</button>
      <button className="adminBtn adminBtnGhost" disabled={pending} onClick={() => run(true)}>إرسال المحاولات المستحقة الآن</button>
    </div>
    <p className="adminMuted">زر الإرسال يعالج حتى ثلاث محاولات إلى تيليجرام. النتائج غير المؤكدة تحتاج مراجعة وموافقة على إعادة الجدولة أولًا.</p>
    {message && <p role="status">{message}</p>}
  </div>;
}

export function NotificationActions({ id, read, status }: { id: string; read: boolean; status: string }) {
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function run(retry: boolean) {
    const uncertain = retry && status === 'UNCERTAIN';
    if (uncertain && !window.confirm('قد تكون الرسالة وصلت بالفعل. إعادة المحاولة قد ترسل نسخة أخرى من نفس الطلب. هل تريدين إعادة جدولتها؟')) return;
    startTransition(async () => {
      try {
        const result = retry ? await retryNotificationAction(id, uncertain) : await markNotificationReadAction(id);
        setMessage(result.message);
        if (result.ok) router.refresh();
      } catch { setMessage('تعذّر تنفيذ الإجراء. حدّثي الصفحة وتحققي من تسجيل الدخول.'); }
    });
  }
  return <div>
    <div className="adminBtnRow">
      {!read && <button type="button" className="adminBtn adminBtnGhost adminBtnSm" disabled={pending} onClick={() => run(false)}>تحديد كمقروء</button>}
      {['FAILED', 'UNCERTAIN'].includes(status) && <button type="button" className="adminBtn adminBtnGhost adminBtnSm" disabled={pending} onClick={() => run(true)}>إعادة جدولة الإرسال</button>}
    </div>
    {message && <p role="status" className="adminMuted">{message}</p>}
  </div>;
}
