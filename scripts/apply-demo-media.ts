/**
 * Apply scripts/demo-media.generated.json to the database:
 *   - replace ProductImage rows for each seeded product (matched by slug)
 *   - update Category.imageUrl
 *   - update Banner.imageUrl + Banner.cloudinaryPublicId (matched by placement)
 *
 * Idempotent: re-running with the same generated file produces the same state.
 * Run scripts/upload-demo-media.ts first to produce the JSON.
 *
 * Usage: npm run media:apply
 */
import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient, type BannerPlacement } from '@prisma/client';

const GENERATED_PATH = path.resolve(process.cwd(), 'scripts', 'demo-media.generated.json');

type GeneratedProductImage = {
  url: string;
  publicId: string;
  alt: string;
  sortOrder: number;
  isPrimary: boolean;
};

type GeneratedMedia = {
  generatedAt: string;
  products: Record<string, GeneratedProductImage[]>;
  categories: Record<string, { url: string; publicId: string }>;
  banners: Record<string, { url: string; publicId: string; placement: string }>;
};

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
  if (!fs.existsSync(GENERATED_PATH)) {
    throw new Error(
      `Missing ${path.relative(process.cwd(), GENERATED_PATH)}. Run "npm run media:upload" first.`
    );
  }

  const data = JSON.parse(fs.readFileSync(GENERATED_PATH, 'utf8')) as GeneratedMedia;

  let productsUpdated = 0;
  let categoriesUpdated = 0;
  let bannersUpdated = 0;
  const missing: string[] = [];

  await prisma.$transaction(async (tx) => {
    // Products: replace image rows so re-runs are clean.
    for (const [slug, images] of Object.entries(data.products)) {
      const product = await tx.product.findUnique({ where: { slug }, select: { id: true } });
      if (!product) {
        missing.push(`product:${slug}`);
        continue;
      }
      await tx.productImage.deleteMany({ where: { productId: product.id } });
      await tx.productImage.createMany({
        data: images.map((image) => ({
          productId: product.id,
          url: image.url,
          alt: image.alt,
          sortOrder: image.sortOrder,
          isPrimary: image.isPrimary,
          cloudinaryPublicId: image.publicId
        }))
      });
      productsUpdated += 1;
    }

    // Categories
    for (const [slug, category] of Object.entries(data.categories)) {
      const result = await tx.category.updateMany({ where: { slug }, data: { imageUrl: category.url } });
      if (result.count === 0) missing.push(`category:${slug}`);
      else categoriesUpdated += result.count;
    }

    // Banners (matched by placement)
    for (const [key, banner] of Object.entries(data.banners)) {
      const result = await tx.banner.updateMany({
        where: { placement: banner.placement as BannerPlacement },
        data: { imageUrl: banner.url, cloudinaryPublicId: banner.publicId }
      });
      if (result.count === 0) missing.push(`banner:${key}(${banner.placement})`);
      else bannersUpdated += result.count;
    }
  });

  console.log(`Updated ${productsUpdated} product(s), ${categoriesUpdated} category(ies), ${bannersUpdated} banner(s).`);
  if (missing.length > 0) {
    console.warn(`Not found in DB (seed first?): ${missing.join(', ')}`);
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
