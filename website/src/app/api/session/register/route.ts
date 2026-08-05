import { NextResponse } from 'next/server';
import { API_ORIGIN } from '@/lib/api';
import { setSession } from '@/lib/session';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { email, password, name, phone, category_id } = body || {};
  if (!email || !password || !name || !phone) {
    return NextResponse.json({ ok: false, error: 'name, email, phone, password all required' }, { status: 400 });
  }
  const r = await fetch(`${API_ORIGIN}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, phone, category_id: category_id || 'banking', language: 'en' }),
  });
  if (!r.ok) {
    let msg = 'Registration failed';
    try { msg = (await r.json()).detail || msg; } catch {}
    return NextResponse.json({ ok: false, error: typeof msg === 'string' ? msg : JSON.stringify(msg) }, { status: r.status });
  }
  const data = await r.json();
  await setSession(data.access_token);
  return NextResponse.json({ ok: true, user: data.user });
}
