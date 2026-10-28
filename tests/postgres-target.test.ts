import assert from 'node:assert/strict';
import test from 'node:test';
import { concurrencyDatabaseUrl } from './runtime/postgres-target';

test('concurrency target refuses production, inherited URLs and unsafe schema names', () => {
  const schema = `qa_${'a'.repeat(32)}`;
  for (const input of [undefined, 'postgresql://example.com/ishtar_qa_concurrency', 'postgresql://127.0.0.1/production', 'https://127.0.0.1/ishtar_qa_concurrency']) {
    assert.throws(() => concurrencyDatabaseUrl(input, schema));
  }
  assert.throws(() => concurrencyDatabaseUrl('postgresql://127.0.0.1/ishtar_qa_concurrency', 'public'));
  const url = new URL(concurrencyDatabaseUrl('postgresql://test:test@127.0.0.1:5432/ishtar_qa_concurrency?schema=public&options=unsafe', schema));
  assert.equal(url.searchParams.get('schema'), schema);
  assert.equal(url.searchParams.has('options'), false);
});
