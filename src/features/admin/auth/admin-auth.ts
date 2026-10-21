import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import type { AdminRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifySessionToken,
  type AdminSessionPayload
} from './admin-session';

const BCRYPT_ROUNDS = 10;

export type AdminSession = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

/** Write the signed session cookie (httpOnly, sameSite=lax, secure in prod). */
export async function setAdminSessionCookie(payload: AdminSessionPayload): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, createSessionToken(payload), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS
  });
}

export async function clearAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

/**
 * Resolve the current admin session: verify the cookie, then confirm the admin
 * still exists and is active. Returns null when there is no valid session.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const payload = verifySessionToken(token);
  if (!payload) return null;

  const admin = await prisma.adminUser.findUnique({
    where: { id: payload.id },
    select: { id: true, name: true, email: true, role: true, isActive: true }
  });

  if (!admin || !admin.isActive) return null;
  return { id: admin.id, name: admin.name, email: admin.email, role: admin.role };
}

/** Guard for protected admin pages/actions: redirects to login when unauthenticated. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  return session;
}

/**
 * Validate credentials against the DB. Returns the session payload on success.
 * Identifier match is case-insensitive so "Admin" === "admin".
 */
export async function authenticateAdmin(
  identifier: string,
  password: string
): Promise<AdminSessionPayload | null> {
  const email = identifier.trim().toLowerCase();
  if (!email || !password) return null;

  const admin = await prisma.adminUser.findFirst({
    where: { email: { equals: email, mode: 'insensitive' }, isActive: true },
    select: { id: true, email: true, role: true, passwordHash: true }
  });

  // Always run a hash comparison to reduce user-enumeration timing differences.
  const hashToCheck = admin?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva';
  const ok = await verifyPassword(password, hashToCheck);
  if (!admin || !ok) return null;

  return { id: admin.id, email: admin.email, role: admin.role };
}
