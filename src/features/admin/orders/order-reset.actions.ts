'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/features/admin/auth/admin-auth';
import {
  canResetTestOrders, getTestOrderResetPreview, OrderResetAbort,
  RESET_CONFIRMATION, resetTestOrders,
} from './order-reset';

export async function previewTestOrderResetAction() {
  const admin = await requireAdmin();
  if (!canResetTestOrders(admin.role)) return { ok: false as const, message: 'تصفير طلبات الاختبار غير متاح لهذا الحساب.' };
  return { ok: true as const, preview: await getTestOrderResetPreview() };
}

export async function resetTestOrdersAction(token: string, confirmation: string) {
  const admin = await requireAdmin();
  if (!canResetTestOrders(admin.role)) return { ok: false as const, message: 'تصفير طلبات الاختبار غير متاح لهذا الحساب.' };
  if (confirmation !== RESET_CONFIRMATION || !/^[a-f0-9]{64}$/.test(token)) {
    return { ok: false as const, message: 'اكتب عبارة التأكيد كما هي.' };
  }
  let result;
  try {
    result = await resetTestOrders(token, admin.id);
  } catch (error) {
    if (error instanceof OrderResetAbort) return { ok: false as const, message: error.message };
    console.error('Test order reset failed', error);
    return { ok: false as const, message: 'لم يتم التصفير. لم تُحفظ أي تغييرات. حدّث الصفحة وحاول مجدداً.' };
  }
  revalidatePath('/', 'layout');
  return { ok: true as const, orderCount: result.orderCount, restoreQuantity: result.restoreQuantity };
}
