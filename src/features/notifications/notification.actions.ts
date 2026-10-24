'use server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireOrderAdmin } from '@/features/admin/auth/admin-auth';
import { orderOutboxEnabled } from './notification-config';
import { drainOrderNotifications } from './notification-dispatcher';
import { Prisma } from '@prisma/client';

type Result = { ok: boolean; message: string };

export async function markAllNotificationsReadAction(): Promise<Result> {
  const admin = await requireOrderAdmin();
  if (!orderOutboxEnabled()) return { ok: false, message: 'سجل التنبيهات غير مفعّل بعد.' };
  try {
    await prisma.$executeRaw(Prisma.sql`INSERT INTO "OrderNotificationRead" ("notificationId", "adminId", "readAt")
      SELECT id, ${admin.id}, CURRENT_TIMESTAMP FROM "OrderNotification" WHERE "createdAt" <= CURRENT_TIMESTAMP
      ON CONFLICT ("notificationId", "adminId") DO NOTHING`);
    revalidatePath('/admin/notifications');
    return { ok: true, message: 'تم تحديد التنبيهات الحالية كمقروءة.' };
  } catch { return { ok: false, message: 'تعذّر حفظ حالة التنبيهات.' }; }
}

export async function processQueuedNotificationsAction(): Promise<Result> {
  await requireOrderAdmin();
  if (!orderOutboxEnabled()) return { ok: false, message: 'سجل التنبيهات غير مفعّل بعد.' };
  try {
    const processed = await drainOrderNotifications();
    revalidatePath('/admin/notifications');
    return { ok: true, message: `تمت معالجة ${processed} محاولة. راجعي حالة كل تنبيه للتأكد من نتيجة الإرسال.` };
  } catch { return { ok: false, message: 'تعذّرت معالجة المحاولات؛ الطلبات المحفوظة لم تتأثر.' }; }
}

export async function markNotificationReadAction(id: string): Promise<Result> {
  const admin = await requireOrderAdmin();
  if (!orderOutboxEnabled()) return { ok: false, message: 'سجل التنبيهات غير مفعّل بعد.' };
  if (!id || id.length > 128) return { ok: false, message: 'التنبيه غير موجود.' };
  try {
    if (!await prisma.orderNotification.findUnique({ where: { id }, select: { id: true } })) return { ok: false, message: 'التنبيه غير موجود.' };
    await prisma.orderNotificationRead.upsert({ where: { notificationId_adminId: { notificationId: id, adminId: admin.id } },
      create: { notificationId: id, adminId: admin.id }, update: {} });
    revalidatePath('/admin/notifications');
    return { ok: true, message: 'تم تحديد التنبيه كمقروء.' };
  } catch { return { ok: false, message: 'تعذّر حفظ حالة التنبيه. حاولي مجددًا.' }; }
}

export async function retryNotificationAction(id: string, acknowledgePossibleDuplicate = false): Promise<Result> {
  await requireOrderAdmin();
  if (!orderOutboxEnabled()) return { ok: false, message: 'سجل التنبيهات غير مفعّل بعد.' };
  if (!id || id.length > 128) return { ok: false, message: 'التنبيه غير موجود.' };
  try {
    const changed = await prisma.orderNotification.updateMany({ where: { id, deliveryStatus: { in: acknowledgePossibleDuplicate ? ['FAILED', 'UNCERTAIN'] : ['FAILED'] } },
      data: { deliveryStatus: 'RETRY', nextAttemptAt: new Date(), leaseToken: null, leaseUntil: null, lastErrorCode: null } });
    if (!changed.count) return { ok: false, message: 'راجعي حالة الإرسال، وأكّدي احتمال التكرار إذا كانت النتيجة غير مؤكدة.' };
    revalidatePath('/admin/notifications');
    return { ok: true, message: 'حُفظت إعادة المحاولة. سيعالجها عامل الإرسال؛ هذا لا يعني وصول الرسالة بعد.' };
  } catch { return { ok: false, message: 'تعذّر حفظ إعادة المحاولة.' }; }
}
