import 'server-only';
import { prisma } from '@/lib/prisma';

export type AdminCategoryListItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  parentId: string;
  parentName: string | null;
  productCount: number;
  childCount: number;
  sortOrder: number;
  isActive: boolean;
};

export async function getAdminCategories(): Promise<AdminCategoryListItem[]> {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      parent: { select: { name: true } },
      _count: { select: { products: true, children: true } }
    }
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description ?? '',
    imageUrl: category.imageUrl ?? '',
    parentId: category.parentId ?? '',
    parentName: category.parent?.name ?? null,
    productCount: category._count.products,
    childCount: category._count.children,
    sortOrder: category.sortOrder,
    isActive: category.isActive
  }));
}

export async function getAdminCategoryById(id: string) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) return null;
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description ?? '',
    imageUrl: category.imageUrl ?? '',
    parentId: category.parentId ?? '',
    sortOrder: category.sortOrder,
    isActive: category.isActive
  };
}

/** Possible parents for a category (top-level only, excluding the category itself). */
export async function getParentCategoryOptions(excludeId?: string) {
  const categories = await prisma.category.findMany({
    where: { parentId: null, ...(excludeId ? { id: { not: excludeId } } : {}) },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true }
  });
  return categories;
}
