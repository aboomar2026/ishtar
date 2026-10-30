import { PrismaClient, AdminRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

class BootstrapConfigurationError extends Error {}

// Creates staff access only. Never inserts demo products or resets passwords.
const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL });
async function main() {
  if (await prisma.adminUser.findFirst({ where: { role: AdminRole.SUPER_ADMIN, isActive: true }, select: { id: true } })) {
    console.log('Administrator already configured.');
    return;
  }
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email) throw new BootstrapConfigurationError('ADMIN_EMAIL is missing or blank. Add it to the Vercel Production environment.');
  if (!password) throw new BootstrapConfigurationError('ADMIN_PASSWORD is missing. Add it to the Vercel Production environment.');
  if (password.length < 12) throw new BootstrapConfigurationError('ADMIN_PASSWORD must contain at least 12 characters. Update it in Vercel Production and redeploy.');
  const existing = await prisma.adminUser.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new BootstrapConfigurationError('ADMIN_EMAIL belongs to an existing account; restore administrator access in the database.');
  await prisma.adminUser.create({ data: {
    email, passwordHash: await bcrypt.hash(password, 12),
    name: process.env.ADMIN_NAME?.trim() || 'إدارة عشتار', role: AdminRole.SUPER_ADMIN, isActive: true
  } });
  console.log('Initial administrator created. Catalog remains empty.');
}
main().catch((error: unknown) => {
  // Only our fixed configuration messages are safe to print. Database error
  // messages can include connection details or submitted values.
  if (error instanceof BootstrapConfigurationError) {
    console.error(`Administrator setup failed: ${error.message}`);
  } else {
    const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && /^P[0-9]{4}$/.test(error.code) ? ` (${error.code})` : '';
    console.error(`Administrator database operation failed${code}. Check that DIRECT_URL and DATABASE_URL point to the connected Prisma database.`);
  }
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
