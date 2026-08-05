"use server";
/**
 * Cookie-based session helpers for the student web portal.
 * The JWT is stored in an HTTP-only cookie so client-side JS can't touch it.
 */
import { cookies } from 'next/headers';

const COOKIE_NAME = 'avn_session';

export async function setSession(token: string) {
  const c = await cookies();
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearSession() {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}

export async function getSessionToken(): Promise<string | null> {
  const c = await cookies();
  return c.get(COOKIE_NAME)?.value || null;
}
