import { NextResponse } from 'next/server';
import { API_ORIGIN } from '@/lib/api';
import { setSession } from '@/lib/session';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { email, password } = body || {};
  if (!email || !password) return NextResponse.json({ ok: false, error: 'email + password required' }, { status: 400 });

  const r = await fetch(`${API_ORIGIN}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) {
    let msg = 'Invalid credentials';
    try { msg = (await r.json()).detail || msg; } catch {}
    return NextResponse.json({ ok: false, error: msg }, { status: r.status });
  }
  const data = await r.json();
  await setSession(data.access_token);
  return NextResponse.json({ ok: true, user: data.user });
}
