import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/session';

export async function POST(req: Request) {
  await clearSession();
  // If the request is a form submit (Accept: text/html), redirect to home.
  // Otherwise (JSON fetch) return json ok.
  const accept = req.headers.get('accept') || '';
  if (accept.includes('text/html')) {
    return NextResponse.redirect(new URL('/', req.url), { status: 303 });
  }
  return NextResponse.json({ ok: true });
}
