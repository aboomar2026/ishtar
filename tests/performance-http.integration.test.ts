import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import test from 'node:test';

// Requires an idle production build. Fixture runner cannot accept an external DB.
test('production HTTP uses bounded data and invalidates only public hero settings after an authorized action', { timeout: 90000 }, async () => {
  const output = join(tmpdir(), `ishtar-performance-${randomUUID()}.json`);
  await promisify(execFile)(process.execPath, ['scripts/performance-benchmark.mjs', 'verify', output], { timeout: 85000 });
  const report = JSON.parse(readFileSync(output, 'utf8'));
  assert.equal(report.privacy.unauthenticatedAdminRedirect, true);
  assert.equal(report.privacy.heroTagInvalidationHttp, true);
  const collection = report.results.find((row: { path: string }) => row.path.startsWith('/collections/'));
  assert.ok(collection.warmMedian.dbStatements < 15, 'Metadata must not hydrate another 24-member page');
  const admin = report.results.find((row: { path: string }) => row.path === '/admin/products');
  assert.ok(admin.warmMedian.decodedHtmlBytes < 250000, '100-product fixture must render only one admin page');
});
