import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Marketplace supplies DATABASE_URL (direct) and DATABASE_URL_POOLED (runtime).
// Keep Prisma CLI on the direct endpoint; no Supabase-only variables are needed.
export function deploymentEnvironment(source) {
  if (!source.DATABASE_URL) throw new Error('Connect Prisma Postgres to this Vercel environment before deploying.');
  return { ...source, DIRECT_URL: source.DIRECT_URL || source.DATABASE_URL };
}

export function buildSteps(env) {
  const steps = [['prisma', 'generate']];
  // Preview deployments share the connected database by default. Only production
  // applies schema changes and creates the initial administrator.
  if (env.VERCEL_ENV === 'production' || (env.VERCEL_ENV === 'preview' && env.VERCEL_GIT_COMMIT_REF === 'feature/whatsapp-confirmation-stock-location')) {
    steps.push(['prisma', 'migrate', 'deploy'], ['tsx', 'scripts/bootstrap-admin.ts']);
  }
  steps.push(['next', 'build']);
  return steps;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const env = deploymentEnvironment(process.env);
    for (const [command, ...args] of buildSteps(env)) {
      const result = spawnSync(path.resolve('node_modules', '.bin', command), args, { env, stdio: 'inherit', shell: process.platform === 'win32' });
      if (result.error || result.status !== 0) process.exit(result.status || 1);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Vercel build configuration failed');
    process.exit(1);
  }
}
