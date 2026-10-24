"use server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/features/admin/auth/admin-auth";
import { prisma } from "@/lib/prisma";
import { productOptions, saveCollection } from "./collections.admin";
import { collectionsReady } from "./collections.queries";

export async function searchCollectionProducts(q: string) {
  await requireAdmin();
  return productOptions(q);
}
export async function saveCollectionAction(
  input: unknown,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  await requireAdmin();
  try {
    const id = await saveCollection(input);
    revalidatePath("/", "layout");
    return { ok: true, id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError)
      return {
        ok: false,
        message:
          error.code === "P2002"
            ? "رابط المجموعة مستخدم؛ اختاري رابطاً آخر."
            : "تعذّر حفظ المجموعة. أعيدي تحميل الصفحة وحاولي مجدداً.",
      };
    return {
      ok: false,
      message: error instanceof Error ? error.message : "تعذّر الحفظ.",
    };
  }
}
export async function saveProductComplementsAction(
  productId: string,
  targets: string[],
) {
  await requireAdmin();
  if (
    typeof productId !== "string" ||
    !Array.isArray(targets) ||
    targets.length > 8 ||
    targets.some(
      (id) => typeof id !== "string" || id === productId || id.length > 100,
    ) ||
    new Set(targets).size !== targets.length
  )
    return { ok: false, message: "اختيارات غير صالحة." };
  if (!(await collectionsReady()))
    return { ok: false, message: "طبّقي SQL المجموعات أولاً." };
  try {
    await prisma.$transaction(async (tx) => {
      // Lock the source so simultaneous replacements cannot interleave deletes/inserts.
      const source = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM "Product" WHERE id = ${productId} FOR UPDATE`;
      if (
        !source.length ||
        (await tx.product.count({ where: { id: { in: targets } } })) !==
          targets.length
      )
        throw new Error("missing");
      await tx.productComplement.deleteMany({ where: { productId } });
      if (targets.length)
        await tx.productComplement.createMany({
          data: targets.map((targetId, sortOrder) => ({
            productId,
            targetId,
            sortOrder,
          })),
        });
    });
    revalidatePath("/", "layout");
    return { ok: true, message: "تم حفظ المنتجات المكمّلة." };
  } catch {
    return {
      ok: false,
      message: "تعذّر الحفظ. راجعي المنتجات وأعيدي المحاولة.",
    };
  }
}

export async function saveProductGroupsAction(
  productId: string,
  ids: string[],
  previous: string[],
) {
  await requireAdmin();
  if (typeof productId !== "string" || !productId || productId.length > 100)
    return { ok: false, message: "منتج غير صالح." };
  try {
    const { saveProductGroups } = await import("./collections.admin");
    await saveProductGroups(productId, ids, previous);
    revalidatePath("/", "layout");
    return { ok: true, message: "تم حفظ مجموعات المنتج." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Prisma.PrismaClientKnownRequestError
          ? "تغيّرت البيانات؛ أعيدي التحميل وحاولي مجدداً."
          : error instanceof Error
            ? error.message
            : "تعذّر الحفظ.",
    };
  }
}
