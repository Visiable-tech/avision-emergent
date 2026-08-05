/**
 * Server proxies for Test Prime attempt flow.
 * The client never sees the JWT — we pull it from the HTTP-only cookie
 * and forward to the backend with `user_id` query param + Authorization.
 */
import { NextResponse } from 'next/server';
import { API_ORIGIN } from '@/lib/api';
import { getSessionToken } from '@/lib/session';

async function currentUserId(token: string): Promise<string | null> {
  const r = await fetch(`${API_ORIGIN}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!r.ok) return null;
  return (await r.json()).user_id || null;
}

async function proxy(req: Request, url: (uid: string) => string, method: 'GET' | 'POST' | 'PATCH' = 'POST') {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
  const uid = await currentUserId(token);
  if (!uid) return NextResponse.json({ ok: false, error: 'session expired' }, { status: 401 });
  const body = method === 'GET' ? undefined : await req.text();
  const r = await fetch(url(uid), {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body,
  });
  const data = await r.json().catch(() => ({}));
  return NextResponse.json(data, { status: r.status });
}

export const attemptStart = (req: Request) => proxy(req, (uid) => `${API_ORIGIN}/api/test-prime/attempts/start?user_id=${uid}`, 'POST');
export const attemptState = (req: Request, id: string) => proxy(req, (uid) => `${API_ORIGIN}/api/test-prime/attempts/${id}/state?user_id=${uid}`, 'PATCH');
export const attemptSubmit = (req: Request, id: string) => proxy(req, (uid) => `${API_ORIGIN}/api/test-prime/attempts/${id}/submit?user_id=${uid}`, 'POST');
export const attemptViolation = (req: Request, id: string) => proxy(req, (uid) => `${API_ORIGIN}/api/test-prime/attempts/${id}/violation?user_id=${uid}`, 'POST');
