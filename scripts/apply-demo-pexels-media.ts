/**
 * Sprint 7A — write direct Pexels demo images into the database.
 *
 *   - Replaces ProductImage rows for the known seeded demo slugs only
 *     (manually-created admin products are never touched).
 *   - Updates Category.imageUrl and Banner.imageUrl with direct Pexels URLs.
 *   - Leaves cloudinaryPublicId as null (Cloudinary migration happens later).
 *
 * Idempotent: re-running produces the same state.
 * Usage: npm run db:demo-media
 */
import path from 'node:path';
import { PrismaClient, type BannerPlacement } from '@prisma/client';
import {
  DEMO_BANNERS,
  DEMO_CATEGORIES,
  DEMO_PRODUCTS,
  bannerImageUrl,
  categoryImageUrl,
  productImageUrl
} from './demo-pexels-media';

function ensureEnvLoaded(): void {
  if (process.env.DATABASE_URL) return;
  const loader = (process as unknown as { loadEnvFile?: (p: string) => void }).loadEnvFile;
  if (typeof loader === 'function') {
    try {
      loader.call(process, path.resolve(process.cwd(), '.env'));
    } catch {
      /* .env is optional when vars are already exported */
    }
  }
}

ensureEnvLoaded();

const prisma = new PrismaClient();

async function main(): Promise<void> {
  let productsUpdated = 0;
  let imagesCreated = 0;
  let categoriesUpdated = 0;
  let bannersUpdated = 0;
  const missing: string[] = [];

  await prisma.$transaction(async (tx) => {
    // Products — replace image rows (seeded slugs only).
    for (const product of DEMO_PRODUCTS) {
      const existing = await tx.product.findUnique({ where: { slug: product.slug }, select: { id: true } });
      if (!existing) {
        missing.push(`product:${product.slug}`);
        continue;
      }
      await tx.productImage.deleteMany({ where: { productId: existing.id } });
      await tx.productImage.createMany({
        data: product.images.map((image, index) => ({
          productId: existing.id,
          url: productImageUrl(image.id),
          alt: image.alt,
          sortOrder: index,
          isPrimary: index === 0,
          cloudinaryPublicId: null
        }))
      });
      productsUpdated += 1;
      imagesCreated += product.images.length;
    }

    // Categories
    for (const category of DEMO_CATEGORIES) {
      const result = await tx.category.updateMany({
        where: { slug: category.slug },
        data: { imageUrl: categoryImageUrl(category.image.id) }
      });
      if (result.count === 0) missing.push(`category:${category.slug}`);
      else categoriesUpdated += result.count;
    }

    // Banners (matched by placement; cloudinaryPublicId intentionally left null)
    for (const banner of DEMO_BANNERS) {
      const result = await tx.banner.updateMany({
        where: { placement: banner.placement as BannerPlacement },
        data: { imageUrl: bannerImageUrl(banner.image.id), cloudinaryPublicId: null }
      });
      if (result.count === 0) missing.push(`banner:${banner.key}(${banner.placement})`);
      else bannersUpdated += result.count;
    }
  }, { maxWait: 15000, timeout: 120000 });

  console.log(
    `Applied demo Pexels media: ${productsUpdated} product(s) / ${imagesCreated} image(s), ` +
      `${categoriesUpdated} category(ies), ${bannersUpdated} banner(s).`
  );
  if (missing.length > 0) {
    console.warn(`Not found in DB (run "npm run db:seed" first?): ${missing.join(', ')}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
