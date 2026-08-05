import type { Metadata } from 'next';
import { Clipboard, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { fetchMe } from '@/lib/apiAuth';
import { authedGet } from '@/lib/apiAuth';

export const metadata: Metadata = { title: 'Test Prime' };

export default async function TestsPage() {
  const me = await fetchMe();
  const tp = await authedGet<any>(`/test-prime/entitlement?user_id=${me?.user_id}`).catch(() => null);

  return (
    <div>
      <h1>Test Prime</h1>
      <p className="text-muted" style={{ marginBottom: 24 }}>Your gateway to 25,000+ practice questions and full-length mocks.</p>

      <div className="card" style={{ padding: 32 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(11,77,184,0.1)', color: 'var(--brand)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Clipboard size={26} />
        </div>
        {tp?.is_prime ? (
          <>
            <h3>You have Test Prime access ✅</h3>
            <p className="text-muted">Your plan: <strong>{tp.plan || 'Test Prime'}</strong>{tp.expires_at ? ` · valid until ${new Date(tp.expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}</p>
            <p className="text-muted" style={{ marginTop: 12 }}>
              Full test-attempt flow (question-by-question, timer, submission) is available on the mobile app today.
              A web-native experience is coming in the next iteration.
            </p>
            <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
              <a href="/" className="btn btn-primary">Open on mobile app <ExternalLink size={14} /></a>
            </div>
          </>
        ) : (
          <>
            <h3>Test Prime is not active</h3>
            <p className="text-muted">Activate Test Prime to unlock 25,000+ questions, 500+ mocks and detailed analytics.</p>
            <div style={{ marginTop: 20 }}>
              <Link href="/courses" className="btn btn-primary">See plans</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
