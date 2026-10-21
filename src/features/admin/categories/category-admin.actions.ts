'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/features/admin/auth/admin-auth';
import { categoryInputSchema, type CategoryInput } from './category-admin.validation';

export type CategoryIssue = { path: string; message: string };
export type CategoryResult = { ok: true; id: string } | { ok: false; message: string; issues: CategoryIssue[] };

function fail(message: string, issues: CategoryIssue[] = []): CategoryResult {
  return { ok: false, message, issues };
}

async function slugIssue(slug: string, ignoreId?: string): Promise<CategoryIssue | null> {
  const existing = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
  if (existing && existing.id !== ignoreId) {
    return { path: 'slug', message: 'This slug is already used by another category' };
  }
  return null;
}

export async function createCategoryAction(input: CategoryInput): Promise<CategoryResult> {
  await requireAdmin();
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail('Please fix the highlighted fields.', parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
  }
  const data = parsed.data;

  const issue = await slugIssue(data.slug);
  if (issue) return fail('Please fix the highlighted fields.', [issue]);

  const created = await prisma.category.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      imageUrl: data.imageUrl ?? null,
      parentId: data.parentId ?? null,
      sortOrder: data.sortOrder,
      isActive: data.isActive
    },
    select: { id: true }
  });

  revalidatePath('/admin/categories');
  revalidatePath('/');
  return { ok: true, id: created.id };
}

export async function updateCategoryAction(id: string, input: CategoryInput): Promise<CategoryResult> {
  await requireAdmin();
  const existing = await prisma.category.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return fail('Category not found.');

  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail('Please fix the highlighted fields.', parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
  }
  const data = parsed.data;

  if (data.parentId === id) {
    return fail('Please fix the highlighted fields.', [{ path: 'parentId', message: 'A category cannot be its own parent' }]);
  }

  const issue = await slugIssue(data.slug, id);
  if (issue) return fail('Please fix the highlighted fields.', [issue]);

  await prisma.category.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      imageUrl: data.imageUrl ?? null,
      parentId: data.parentId ?? null,
      sortOrder: data.sortOrder,
      isActive: data.isActive
    }
  });

  revalidatePath('/admin/categories');
  revalidatePath('/');
  return { ok: true, id };
}

export async function setCategoryActiveAction(id: string, isActive: boolean): Promise<{ ok: boolean }> {
  await requireAdmin();
  await prisma.category.update({ where: { id }, data: { isActive } });
  revalidatePath('/admin/categories');
  revalidatePath('/');
  return { ok: true };
}

export async function updateCategorySortOrderAction(id: string, sortOrder: number): Promise<{ ok: boolean }> {
  await requireAdmin();
  await prisma.category.update({ where: { id }, data: { sortOrder: Math.max(0, Math.trunc(sortOrder)) } });
  revalidatePath('/admin/categories');
  revalidatePath('/');
  return { ok: true };
}

/** Safe delete: refuse when the category has products or child categories. */
export async function deleteCategoryAction(id: string): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();
  const counts = await prisma.category.findUnique({
    where: { id },
    select: { _count: { select: { products: true, children: true } } }
  });
  if (!counts) return { ok: false, message: 'Category not found.' };
  if (counts._count.products > 0) {
    return { ok: false, message: 'Cannot delete: category still has products. Disable it instead.' };
  }
  if (counts._count.children > 0) {
    return { ok: false, message: 'Cannot delete: category has sub-categories.' };
  }
  await prisma.category.delete({ where: { id } });
  revalidatePath('/admin/categories');
  revalidatePath('/');
  return { ok: true };
}
