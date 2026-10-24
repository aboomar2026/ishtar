/** Never use DATABASE_URL as a fallback: this suite can only use its dedicated local test DB. */
export function concurrencyDatabaseUrl(raw: string | undefined, schema: string): string {
  if (!raw) throw new Error('Set ISHTAR_TEST_POSTGRES_URL for the disposable ishtar_qa_concurrency database; DATABASE_URL is never used.');
  const url = new URL(raw);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname !== '127.0.0.1' || url.pathname !== '/ishtar_qa_concurrency') {
    throw new Error('Concurrency tests require 127.0.0.1/ishtar_qa_concurrency, never a live or remote database.');
  }
  if (!/^qa_[a-f0-9]{32}$/.test(schema)) throw new Error('Invalid isolated test schema');
  url.search = '';
  url.searchParams.set('schema', schema);
  url.searchParams.set('connection_limit', '1');
  url.searchParams.set('sslmode', 'disable');
  return url.href;
}
