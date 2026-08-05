import { notFound } from 'next/navigation';
import { API_ORIGIN } from '@/lib/api';
import { getSessionToken } from '@/lib/session';
import AttemptRunner from '@/components/AttemptRunner';

export const dynamic = 'force-dynamic';

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getSessionToken();
  if (!token) notFound();

  // Fetch current user for user_id query param
  const meRes = await fetch(`${API_ORIGIN}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!meRes.ok) notFound();
  const me = await meRes.json();

  const r = await fetch(`${API_ORIGIN}/api/test-prime/attempts/${id}?user_id=${me.user_id}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
  });
  if (!r.ok) notFound();
  const attempt = await r.json();

  if (attempt?.status === 'submitted') {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <h2>This attempt has already been submitted.</h2>
        <a href={`/portal/attempt/${id}/result`} className="btn btn-primary" style={{ marginTop: 12 }}>View result →</a>
      </div>
    );
  }

  return <AttemptRunner initialAttempt={attempt} />;
}
