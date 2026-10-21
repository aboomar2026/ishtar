'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Prisma, type ProductStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/features/admin/auth/admin-auth';
import { productInputSchema, type ProductInput, type ProductParsed } from './product-admin.validation';

export type ActionIssue = { path: string; message: string };
export type SaveResult = { ok: true; id: string } | { ok: false; message: string; issues: ActionIssue[] };

function fail(message: string, issues: ActionIssue[] = []): SaveResult {
  return { ok: false, message, issues };
}

/** Normalise one primary image: if none flagged, the first becomes primary. */
function withPrimaryImage(images: ProductParsed['images']) {
  if (images.length === 0) return images;
  if (images.some((image) => image.isPrimary)) return images;
  return images.map((image, index) => ({ ...image, isPrimary: index === 0 }));
}


function revalidateProductCatalog(productSlugs: Iterable<string>, categorySlugs: Iterable<string>) {
  revalidatePath('/admin/products');
  revalidatePath('/admin/inventory');
  revalidatePath('/');
  revalidatePath('/category/new-in');
  revalidatePath('/category/sale');
  for (const slug of categorySlugs) revalidatePath(`/category/${slug}`);
  for (const slug of productSlugs) revalidatePath(`/product/${slug}`);
}

const PRODUCT_WRITE_TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 20_000 };

type VariantInventorySnapshot = { id: string; productId: string; quantity: number; sku: string };

function inventoryLogForQuantityDelta(
  variant: VariantInventorySnapshot,
  delta: number,
  note: string
): Prisma.InventoryLogCreateManyInput | null {
  if (delta === 0) return null;
  return {
    productId: variant.productId,
    variantId: variant.id,
    type: 'MANUAL_ADJUSTMENT',
    quantityChange: delta,
    note
  };
}

async function lockProductVariantsForUpdate(tx: Prisma.TransactionClient, productId: string): Promise<void> {
  await tx.$queryRaw(Prisma.sql`SELECT id FROM "ProductVariant" WHERE "productId" = ${productId} FOR UPDATE`);
}

async function assertUniqueSlug(slug: string, ignoreId?: string): Promise<ActionIssue | null> {
  const existing = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  if (existing && existing.id !== ignoreId) {
    return { path: 'slug', message: 'This slug is already used by another product' };
  }
  return null;
}

async function assertUniqueSkus(variants: ProductParsed['variants'], ignoreVariantIds: string[] = []): Promise<ActionIssue[]> {
  const skus = [...new Set(variants.map((variant) => variant.sku.trim()).filter(Boolean))];
  if (skus.length === 0) return [];

  const clashes = await prisma.productVariant.findMany({
    where: {
      sku: { in: skus },
      ...(ignoreVariantIds.length ? { id: { notIn: ignoreVariantIds } } : {})
    },
    select: { sku: true }
  });

  const clashed = new Set(clashes.map((c) => c.sku));
  const issues: ActionIssue[] = [];
  variants.forEach((variant, index) => {
    if (clashed.has(variant.sku)) {
      issues.push({ path: `variants.${index}.sku`, message: `SKU "${variant.sku}" already exists` });
    }
  });
  return issues;
}

function submittedVariantIds(variants: ProductParsed['variants']): string[] {
  return variants.flatMap((variant) => (variant.id ? [variant.id] : []));
}

function variantScalarData(variant: ProductParsed['variants'][number]) {
  return {
    sku: variant.sku,
    colorName: variant.colorName,
    colorValue: variant.colorValue,
    size: variant.size,
    price: variant.price,
    compareAtPrice: variant.compareAtPrice,
    quantity: variant.quantity,
    lowStockThreshold: variant.lowStockThreshold,
    isActive: variant.isActive
  };
}

function toVariantCreateData(variant: ProductParsed['variants'][number]): Prisma.ProductVariantCreateWithoutProductInput {
  return variantScalarData(variant);
}

function toVariantCreateManyData(productId: string, variant: ProductParsed['variants'][number]): Prisma.ProductVariantCreateManyInput {
  return {
    productId,
    ...variantScalarData(variant)
  };
}

function toVariantUpdateData(variant: ProductParsed['variants'][number]): Prisma.ProductVariantUpdateManyMutationInput {
  return variantScalarData(variant);
}

function productScalarData(data: ProductParsed): Prisma.ProductUpdateInput {
  return {
    name: data.name,
    slug: data.slug,
    subtitle: data.subtitle ?? null,
    description: data.description,
    details: data.details,
    careInstructions: data.careInstructions ?? null,
    brand: data.brand ?? null,
    basePrice: data.basePrice,
    compareAtPrice: data.compareAtPrice ?? null,
    status: data.status,
    isFeatured: data.isFeatured,
    isNewArrival: data.isNewArrival,
    isBestSeller: data.isBestSeller,
    tags: data.tags
  };
}

export async function createProductAction(input: ProductInput): Promise<SaveResult> {
  await requireAdmin();

  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail('يرجى تصحيح الحقول المحددة.', parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
  }
  const data = parsed.data;

  const issues: ActionIssue[] = [];
  const slugIssue = await assertUniqueSlug(data.slug);
  if (slugIssue) issues.push(slugIssue);
  issues.push(...(await assertUniqueSkus(data.variants)));
  if (issues.length) return fail('يرجى تصحيح الحقول المحددة.', issues);

  const images = withPrimaryImage(data.images);
  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        ...(productScalarData(data) as Prisma.ProductCreateInput),
        category: { connect: { id: data.categoryId } },
        images: { create: images.map((image, index) => ({ url: image.url, alt: image.alt, sortOrder: image.sortOrder ?? index, isPrimary: image.isPrimary, cloudinaryPublicId: image.cloudinaryPublicId ?? null })) },
        variants: { create: data.variants.map(toVariantCreateData) }
      },
      select: {
        slug: true,
        category: { select: { slug: true } },
        variants: { select: { id: true, productId: true, quantity: true, sku: true } }
      }
    });

    const initialStockLogs = created.variants
      .map((variant) => inventoryLogForQuantityDelta(variant, variant.quantity, 'Initial stock from product creation'))
      .filter((log): log is Prisma.InventoryLogCreateManyInput => Boolean(log));

    if (initialStockLogs.length) {
      await tx.inventoryLog.createMany({ data: initialStockLogs });
    }

    return created;
  }, PRODUCT_WRITE_TRANSACTION_OPTIONS);

  revalidateProductCatalog([product.slug], [product.category.slug]);
  redirect('/admin/products');
}

export async function updateProductAction(id: string, input: ProductInput): Promise<SaveResult> {
  await requireAdmin();

  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true, slug: true, category: { select: { slug: true } } }
  });
  if (!existing) return fail('Product not found.');

  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail('يرجى تصحيح الحقول المحددة.', parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
  }
  const data = parsed.data;

  const issues: ActionIssue[] = [];
  const slugIssue = await assertUniqueSlug(data.slug, id);
  if (slugIssue) issues.push(slugIssue);
  issues.push(...(await assertUniqueSkus(data.variants, submittedVariantIds(data.variants))));
  if (issues.length) return fail('يرجى تصحيح الحقول المحددة.', issues);

  const images = withPrimaryImage(data.images);

  try {
    await prisma.$transaction(async (tx) => {
      // Lock current variants first, then read quantities. This keeps ProductForm
      // quantity edits consistent with the inventory ledger even if another admin
      // adjusts stock at the same time.
      await lockProductVariantsForUpdate(tx, id);

      const existingVariants = await tx.productVariant.findMany({
        where: { productId: id },
        select: { id: true, productId: true, quantity: true, sku: true }
      });
      const existingById = new Map(existingVariants.map((variant) => [variant.id, variant]));
      const incomingIds = submittedVariantIds(data.variants);

      for (const variantId of incomingIds) {
        if (!existingById.has(variantId)) {
          throw new Error('VARIANT_NOT_FOUND_FOR_PRODUCT');
        }
      }

      const incomingIdSet = new Set(incomingIds);
      const removedIds = existingVariants
        .map((variant) => variant.id)
        .filter((variantId) => !incomingIdSet.has(variantId));

      await tx.product.update({
        where: { id },
        data: { ...productScalarData(data), category: { connect: { id: data.categoryId } } }
      });

      // Sync images: replace wholesale (images cascade from product only, safe to rebuild).
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (images.length) {
        await tx.productImage.createMany({
          data: images.map((image, index) => ({
            productId: id,
            url: image.url,
            alt: image.alt ?? null,
            sortOrder: image.sortOrder ?? index,
            isPrimary: image.isPrimary,
            cloudinaryPublicId: image.cloudinaryPublicId ?? null
          }))
        });
      }

      // Never hard-delete ProductVariant rows. Existing variants may be referenced
      // by OrderItem and InventoryLog, so removed rows are only disabled.
      if (removedIds.length) {
        await tx.productVariant.updateMany({
          where: { productId: id, id: { in: removedIds } },
          data: { isActive: false }
        });
      }

      const inventoryLogs: Prisma.InventoryLogCreateManyInput[] = [];
      const existingVariantInputs = data.variants.filter(
        (variant): variant is ProductParsed['variants'][number] & { id: string } => Boolean(variant.id)
      );

      for (const variant of existingVariantInputs) {
        const current = existingById.get(variant.id);
        if (!current) throw new Error('VARIANT_NOT_FOUND_FOR_PRODUCT');

        const delta = variant.quantity - current.quantity;
        const log = inventoryLogForQuantityDelta(
          current,
          delta,
          `Product form quantity adjustment for SKU ${variant.sku}`
        );
        if (log) inventoryLogs.push(log);

        await tx.productVariant.updateMany({
          where: { id: variant.id, productId: id },
          data: toVariantUpdateData(variant)
        });
      }

      const newVariants = data.variants.filter((variant) => !variant.id);
      for (const variant of newVariants) {
        const createdVariant = await tx.productVariant.create({
          data: toVariantCreateManyData(id, variant),
          select: { id: true, productId: true, quantity: true, sku: true }
        });
        const log = inventoryLogForQuantityDelta(
          createdVariant,
          createdVariant.quantity,
          `Initial stock from product form for SKU ${createdVariant.sku}`
        );
        if (log) inventoryLogs.push(log);
      }

      if (inventoryLogs.length) {
        await tx.inventoryLog.createMany({ data: inventoryLogs });
      }
    }, PRODUCT_WRITE_TRANSACTION_OPTIONS);

  } catch (error) {
    if (error instanceof Error && error.message === 'VARIANT_NOT_FOUND_FOR_PRODUCT') {
      return fail('Variant not found for this product. Please refresh the page and try again.');
    }
    throw error;
  }

  const updated = await prisma.product.findUnique({
    where: { id },
    select: { slug: true, category: { select: { slug: true } } }
  });

  revalidatePath(`/admin/products/${id}/edit`);
  revalidateProductCatalog(
    [existing.slug, updated?.slug].filter((slug): slug is string => Boolean(slug)),
    [existing.category.slug, updated?.category.slug].filter((slug): slug is string => Boolean(slug))
  );
  redirect('/admin/products');
}

export async function setProductStatusAction(id: string, status: ProductStatus): Promise<{ ok: boolean; message?: string }> {
  await requireAdmin();

  if (status === 'ACTIVE') {
    const activeVariants = await prisma.productVariant.count({ where: { productId: id, isActive: true } });
    if (activeVariants === 0) {
      return { ok: false, message: 'Cannot activate: product has no active variants.' };
    }
  }

  const product = await prisma.product.update({
    where: { id },
    data: { status },
    select: { slug: true, category: { select: { slug: true } } }
  });
  revalidateProductCatalog([product.slug], [product.category.slug]);
  return { ok: true };
}
