import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AdminRole } from '@prisma/client';

export const ADMIN_SESSION_COOKIE = 'bah_admin_session';
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type AdminSessionPayload = {
  id: string;
  email: string;
  role: AdminRole;
};

type SignedPayload = AdminSessionPayload & { exp: number };

/**
 * The secret used to sign session cookies. Read from ADMIN_SESSION_SECRET.
 * In development we fall back to a fixed dev secret so the app still boots,
 * but we warn loudly because this must be set for any real deployment.
 */
function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_SESSION_SECRET must be set (>=16 chars) in production.');
  }
  if (!getSessionSecret.warned) {
    console.warn('[admin-auth] ADMIN_SESSION_SECRET not set or too short — using insecure dev fallback.');
    getSessionSecret.warned = true;
  }
  return 'insecure-dev-admin-session-secret-change-me';
}
getSessionSecret.warned = false as boolean;

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function sign(data: string): string {
  return createHmac('sha256', getSessionSecret()).update(data).digest('base64url');
}

/** Create a signed `<payload>.<signature>` token with a baked-in expiry. */
export function createSessionToken(payload: AdminSessionPayload): string {
  const body: SignedPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS
  };
  const encoded = base64UrlEncode(JSON.stringify(body));
  return `${encoded}.${sign(encoded)}`;
}

/** Verify a token's signature + expiry. Returns the session payload or null. */
export function verifySessionToken(token: string | undefined): AdminSessionPayload | null {
  if (!token) return null;
  const dotIndex = token.lastIndexOf('.');
  if (dotIndex <= 0) return null;

  const encoded = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);
  const expected = sign(encoded);

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const body = JSON.parse(base64UrlDecode(encoded)) as SignedPayload;
    if (!body.exp || body.exp < Math.floor(Date.now() / 1000)) return null;
    if (!body.id || !body.email || !body.role) return null;
    return { id: body.id, email: body.email, role: body.role };
  } catch {
    return null;
  }
}
