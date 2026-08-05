import { NextResponse } from 'next/server';
import { API_ORIGIN } from '@/lib/api';
import { getSessionToken } from '@/lib/session';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
  const me = await fetch(`${API_ORIGIN}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!me.ok) return NextResponse.json({ ok: false, error: 'session expired' }, { status: 401 });
  const uid = (await me.json()).user_id;

  const r = await fetch(`${API_ORIGIN}/api/test-prime/attempts/${id}?user_id=${uid}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await r.json().catch(() => ({}));
  return NextResponse.json(data, { status: r.status });
}
