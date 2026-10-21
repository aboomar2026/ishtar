import 'server-only';
import type { BannerPlacement } from '@prisma/client';
import { prisma } from '@/lib/prisma';

function toDateInput(value: Date | null): string {
  if (!value) return '';
  // Format for <input type="datetime-local"> (YYYY-MM-DDTHH:mm), in local time.
  const offset = value.getTimezoneOffset() * 60000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

export type AdminBannerListItem = {
  id: string;
  title: string;
  subtitle: string;
  eyebrow: string;
  href: string;
  ctaLabel: string;
  placement: BannerPlacement;
  imageUrl: string;
  cloudinaryPublicId: string;
  sortOrder: number;
  isActive: boolean;
  startsAtInput: string;
  endsAtInput: string;
  startsAt: Date | null;
  endsAt: Date | null;
  updatedAt: Date;
};

export async function getAdminBanners(): Promise<AdminBannerListItem[]> {
  const banners = await prisma.banner.findMany({
    orderBy: [{ placement: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }]
  });
  return banners.map((banner) => ({
    id: banner.id,
    title: banner.title,
    subtitle: banner.subtitle ?? '',
    eyebrow: banner.eyebrow ?? '',
    href: banner.href ?? '',
    ctaLabel: banner.ctaLabel ?? '',
    placement: banner.placement,
    imageUrl: banner.imageUrl ?? '',
    cloudinaryPublicId: banner.cloudinaryPublicId ?? '',
    sortOrder: banner.sortOrder,
    isActive: banner.isActive,
    startsAtInput: toDateInput(banner.startsAt),
    endsAtInput: toDateInput(banner.endsAt),
    startsAt: banner.startsAt,
    endsAt: banner.endsAt,
    updatedAt: banner.updatedAt
  }));
}

export async function getAdminBannerById(id: string) {
  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) return null;
  return {
    id: banner.id,
    title: banner.title,
    subtitle: banner.subtitle ?? '',
    eyebrow: banner.eyebrow ?? '',
    imageUrl: banner.imageUrl ?? '',
    cloudinaryPublicId: banner.cloudinaryPublicId ?? '',
    href: banner.href ?? '',
    ctaLabel: banner.ctaLabel ?? '',
    placement: banner.placement,
    sortOrder: banner.sortOrder,
    isActive: banner.isActive,
    startsAt: toDateInput(banner.startsAt),
    endsAt: toDateInput(banner.endsAt)
  };
}
