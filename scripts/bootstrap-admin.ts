import { PrismaClient, AdminRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Creates staff access only. Never inserts demo products or resets passwords.
const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL });
async function main() {
  if (await prisma.adminUser.findFirst({ where: { role: AdminRole.SUPER_ADMIN, isActive: true }, select: { id: true } })) {
    console.log('Administrator already configured.');
    return;
  }
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error('First deployment requires ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters).');
  }
  const existing = await prisma.adminUser.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new Error('ADMIN_EMAIL belongs to an existing account; restore administrator access in the database.');
  await prisma.adminUser.create({ data: {
    email, passwordHash: await bcrypt.hash(password, 12),
    name: process.env.ADMIN_NAME?.trim() || 'إدارة عشتار', role: AdminRole.SUPER_ADMIN, isActive: true
  } });
  console.log('Initial administrator created. Catalog remains empty.');
}
main().catch(() => {
  console.error('Administrator setup failed. Check database access and initial ADMIN_EMAIL / ADMIN_PASSWORD configuration.');
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
