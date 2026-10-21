'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/features/admin/auth/admin-auth';
import { bannerInputSchema, type BannerInput } from './banner-admin.validation';

export type BannerIssue = { path: string; message: string };
export type BannerResult = { ok: true; id: string } | { ok: false; message: string; issues: BannerIssue[] };

function fail(message: string, issues: BannerIssue[] = []): BannerResult {
  return { ok: false, message, issues };
}

export async function createBannerAction(input: BannerInput): Promise<BannerResult> {
  await requireAdmin();
  const parsed = bannerInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail('Please fix the highlighted fields.', parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
  }
  const data = parsed.data;
  const created = await prisma.banner.create({
    data: {
      title: data.title,
      subtitle: data.subtitle ?? null,
      eyebrow: data.eyebrow ?? null,
      imageUrl: data.imageUrl ?? null,
      cloudinaryPublicId: data.cloudinaryPublicId ?? null,
      href: data.href ?? null,
      ctaLabel: data.ctaLabel ?? null,
      placement: data.placement,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
      startsAt: data.startsAt ?? null,
      endsAt: data.endsAt ?? null
    },
    select: { id: true }
  });
  revalidatePath('/admin/banners');
  revalidatePath('/');
  return { ok: true, id: created.id };
}

export async function updateBannerAction(id: string, input: BannerInput): Promise<BannerResult> {
  await requireAdmin();
  const existing = await prisma.banner.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return fail('Banner not found.');

  const parsed = bannerInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail('Please fix the highlighted fields.', parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
  }
  const data = parsed.data;
  await prisma.banner.update({
    where: { id },
    data: {
      title: data.title,
      subtitle: data.subtitle ?? null,
      eyebrow: data.eyebrow ?? null,
      imageUrl: data.imageUrl ?? null,
      cloudinaryPublicId: data.cloudinaryPublicId ?? null,
      href: data.href ?? null,
      ctaLabel: data.ctaLabel ?? null,
      placement: data.placement,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
      startsAt: data.startsAt ?? null,
      endsAt: data.endsAt ?? null
    }
  });
  revalidatePath('/admin/banners');
  revalidatePath('/');
  return { ok: true, id };
}

export async function setBannerActiveAction(id: string, isActive: boolean): Promise<{ ok: boolean }> {
  await requireAdmin();
  await prisma.banner.update({ where: { id }, data: { isActive } });
  revalidatePath('/admin/banners');
  revalidatePath('/');
  return { ok: true };
}

export async function deleteBannerAction(id: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  await prisma.banner.delete({ where: { id } });
  revalidatePath('/admin/banners');
  revalidatePath('/');
  return { ok: true };
}
