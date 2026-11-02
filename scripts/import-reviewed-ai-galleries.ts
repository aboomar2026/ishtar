/**
 * Optional local-only AI gallery importer. Never runs during build/deploy.
 * DRY RUN by default; --apply performs external Cloudinary + DB writes.
 * Source files must be supplied separately (never commit photos or secrets).
 *
 * npx tsx scripts/import-reviewed-ai-galleries.ts --manifest ./gallery-approval.json
 * npx tsx scripts/import-reviewed-ai-galleries.ts --manifest ./gallery-approval.json --apply
 */
import { readFile } from 'node:fs/promises';
import { resolve, isAbsolute, dirname } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';

type Entry = { productId: string; expectedName: string; approved: boolean; images: string[] };
type Manifest = { items: Entry[] };
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const idx = args.indexOf('--manifest');
if (idx < 0 || !args[idx + 1]) throw new Error('Pass --manifest PATH');
const manifestFile = resolve(args[idx + 1]);
const manifest = JSON.parse(await readFile(manifestFile, 'utf8')) as Manifest;
if (!Array.isArray(manifest.items) || manifest.items.length !== 10) {
  throw new Error('Manifest must contain exactly ten products');
}
if (new Set(manifest.items.map(e => e.productId)).size !== 10) throw new Error('Duplicate productId');
const db = new PrismaClient();
try {
  // Preflight all entries and files *before* any writes.
  for (const entry of manifest.items) {
    if (!entry.productId || !entry.expectedName || !Array.isArray(entry.images) || !entry.images.length) {
      throw new Error('Incomplete product mapping');
    }
    if (apply && !entry.approved) throw new Error('Unapproved gallery: ' + entry.expectedName);
    const product = await db.product.findFirst({
      where: { id: entry.productId, deletedAt: null },
      select: { id: true, name: true, slug: true, images: { select: { id: true, isPrimary: true } } }
    });
    if (!product || product.name !== entry.expectedName) throw new Error('Product ID/name mismatch: ' + entry.expectedName);
    if (product.images.length === 0) throw new Error('Missing original image: ' + entry.expectedName);
    for (const file of entry.images) {
      if (isAbsolute(file) || file.includes('..')) throw new Error('Use safe relative image paths');
      const data = await readFile(resolve(dirname(manifestFile), file));
      if (data.byteLength < 10_000 || data.byteLength > 5_000_000) {
        throw new Error('Invalid file size: ' + file);
      }
    }
    console.log((apply ? 'READY' : 'DRY RUN') + ': ' + entry.expectedName + ' + ' + entry.images.length + ' gallery images');
  }
  if (!apply) {
    console.log('No changes were made. Review and approve all ten entries, then run with --apply.');
  } else {
    const required = ['CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET','CLOUDINARY_FOLDER'];
    for (const key of required) if (!process.env[key]) throw new Error('Missing ' + key);
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
    for (const entry of manifest.items) {
      const uploaded: { url: string; publicId: string }[] = [];
      try {
        for (const file of entry.images) {
          const buffer = await readFile(resolve(dirname(manifestFile), file));
          const result = await new Promise<{ secure_url: string; public_id: string }>((ok, fail) => {
            const stream = cloudinary.uploader.upload_stream({
              folder: process.env.CLOUDINARY_FOLDER + '/products',
              resource_type: 'image', overwrite: false,
              allowed_formats: ['jpg','jpeg','png','webp']
            }, (err, result) => err || !result ? fail(err ?? Error('Empty response')) : ok(result));
            stream.end(buffer);
          });
          uploaded.push({ url: result.secure_url, publicId: result.public_id });
        }
        await db.$transaction(async tx => {
          // Only append; preserve every existing product image and original primary.
          const existing = await tx.productImage.findMany({ where: { productId: entry.productId }, select: { sortOrder: true } });
          const firstOrder = Math.max(-1, ...existing.map(x => x.sortOrder)) + 1;
          await tx.productImage.createMany({
            data: uploaded.map((img, i) => ({
              productId: entry.productId, url: img.url, cloudinaryPublicId: img.publicId,
              isPrimary: false, sortOrder: firstOrder + i,
              alt: entry.expectedName + ' — صورة توضيحية مولدة بالذكاء الاصطناعي'
            }))
          });
        });
        console.log('IMPORTED: ' + entry.expectedName);
      } catch (error) {
        // Clean up newly uploaded assets when the DB write fails.
        await Promise.allSettled(uploaded.map(x => cloudinary.uploader.destroy(x.publicId)));
        throw error;
      }
    }
    console.log('Import completed. Review gallery URLs, then revalidate storefront caches.');
  }
} finally {
  await db.$disconnect();
}
