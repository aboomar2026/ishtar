'use server';
import { revalidatePath, updateTag } from 'next/cache';
import { requireAdmin } from '@/features/admin/auth/admin-auth';
import { prisma } from '@/lib/prisma';
import { heroSettingsSchema } from './hero-config';

export async function saveHeroSettingsAction(input: unknown) {
  await requireAdmin();
  const parsed = heroSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? 'تحقق من إعدادات الواجهة.' };
  await prisma.heroSettings.upsert({ where: { id: 'home' }, create: { id: 'home', config: parsed.data }, update: { config: parsed.data } });
  updateTag('public-hero-settings');
  revalidatePath('/');
  revalidatePath('/admin/banners');
  return { ok: true, message: 'تم حفظ إعدادات الواجهة.' };
}
