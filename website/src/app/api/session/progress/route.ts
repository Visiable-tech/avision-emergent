import { NextResponse } from 'next/server';
import { API_ORIGIN } from '@/lib/api';
import { getSessionToken } from '@/lib/session';

/**
 * Server proxy for video progress updates. The client posts here (no JWT
 * exposure) and we attach the HTTP-only cookie's JWT before forwarding to
 * the FastAPI backend.
 * Body: {course_id, lecture_id, watch_seconds, total_seconds, completed}
 */
export async function POST(req: Request) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { course_id, ...rest } = body || {};
  if (!course_id) return NextResponse.json({ ok: false, error: 'course_id required' }, { status: 400 });

  const r = await fetch(`${API_ORIGIN}/api/video-courses/${course_id}/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(rest),
  });
  const data = await r.json().catch(() => ({}));
  return NextResponse.json(data, { status: r.status });
}
