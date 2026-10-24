import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapProductCard } from "@/features/catalog/catalog.mappers";
import { productListInclude } from "@/features/catalog/catalog.queries";
import { normalizeSuggestionQuery } from "@/features/catalog/search-suggestions";
import type { CollectionCardData } from "./collections.types";

import { collectionsReady } from "./collections.storage";
export { collectionsReady } from "./collections.storage";
export const publishedProduct = {
  status: "ACTIVE",
  category: { isActive: true },
} satisfies Prisma.ProductWhereInput;
const cardInclude = {
  products: {
    where: { product: publishedProduct },
    orderBy: [{ sortOrder: "asc" }, { productId: "asc" }],
    take: 3,
    include: {
      product: {
        select: {
          images: {
            orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
            take: 1,
          },
        },
      },
    },
  },
  _count: { select: { products: { where: { product: publishedProduct } } } },
} satisfies Prisma.CollectionInclude;
function card(
  row: Prisma.CollectionGetPayload<{ include: typeof cardInclude }>,
): CollectionCardData {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: row.imageUrl,
    symbol: row.symbol,
    tone: row.tone,
    images: row.products.flatMap((member) =>
      member.product.images.map((image) => image.url),
    ),
    productCount: row._count.products,
  };
}
export async function getCollections({
  home = false,
  q = "",
  productId,
  limit = 60,
}: { home?: boolean; q?: string; productId?: string; limit?: number } = {}) {
  if (!(await collectionsReady())) return [];
  const term = normalizeSuggestionQuery(q);
  const literal = term.replace(/[\\%_]/g, character => `\\${character}`);
  const rows = await prisma.collection.findMany({
    where: {
      isActive: true,
      ...(home ? { showOnHome: true } : {}),
      products: {
        some: {
          product: publishedProduct,
          ...(productId ? { productId } : {}),
        },
      },
      ...(term
        ? {
            OR: [
              { name: { contains: literal, mode: "insensitive" as const } },
              { description: { contains: literal, mode: "insensitive" as const } },
              { keywords: { has: term } },
            ],
          }
        : {}),
    },
    include: cardInclude,
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    take: Math.min(100, Math.max(1, limit)),
  });
  return rows.map(card);
}
export async function getCollection(slug: string, page = 1) {
  if (!(await collectionsReady())) return null;
  const row = await prisma.collection.findFirst({
    where: { slug, isActive: true },
    include: cardInclude,
  });
  if (!row || !row._count.products) return null;
  const currentPage = Math.max(1, Math.min(10000, Math.trunc(page) || 1));
  const members = await prisma.collectionProduct.findMany({
    where: { collectionId: row.id, product: publishedProduct },
    include: { product: { include: productListInclude } },
    orderBy: [{ sortOrder: "asc" }, { productId: "asc" }],
    take: 24,
    skip: (currentPage - 1) * 24,
  });
  return {
    ...card(row),
    products: members.map((member) => mapProductCard(member.product)),
    page: currentPage,
    pageCount: Math.ceil(row._count.products / 24),
  };
}
export async function getComplements(productId: string) {
  if (!(await collectionsReady())) return [];
  // Manual choices precede shared-collection matches; availability sorts within each tier.
  const ids = await prisma.$queryRaw<{ id: string }[]>`
    WITH candidates AS (
      SELECT "targetId" AS id, 0 AS tier, "sortOrder" AS rank, 0::bigint AS matches FROM "ProductComplement" WHERE "productId" = ${productId}
      UNION ALL
      SELECT cp."productId", 1, MIN(cp."sortOrder"), COUNT(*) FROM "CollectionProduct" source
      JOIN "Collection" c ON c.id = source."collectionId" AND c."isActive"
      JOIN "CollectionProduct" cp ON cp."collectionId" = c.id
      WHERE source."productId" = ${productId} AND cp."productId" <> ${productId} GROUP BY cp."productId"
    ), ranked AS (SELECT DISTINCT ON (id) id, tier, rank, matches FROM candidates ORDER BY id, tier, rank)
    SELECT p.id FROM ranked r JOIN "Product" p ON p.id = r.id JOIN "Category" c ON c.id = p."categoryId"
    WHERE p.id <> ${productId} AND p.status = 'ACTIVE' AND c."isActive"
    ORDER BY r.tier, EXISTS(SELECT 1 FROM "ProductVariant" v WHERE v."productId" = p.id AND v."isActive" AND v.quantity > 0) DESC,
      r.matches DESC, r.rank, p.id LIMIT 4`;
  const products = await prisma.product.findMany({
    where: { id: { in: ids.map((row) => row.id) }, ...publishedProduct },
    include: productListInclude,
  });
  const byId = new Map(
    products.map((product) => [product.id, mapProductCard(product)]),
  );
  return ids.flatMap((row) => (byId.has(row.id) ? [byId.get(row.id)!] : []));
}
