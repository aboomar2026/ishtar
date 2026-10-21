"use server";

import { revalidatePath } from "next/cache";
import {
  Prisma,
  type DeliveryFeeStatus,
  type OrderStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/features/admin/auth/admin-auth";
import { calcOrderTotals, roundMoney } from "@/features/orders/order-pricing";
import {
  isAllowedTransition,
  STATUS_TIMESTAMP_FIELD,
} from "./order-admin.validation";

export type OrderActionResult = { ok: true } | { ok: false; message: string };

// Multi-write order mutations run several sequential queries inside one
// interactive transaction. Prisma's default 5s transaction timeout is too tight
// once there is any network latency (e.g. a remote Supabase pooler): the cancel
// + stock-restore path can be dropped mid-transaction with P2028. Use the same
// generous window the checkout transaction already uses.
const ORDER_WRITE_TX_OPTIONS = { maxWait: 10_000, timeout: 20_000 };

function revalidateOrder(id: string) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin");
  revalidatePath("/admin/inventory");
}

function revalidateStorefrontProducts(
  productSlugs: Iterable<string>,
  categorySlugs: Iterable<string>,
) {
  revalidatePath("/");
  revalidatePath("/category/new-in");
  revalidatePath("/category/sale");
  for (const slug of categorySlugs) revalidatePath(`/category/${slug}`);
  for (const slug of productSlugs) revalidatePath(`/product/${slug}`);
}

class OrderTransitionAbort extends Error {
  constructor(message: string) {
    super(message);
  }
}

async function lockOrderForUpdate(
  tx: Prisma.TransactionClient,
  orderId: string,
): Promise<void> {
  await tx.$queryRaw(
    Prisma.sql`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`,
  );
}

export async function updateOrderStatusAction(
  orderId: string,
  toStatus: OrderStatus,
  note?: string,
): Promise<OrderActionResult> {
  await requireAdmin();

  const trimmedNote = note?.trim() || undefined;
  const affectedProductSlugs = new Set<string>();
  const affectedCategorySlugs = new Set<string>();

  try {
    await prisma.$transaction(async (tx) => {
      // Lock the order row before checking the current status. This makes status
      // transitions and stock restoration idempotent under double-clicks or two admins.
      await lockOrderForUpdate(tx, orderId);
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
          orderNumber: true,
          deliveryFeeStatus: true,
        },
      });
      if (!order) throw new OrderTransitionAbort("الطلب غير موجود.");

      const fromStatus = order.status;
      if (fromStatus === toStatus)
        throw new OrderTransitionAbort("Order is already in that status.");
      if (!isAllowedTransition(fromStatus, toStatus)) {
        throw new OrderTransitionAbort(
          `Cannot move an order from ${fromStatus} to ${toStatus}.`,
        );
      }

      if (toStatus === "SHIPPED" && order.deliveryFeeStatus === "PENDING") {
        throw new OrderTransitionAbort(
          "يجب تحديد سعر التوصيل أو اختياره مجانياً قبل تحويل الطلب إلى تم الشحن.",
        );
      }

      if (toStatus === "CANCELED") {
        const items = await tx.orderItem.findMany({
          where: { orderId },
          select: {
            productId: true,
            variantId: true,
            quantity: true,
            product: {
              select: { slug: true, category: { select: { slug: true } } },
            },
          },
        });

        const soldQuantityByProduct = new Map<string, number>();

        // Restore stock exactly once. The locked status transition above prevents
        // two concurrent cancel actions from restoring the same stock twice.
        for (const item of items) {
          soldQuantityByProduct.set(
            item.productId,
            (soldQuantityByProduct.get(item.productId) ?? 0) + item.quantity,
          );
          affectedProductSlugs.add(item.product.slug);
          if (item.product.category?.slug)
            affectedCategorySlugs.add(item.product.category.slug);

          if (!item.variantId) continue;
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { quantity: { increment: item.quantity } },
          });
          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              variantId: item.variantId,
              orderId,
              type: "ORDER_CANCELED",
              quantityChange: item.quantity,
              note: `Canceled order ${order.orderNumber}`,
            },
          });
        }

        for (const [productId, quantity] of soldQuantityByProduct) {
          await tx.$executeRaw(
            Prisma.sql`UPDATE "Product" SET "soldCount" = GREATEST("soldCount" - ${quantity}, 0) WHERE "id" = ${productId}`,
          );
        }

        await tx.order.update({
          where: { id: orderId },
          data: {
            status: "CANCELED",
            canceledAt: new Date(),
            cancelReason: trimmedNote ?? null,
            statusHistory: {
              create: {
                fromStatus,
                toStatus: "CANCELED",
                note: trimmedNote ?? "Order canceled by admin",
              },
            },
          },
        });
        return;
      }

      const timestampField = STATUS_TIMESTAMP_FIELD[toStatus];
      const data: Prisma.OrderUpdateInput = {
        status: toStatus,
        statusHistory: { create: { fromStatus, toStatus, note: trimmedNote } },
      };
      if (timestampField) data[timestampField] = new Date();

      await tx.order.update({ where: { id: orderId }, data });
    }, ORDER_WRITE_TX_OPTIONS);
  } catch (error) {
    if (error instanceof OrderTransitionAbort) {
      return { ok: false, message: error.message };
    }
    throw error;
  }

  revalidateOrder(orderId);
  if (toStatus === "CANCELED")
    revalidateStorefrontProducts(affectedProductSlugs, affectedCategorySlugs);
  return { ok: true };
}

export type DeliveryFeeActionResult =
  | { ok: true }
  | { ok: false; message: string };

export async function updateOrderDeliveryFeeAction(
  orderId: string,
  input: { mode: "SET" | "FREE"; fee?: number | string },
): Promise<DeliveryFeeActionResult> {
  await requireAdmin();

  const mode = input.mode;
  const parsedFee =
    typeof input.fee === "string" ? Number(input.fee) : Number(input.fee ?? 0);
  const nextFee = mode === "FREE" ? 0 : roundMoney(parsedFee);

  if (mode !== "SET" && mode !== "FREE") {
    return { ok: false, message: "طريقة تحديد التوصيل غير صحيحة." };
  }

  if (!Number.isFinite(nextFee) || nextFee < 0) {
    return { ok: false, message: "أدخل سعر توصيل صحيحاً." };
  }

  if (mode === "SET" && nextFee <= 0) {
    return {
      ok: false,
      message: "أدخل سعر توصيل أكبر من صفر، أو اختر اعتماد توصيل مجاني.",
    };
  }

  if (nextFee > 9999) {
    return { ok: false, message: "سعر التوصيل كبير جداً. يرجى مراجعة القيمة." };
  }

  const nextStatus: DeliveryFeeStatus = mode === "FREE" ? "FREE" : "SET";

  try {
    await prisma.$transaction(async (tx) => {
      await lockOrderForUpdate(tx, orderId);
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { id: true, status: true, subtotal: true, discount: true },
      });
      if (!order) throw new OrderTransitionAbort("الطلب غير موجود.");
      if (order.status === "CANCELED") {
        throw new OrderTransitionAbort("لا يمكن تعديل سعر التوصيل لطلب ملغي.");
      }
      if (order.status === "SHIPPED" || order.status === "DELIVERED") {
        throw new OrderTransitionAbort(
          "لا يمكن تعديل سعر التوصيل بعد الشحن أو التسليم.",
        );
      }

      const totals = calcOrderTotals(
        order.subtotal.toNumber(),
        order.discount.toNumber(),
        nextFee,
      );
      await tx.order.update({
        where: { id: orderId },
        data: {
          deliveryFee: totals.deliveryFee,
          deliveryFeeStatus: nextStatus,
          total: totals.total,
        },
      });
    }, ORDER_WRITE_TX_OPTIONS);
  } catch (error) {
    if (error instanceof OrderTransitionAbort)
      return { ok: false, message: error.message };
    throw error;
  }

  revalidateOrder(orderId);
  return { ok: true };
}

export async function updateOrderAdminNoteAction(
  orderId: string,
  adminNote: string,
): Promise<OrderActionResult> {
  await requireAdmin();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true },
  });
  if (!order) return { ok: false, message: "الطلب غير موجود." };
  await prisma.order.update({
    where: { id: orderId },
    data: { adminNote: adminNote.trim() || null },
  });
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}
