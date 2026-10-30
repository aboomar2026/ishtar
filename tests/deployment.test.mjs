import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { deploymentEnvironment, buildSteps } from '../scripts/vercel-build.mjs';

test('Marketplace direct URL configures Prisma CLI without changing the runtime pool', () => {
  const input = { DATABASE_URL: 'postgres://direct/db', DATABASE_URL_POOLED: 'postgres://pool/db' };
  assert.equal(deploymentEnvironment(input).DIRECT_URL, input.DATABASE_URL);
  assert.equal(deploymentEnvironment(input).DATABASE_URL_POOLED, input.DATABASE_URL_POOLED);
  assert.equal(input.DIRECT_URL, undefined);
  assert.throws(() => deploymentEnvironment({}), /Connect Prisma Postgres/);
  assert.equal(deploymentEnvironment({ ...input, DIRECT_URL: 'postgres://explicit/db' }).DIRECT_URL, 'postgres://explicit/db');
});

test('production prepares the empty database before building; previews never apply schema or create staff', () => {
  assert.deepEqual(buildSteps({ VERCEL_ENV: 'production' }), [
    ['prisma', 'generate'], ['prisma', 'migrate', 'deploy'], ['tsx', 'scripts/bootstrap-admin.ts'], ['next', 'build']
  ]);
  assert.deepEqual(buildSteps({ VERCEL_ENV: 'preview' }), [['prisma', 'generate'], ['next', 'build']]);
});

test('initial schema creates all application tables on a fresh PostgreSQL database without demo data', async () => {
  const db = new PGlite();
  try {
    await db.exec(readFileSync('prisma/migrations/20261030000000_initial/migration.sql', 'utf8'));
    const { rows } = await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    const tables = rows.map(row => row.tablename);
    for (const name of ['Product', 'Order', 'AdminUser', 'Collection', 'HeroSettings', 'OrderNotification', 'OrderNotificationAttempt']) assert.ok(tables.includes(name), name);
    for (const name of tables) assert.equal((await db.query(`SELECT COUNT(*)::int AS n FROM "${name}"`)).rows[0].n, 0, name);
  } finally { await db.close(); }
});

test('fresh database bootstrap creates a working admin and preserves it on redeploy', { timeout: 60000 }, async () => {
  const { PGLiteSocketServer } = await import('@electric-sql/pglite-socket');
  const { spawn } = await import('node:child_process');
  const bcrypt = (await import('bcryptjs')).default;
  const db = new PGlite();
  let socket;
  try {
    await db.exec(readFileSync('prisma/migrations/20261030000000_initial/migration.sql', 'utf8'));
    socket = new PGLiteSocketServer({ db, host: '127.0.0.1', port: 0, maxConnections: 5 });
    await socket.start();
    const address = socket.getServerConn();
    const url = address.startsWith('postgres') ? address : `postgresql://postgres:test@${address}/postgres`;
    const connection = `${url}${url.includes('?') ? '&' : '?'}connection_limit=1&sslmode=disable`;
    const run = async password => {
      // PGlite has one underlying session across separate socket clients.
      await db.exec('DEALLOCATE ALL');
      return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/bootstrap-admin.ts'], {
        env: { ...process.env, DATABASE_URL: connection, DIRECT_URL: connection, ADMIN_EMAIL: 'Admin@ishtar.example', ADMIN_PASSWORD: password },
        stdio: ['ignore', 'pipe', 'pipe']
      });
      let output = '';
      child.stdout.on('data', chunk => { output += chunk; });
      child.stderr.on('data', chunk => { output += chunk; });
      child.once('error', reject);
      child.once('exit', code => resolve({ code, output }));
      });
    };
    assert.equal((await run('short')).code, 1);
    const first = await run('test-password-long-enough');
    assert.equal(first.code, 0, first.output);
    const before = (await db.query('SELECT * FROM "AdminUser"')).rows[0];
    assert.equal(before.email, 'admin@ishtar.example');
    assert.equal(before.role, 'SUPER_ADMIN');
    assert.equal(await bcrypt.compare('test-password-long-enough', before.passwordHash), true);
    assert.equal((await run('different-password-long-enough')).code, 0);
    assert.deepEqual((await db.query('SELECT * FROM "AdminUser"')).rows, [before]);
    assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM "Product"')).rows[0].n, 0);
  } finally { if (socket) await socket.stop(); await db.close(); }
});
