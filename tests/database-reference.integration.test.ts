import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('documented additive sequence and archived display-name repair run safely on disposable PostgreSQL', { timeout: 90000 }, async () => {
  const db = new PGlite();
  try {
    await db.exec(execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-empty', '--to-schema-datamodel', 'prisma/schema.prisma', '--script'], { encoding: 'utf8' }));
    await db.exec(`DROP TABLE "CollectionProduct", "ProductComplement", "Collection", "OrderNotificationRead", "OrderNotificationAttempt", "OrderNotification", "HeroSettings";
      ALTER TABLE "Order" DROP COLUMN "checkoutRequestKey", DROP COLUMN "checkoutFingerprint";
      INSERT INTO "AdminUser" (id,name,email,"passwordHash",role,"updatedAt") VALUES
        ('legacy','إدارة سعد سنتر','legacy@example.invalid','isolated-unused-hash','SUPER_ADMIN',NOW()),
        ('custom','اسم مخصص','custom@example.invalid','isolated-unused-hash','CATALOG_MANAGER',NOW());`);
    const adminBefore = (await db.query(`SELECT id,email,"passwordHash",role,"isActive" FROM "AdminUser" ORDER BY id`)).rows;
    for (const path of ['scripts/sql/ishtar-checkout-idempotency.sql', 'prisma/additive/hero-settings.sql', 'prisma/additive/order-notifications.sql', 'scripts/sql/ishtar-notification-rls.sql', 'prisma/additive/collections.sql']) {
      const sql = readFileSync(path, 'utf8'); await db.exec(sql); await db.exec(sql);
    }
    const rename = readFileSync('scripts/sql/ishtar-admin-display-name.sql', 'utf8');
    assert.equal((await db.exec(rename))[0].rows.length, 1);
    assert.equal((await db.exec(rename))[0].rows.length, 0);
    assert.deepEqual((await db.query(`SELECT id,name FROM "AdminUser" ORDER BY id`)).rows, [{ id: 'custom', name: 'اسم مخصص' }, { id: 'legacy', name: 'إدارة عشتار' }]);
    assert.deepEqual((await db.query(`SELECT id,email,"passwordHash",role,"isActive" FROM "AdminUser" ORDER BY id`)).rows, adminBefore);
    const report = await db.exec(readFileSync('scripts/sql/ishtar-database-reference-check.sql', 'utf8'));
    assert.equal(report[0].rows.length, 15);
    assert.ok(report[0].rows.every(row => row.exists));
    assert.equal(report[0].rows.filter(row => row.rls_enabled).length, 6);
    assert.equal(report[1].rows.length, 3);
    assert.equal(report[2].rows.length, 6);
    assert.equal(report[3].rows.length, 3);
    assert.equal((await db.query<{ count: number }>('SELECT COUNT(*)::integer AS count FROM "Order"')).rows[0].count, 0);
  } finally { await db.close(); }
});

test('database ledger links resolve to versioned project references', () => {
  const doc = readFileSync('docs/database/README.md', 'utf8');
  for (const match of doc.matchAll(/\]\(([^)]+)\)/g)) {
    const path = match[1];
    if (!path.startsWith('http')) assert.ok(existsSync(resolve('docs/database', path)), `Missing reference: ${path}`);
  }
});
