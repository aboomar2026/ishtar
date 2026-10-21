'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { authenticateAdmin, clearAdminSessionCookie, setAdminSessionCookie } from './admin-auth';

export type LoginState = { error?: string };

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const identifier = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  if (!identifier.trim() || !password) {
    return { error: 'Please enter your email and password.' };
  }

  const payload = await authenticateAdmin(identifier, password);
  if (!payload) {
    return { error: 'Invalid credentials or inactive account.' };
  }

  await setAdminSessionCookie(payload);
  await prisma.adminUser.update({
    where: { id: payload.id },
    data: { lastLoginAt: new Date() }
  });

  redirect('/admin');
}

export async function logoutAction(): Promise<void> {
  await clearAdminSessionCookie();
  redirect('/admin/login');
}
