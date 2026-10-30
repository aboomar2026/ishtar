import "server-only";
import { prisma } from "@/lib/prisma";
import {
  collectionInput,
  type CollectionInput,
  type ProductOption,
  type CollectionEditorData,
} from "./collections.types";
import { collectionsReady } from "./collections.queries";

export async function getCollectionEditors(): Promise<CollectionEditorData[]> {
  const rows = await prisma.collection.findMany({
    include: {
      products: { where: { product: { deletedAt: null } }, orderBy: [{ sortOrder: "asc" }, { productId: "asc" }] },
    },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  return rows.map((row) => ({
    ...row,
    version: row.updatedAt.toISOString(),
    imageUrl: row.imageUrl ?? "",
    symbol: row.symbol as CollectionInput["symbol"],
    tone: row.tone as CollectionInput["tone"],
    productIds: row.products.map((member) => member.productId),
  }));
}
export async function productOptions(
  q: string,
  ids?: string[],
): Promise<ProductOption[]> {
  const products = await prisma.product.findMany({
    where: { deletedAt: null, ...(ids
      ? { id: { in: ids.slice(0, 200) } }
      : q.trim().length >= 2
        ? {
            OR: [
              {
                name: { contains: q.trim().slice(0, 120), mode: "insensitive" },
              },
              {
                slug: { contains: q.trim().slice(0, 120), mode: "insensitive" },
              },
            ],
          }
        : {}) },
    select: {
      id: true,
      name: true,
      categoryId: true,
      status: true,
      basePrice: true,
      category: { select: { isActive: true } },
      variants: {
        where: { isActive: true },
        select: { price: true, quantity: true },
      },
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        take: 1,
      },
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: ids ? 200 : 20,
  });
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    categoryId: p.categoryId,
    status: p.status === "ACTIVE" && !p.category.isActive ? "HIDDEN" : p.status,
    price: Math.min(
      ...(p.variants.some((v) => v.quantity > 0)
        ? p.variants.filter((v) => v.quantity > 0)
        : p.variants
      ).map((v) => Number(v.price)),
      ...(p.variants.length ? [] : [Number(p.basePrice)]),
    ),
    image: p.images[0]?.url ?? "/mock-products/gift-box.svg",
  }));
}
export async function saveCollection(input: unknown) {
  const parsed = collectionInput.safeParse(input);
  if (!parsed.success)
    throw new Error(
      parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("، "),
    );
  if (!(await collectionsReady()))
    throw new Error("يجب تطبيق SQL المجموعات أولاً.");
  const { id, version, productIds, ...data } = parsed.data;
  return prisma.$transaction(async (tx) => {
    if (
      (await tx.product.count({ where: { deletedAt: null, id: { in: productIds } } })) !==
      productIds.length
    )
      throw new Error("أحد المنتجات حُذف. راجعي الاختيارات.");
    if (
      data.isActive &&
      !(await tx.product.count({
        where: {
          id: { in: productIds },
          deletedAt: null,
          status: "ACTIVE",
          category: { isActive: true },
        },
      }))
    )
      throw new Error("النشر يحتاج منتجاً ظاهراً واحداً على الأقل.");
    let savedId = id;
    if (id) {
      if (!version) throw new Error("أعيدي تحميل المجموعة قبل التعديل.");
      const updated = await tx.collection.updateMany({
        where: { id, updatedAt: new Date(version) },
        data: {
          ...data,
          imageUrl: data.imageUrl || null,
          updatedAt: new Date(
            Math.max(Date.now(), new Date(version).getTime() + 1),
          ),
        },
      });
      if (updated.count !== 1)
        throw new Error(
          "تغيّرت المجموعة في جلسة أخرى. أعيدي تحميل الصفحة قبل الحفظ.",
        );
      await tx.collectionProduct.deleteMany({ where: { collectionId: id } });
    } else {
      savedId = (
        await tx.collection.create({
          data: { ...data, imageUrl: data.imageUrl || null },
        })
      ).id;
    }
    if (productIds.length)
      await tx.collectionProduct.createMany({
        data: productIds.map((productId, sortOrder) => ({
          collectionId: savedId!,
          productId,
          sortOrder,
        })),
      });
    return savedId!;
  });
}

export async function saveProductGroups(
  productId: string,
  groupIds: string[],
  previousIds: string[],
) {
  if (!(await collectionsReady()))
    throw new Error("طبّقي SQL المجموعات أولاً.");
  for (const ids of [groupIds, previousIds])
    if (
      !Array.isArray(ids) ||
      ids.length > 100 ||
      ids.some((id) => typeof id !== "string" || !id || id.length > 100) ||
      new Set(ids).size !== ids.length
    )
      throw new Error("اختيارات غير صالحة.");
  return prisma.$transaction(
    async (tx) => {
      if (!(await tx.product.count({ where: { id: productId, deletedAt: null } }))) throw new Error("المنتج محذوف.");
      const current = await tx.collectionProduct.findMany({
        where: { productId },
        select: { collectionId: true },
      });
      if (
        current
          .map((row) => row.collectionId)
          .sort()
          .join("|") !== [...previousIds].sort().join("|")
      )
        throw new Error("تغيّرت المجموعات. أعيدي تحميل الصفحة قبل الحفظ.");
      if (
        (await tx.collection.count({ where: { id: { in: groupIds } } })) !==
        groupIds.length
      )
        throw new Error("إحدى المجموعات لم تعد موجودة.");
      const changed = [...new Set([...previousIds, ...groupIds])].filter(
        (id) => previousIds.includes(id) !== groupIds.includes(id),
      );
      // Bump collection versions, so a stale full editor cannot undo this membership change.
      for (const collectionId of changed.sort()) {
        await tx.collection.update({
          where: { id: collectionId },
          data: { updatedAt: new Date() },
        });
        if (!groupIds.includes(collectionId))
          await tx.collectionProduct.deleteMany({
            where: { collectionId, productId },
          });
        else {
          if (
            (await tx.collectionProduct.count({ where: { collectionId } })) >=
            200
          )
            throw new Error("الحد الأقصى 200 منتج لكل مجموعة.");
          const maximum = await tx.collectionProduct.aggregate({
            where: { collectionId },
            _max: { sortOrder: true },
          });
          await tx.collectionProduct.create({
            data: {
              collectionId,
              productId,
              sortOrder: (maximum._max.sortOrder ?? -1) + 1,
            },
          });
        }
      }
    },
    { isolationLevel: "Serializable" },
  );
}
