/**
 * Upload demo product / category / banner images to Cloudinary at stable public
 * ids, then write scripts/demo-media.generated.json for apply-demo-media.ts.
 *
 * Source resolution per image (first match wins):
 *   1. A manually downloaded file under scripts/source-media/<relPath>.<ext>
 *      (relPath comes from the public id, e.g. products/camel-boutique-bag/01-main).
 *   2. The Pexels API, if PEXELS_API_KEY is set (photo id parsed from the URL).
 *   3. Otherwise the image is skipped (logged), so a partial run is still valid.
 *
 * Usage:
 *   npm run media:upload            # upload everything it can resolve
 *   npm run media:upload -- --dry-run   # show the plan, upload nothing
 *
 * Security: reads CLOUDINARY_* from .env only; never logs secret values.
 */
import fs from 'node:fs';
import path from 'node:path';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import {
  DEMO_BANNER_MEDIA,
  DEMO_CATEGORY_MEDIA,
  DEMO_PRODUCT_MEDIA,
  bannerImagePublicId,
  categoryImagePublicId,
  productImagePublicId,
  sourceMediaRelPath
} from '../src/lib/demo-media-manifest';

const SOURCE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif'];
const SOURCE_DIR = path.resolve(process.cwd(), 'scripts', 'source-media');
const OUTPUT_PATH = path.resolve(process.cwd(), 'scripts', 'demo-media.generated.json');
const DRY_RUN = process.argv.includes('--dry-run');

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
  if (process.env.CLOUDINARY_CLOUD_NAME) return;
  const loader = (process as unknown as { loadEnvFile?: (p: string) => void }).loadEnvFile;
  if (typeof loader === 'function') {
    try {
      loader.call(process, path.resolve(process.cwd(), '.env'));
    } catch {
      /* .env is optional when vars are already exported */
    }
  }
}

function configureCloudinary(): void {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  const missing = [
    ['CLOUDINARY_CLOUD_NAME', cloud_name],
    ['CLOUDINARY_API_KEY', api_key],
    ['CLOUDINARY_API_SECRET', api_secret]
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(`Cloudinary is not configured. Missing env vars: ${missing.join(', ')}`);
  }
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
}

/** Find a manually-downloaded source file for a public id, if present. */
function findLocalSource(publicId: string): string | null {
  const base = path.join(SOURCE_DIR, sourceMediaRelPath(publicId));
  for (const ext of SOURCE_EXTENSIONS) {
    const candidate = `${base}.${ext}`;
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/** Extract the trailing numeric Pexels photo id from a photo page URL. */
function parsePexelsId(pexelsUrl: string): string | null {
  const match = pexelsUrl.match(/-(\d+)\/?$/);
  return match ? match[1] : null;
}

async function fetchPexelsBuffer(pexelsUrl: string, apiKey: string): Promise<Buffer | null> {
  const id = parsePexelsId(pexelsUrl);
  if (!id) {
    console.warn(`  ! Cannot parse a Pexels photo id from ${pexelsUrl} (search URL?) — skipping.`);
    return null;
  }
  const metaRes = await fetch(`https://api.pexels.com/v1/photos/${id}`, {
    headers: { Authorization: apiKey }
  });
  if (!metaRes.ok) {
    console.warn(`  ! Pexels API returned ${metaRes.status} for photo ${id} — skipping.`);
    return null;
  }
  const meta = (await metaRes.json()) as { src?: Record<string, string> };
  const srcUrl = meta.src?.large2x ?? meta.src?.original ?? meta.src?.large;
  if (!srcUrl) {
    console.warn(`  ! Pexels photo ${id} has no usable src — skipping.`);
    return null;
  }
  const imgRes = await fetch(srcUrl);
  if (!imgRes.ok) {
    console.warn(`  ! Failed to download Pexels image ${id} (${imgRes.status}) — skipping.`);
    return null;
  }
  return Buffer.from(await imgRes.arrayBuffer());
}

/** Resolve image bytes for a public id from a local file or the Pexels API. */
async function resolveSource(publicId: string, pexelsUrl: string, pexelsKey?: string): Promise<Buffer | null> {
  const local = findLocalSource(publicId);
  if (local) {
    console.log(`  • source: ${path.relative(process.cwd(), local)}`);
    return fs.readFileSync(local);
  }
  if (pexelsKey) {
    console.log(`  • source: Pexels (${pexelsUrl})`);
    return fetchPexelsBuffer(pexelsUrl, pexelsKey);
  }
  console.warn(`  ! No local file and no PEXELS_API_KEY — skipping ${publicId}.`);
  return null;
}

function uploadBuffer(buffer: Buffer, publicId: string): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        resource_type: 'image',
        overwrite: true,
        invalidate: true
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary upload returned no result'));
          return;
        }
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

async function main(): Promise<void> {
  ensureEnvLoaded();
  const pexelsKey = process.env.PEXELS_API_KEY;

  if (!DRY_RUN) configureCloudinary();

  console.log(DRY_RUN ? 'DRY RUN — no uploads will be performed.\n' : 'Uploading demo media to Cloudinary...\n');

  const output: GeneratedMedia = {
    generatedAt: new Date().toISOString(),
    products: {},
    categories: {},
    banners: {}
  };
  let uploaded = 0;
  let skipped = 0;

  // Products
  for (const productMedia of DEMO_PRODUCT_MEDIA) {
    console.log(`Product: ${productMedia.slug}`);
    const images: GeneratedProductImage[] = [];
    for (const image of productMedia.images) {
      const publicId = productImagePublicId(productMedia.slug, image.role);
      if (DRY_RUN) {
        console.log(`  - ${image.role.padEnd(9)} -> ${publicId}`);
        continue;
      }
      const buffer = await resolveSource(publicId, image.pexelsUrl, pexelsKey);
      if (!buffer) {
        skipped += 1;
        continue;
      }
      const result = await uploadBuffer(buffer, publicId);
      images.push({
        url: result.secure_url,
        publicId: result.public_id,
        alt: image.alt,
        sortOrder: image.sortOrder,
        isPrimary: image.isPrimary
      });
      uploaded += 1;
      console.log(`  ✓ ${image.role} -> ${result.public_id}`);
    }
    if (images.length > 0) output.products[productMedia.slug] = images;
  }

  // Categories
  for (const category of DEMO_CATEGORY_MEDIA) {
    const publicId = categoryImagePublicId(category.slug);
    console.log(`Category: ${category.slug}`);
    if (DRY_RUN) {
      console.log(`  - ${publicId}`);
      continue;
    }
    const buffer = await resolveSource(publicId, category.pexelsUrl, pexelsKey);
    if (!buffer) {
      skipped += 1;
      continue;
    }
    const result = await uploadBuffer(buffer, publicId);
    output.categories[category.slug] = { url: result.secure_url, publicId: result.public_id };
    uploaded += 1;
    console.log(`  ✓ ${result.public_id}`);
  }

  // Banners
  for (const banner of DEMO_BANNER_MEDIA) {
    const publicId = bannerImagePublicId(banner.key);
    console.log(`Banner: ${banner.key}`);
    if (DRY_RUN) {
      console.log(`  - ${publicId}`);
      continue;
    }
    const buffer = await resolveSource(publicId, banner.pexelsUrl, pexelsKey);
    if (!buffer) {
      skipped += 1;
      continue;
    }
    const result = await uploadBuffer(buffer, publicId);
    output.banners[banner.key] = { url: result.secure_url, publicId: result.public_id, placement: banner.placement };
    uploaded += 1;
    console.log(`  ✓ ${result.public_id}`);
  }

  if (DRY_RUN) {
    console.log('\nDry run complete. Re-run without --dry-run to upload.');
    return;
  }

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`\nUploaded ${uploaded} image(s), skipped ${skipped}.`);
  console.log(`Wrote ${path.relative(process.cwd(), OUTPUT_PATH)}.`);
  console.log('Next: npm run media:apply');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
