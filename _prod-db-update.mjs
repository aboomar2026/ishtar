/**
 * Production / staging DB content update — Saad Center rebrand.
 *
 * Run once against the live database after restoring the Supabase project:
 *
 *   node _prod-db-update.mjs
 *
 * The script self-loads DATABASE_URL from .env.local (or from the environment
 * if you export it before running).  It does NOT touch schema or migrations —
 * only data rows.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ── 1. Load env ─────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?\s*$/);
      if (m) process.env[m[1]] = m[2];
    }
    console.log('Loaded env from .env.local');
  }
}

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not set. Export it or place it in .env.local');
  process.exit(1);
}

// ── 2. Dynamic Prisma import (works with both CJS and ESM output) ────────────
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('\n=== Saad Center — production DB content update ===\n');

  // ── Banners ────────────────────────────────────────────────────────────────
  const heroUpdate = await prisma.banner.updateMany({
    where: { placement: 'HOME_HERO' },
    data: {
      title: 'جمالك يبدأ من سعد سنتر',
      subtitle:
        'مستحضرات تجميل، عطور، عناية وإكسسوارات مختارة بعناية مع لمسات خاصة لتجهيز العرائس.',
      eyebrow: 'SAAD CENTER BEAUTY & BRIDAL',
    },
  });
  console.log(`HOME_HERO banner  → updated ${heroUpdate.count} row(s)`);

  // ── Products ───────────────────────────────────────────────────────────────
  // Camel boutique bag — remove old brand reference
  const bagUpdate = await prisma.product.updateMany({
    where: { slug: 'camel-boutique-bag' },
    data: {
      brand: 'Saad Center Select',
      details: JSON.stringify([
        'جلد ناعم وأنيق',
        'لون كاميل كلاسيكي متعدد الاستخدامات',
        'مناسبة للعمل والسهرات والمناسبات',
        'سعة داخلية مريحة مع جيوب منظمة',
        'مزودة بحزام قابل للتعديل',
      ]),
    },
  });
  console.log(`camel-boutique-bag → updated ${bagUpdate.count} row(s)`);

  // Makeup kit — remove old brand reference from description
  const makeupKit = await prisma.product.findFirst({
    where: { slug: 'daily-makeup-kit' },
    select: { id: true, description: true },
  });
  if (makeupKit) {
    const cleanDesc = (makeupKit.description ?? '').replace(
      /مع هوية باب الحارة/g,
      'من سعد سنتر'
    );
    await prisma.product.update({
      where: { id: makeupKit.id },
      data: { description: cleanDesc },
    });
    console.log('daily-makeup-kit  → description cleaned');
  }

  // ── Admin user display name ────────────────────────────────────────────────
  if (process.env.ADMIN_EMAIL) {
    const adminUpdate = await prisma.adminUser.updateMany({
      where: { email: process.env.ADMIN_EMAIL },
      data: { name: process.env.ADMIN_NAME ?? 'إدارة سعد سنتر' },
    });
    console.log(`Admin user name   → updated ${adminUpdate.count} row(s)`);
  } else {
    console.log('Admin user name   → skipped (ADMIN_EMAIL not set in env)');
  }

  console.log('\n✅ All done. No schema changes were made.\n');
}

run()
  .catch((e) => {
    console.error('\n❌ Script failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
