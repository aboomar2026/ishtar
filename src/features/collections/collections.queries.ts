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
  _count: { select: { products: { where: { product: publishedProduct } } } },
} satisfies Prisma.CollectionInclude;
type CollectionRow = Prisma.CollectionGetPayload<{
  include: typeof cardInclude;
}>;
async function cards(rows: CollectionRow[]): Promise<CollectionCardData[]> {
  const automaticIds = rows.filter((row) => !row.imageUrl).map((row) => row.id);
  const images = automaticIds.length
    ? await prisma.$queryRaw<
        { collectionId: string; url: string }[]
      >(Prisma.sql`
    WITH candidates AS (
      SELECT cp."collectionId", cp."productId", cp."sortOrder", p."categoryId", image.url,
        ROW_NUMBER() OVER (PARTITION BY cp."collectionId", p."categoryId" ORDER BY cp."sortOrder", cp."productId") AS category_rank
      FROM "CollectionProduct" cp JOIN "Product" p ON p.id = cp."productId"
      JOIN "Category" c ON c.id = p."categoryId"
      JOIN LATERAL (SELECT url FROM "ProductImage" WHERE "productId" = p.id AND url <> '' ORDER BY "isPrimary" DESC, "sortOrder", id LIMIT 1) image ON true
      WHERE cp."collectionId" IN (${Prisma.join(automaticIds)}) AND p.status = 'ACTIVE' AND c."isActive"
    ), unique_images AS (
      SELECT DISTINCT ON ("collectionId", url) * FROM candidates ORDER BY "collectionId", url, CASE WHEN category_rank = 1 THEN 0 ELSE 1 END, CASE WHEN category_rank = 1 THEN "categoryId" END, "sortOrder", "productId"
    ), ranked AS (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY "collectionId" ORDER BY
        CASE WHEN category_rank = 1 THEN 0 ELSE 1 END,
        CASE WHEN category_rank = 1 THEN "categoryId" END,
        "sortOrder", "productId") AS position FROM unique_images
    ) SELECT "collectionId", url FROM ranked WHERE position <= 3 ORDER BY "collectionId", position
  `)
    : [];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: row.imageUrl,
    symbol: row.symbol,
    tone: row.tone,
    images: images
      .filter((image) => image.collectionId === row.id)
      .map((image) => image.url),
    productCount: row._count.products,
  }));
}
export async function getCollections({
  home = false,
  q = "",
  productId,
  limit = 60,
}: { home?: boolean; q?: string; productId?: string; limit?: number } = {}) {
  if (!(await collectionsReady())) return [];
  const term = normalizeSuggestionQuery(q);
  const literal = term.replace(/[\\%_]/g, (character) => `\\${character}`);
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
              {
                description: {
                  contains: literal,
                  mode: "insensitive" as const,
                },
              },
              { keywords: { has: term } },
            ],
          }
        : {}),
    },
    include: cardInclude,
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    take: Math.min(100, Math.max(1, limit)),
  });
  return cards(rows);
}
export async function getCollection(slug: string, page = 1) {
  if (!(await collectionsReady())) return null;
  const row = await prisma.collection.findFirst({
    where: { slug, isActive: true },
    include: cardInclude,
  });
  if (!row || !row._count.products) return null;
  const pageCount = Math.ceil(row._count.products / 24);
  const currentPage = Math.max(
    1,
    Math.min(pageCount, Number.isFinite(page) ? Math.trunc(page) || 1 : 1),
  );
  const members = await prisma.collectionProduct.findMany({
    where: { collectionId: row.id, product: publishedProduct },
    include: { product: { include: productListInclude } },
    orderBy: [{ sortOrder: "asc" }, { productId: "asc" }],
    take: 24,
    skip: (currentPage - 1) * 24,
  });
  return {
    ...(await cards([row]))[0],
    products: members.map((member) => mapProductCard(member.product)),
    page: currentPage,
    pageCount,
  };
}
export async function getCollectionRecommendations(productId: string) {
  if (!(await collectionsReady()))
    return { products: [], kind: "collection" as const };
  const manual = await prisma.productComplement.findMany({
    where: { productId, target: publishedProduct },
    include: { target: { include: productListInclude } },
    orderBy: [{ sortOrder: "asc" }, { targetId: "asc" }],
    take: 8,
  });
  if (manual.length) {
    // Never blend inferred associations into a manually labelled complementary selection.
    const ordered = [...manual].sort(
      (a, b) =>
        Number(b.target.variants.some((v) => v.quantity > 0)) -
        Number(a.target.variants.some((v) => v.quantity > 0)),
    );
    return {
      products: ordered.slice(0, 4).map((row) => mapProductCard(row.target)),
      kind: "manual" as const,
    };
  }
  const ids = await prisma.$queryRaw<{ id: string }[]>`
    WITH shared AS (
      SELECT cp."productId", MIN(cp."sortOrder") AS rank, COUNT(*) AS matches
      FROM "CollectionProduct" source JOIN "Collection" c ON c.id = source."collectionId" AND c."isActive"
      JOIN "CollectionProduct" cp ON cp."collectionId" = c.id
      WHERE source."productId" = ${productId} AND cp."productId" <> ${productId} GROUP BY cp."productId"
    ), candidates AS (
      SELECT p.id, p."categoryId", shared.rank, shared.matches,
        EXISTS (SELECT 1 FROM "ProductVariant" v WHERE v."productId" = p.id AND v."isActive" AND v.quantity > 0) AS available,
        p."categoryId" = (SELECT "categoryId" FROM "Product" WHERE id = ${productId}) AS same_category
      FROM shared JOIN "Product" p ON p.id = shared."productId" JOIN "Category" c ON c.id = p."categoryId"
      WHERE p.status = 'ACTIVE' AND c."isActive"
    ), ranked AS (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY "categoryId" ORDER BY available DESC, matches DESC, rank, id) AS category_position FROM candidates
    ) SELECT id FROM ranked ORDER BY available DESC, category_position, same_category, matches DESC, rank, id LIMIT 4`;
  const products = await prisma.product.findMany({
    where: { id: { in: ids.map((row) => row.id) }, ...publishedProduct },
    include: productListInclude,
  });
  const byId = new Map(
    products.map((product) => [product.id, mapProductCard(product)]),
  );
  return {
    products: ids.flatMap((row) =>
      byId.has(row.id) ? [byId.get(row.id)!] : [],
    ),
    kind: "collection" as const,
  };
}
