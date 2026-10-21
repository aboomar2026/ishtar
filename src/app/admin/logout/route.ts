import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_SESSION_COOKIE } from '@/features/admin/auth/admin-session';

/** POST /admin/logout — clear the session cookie and return to login. */
export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/admin/login', request.url));
  response.cookies.delete(ADMIN_SESSION_COOKIE);
  return response;
}
