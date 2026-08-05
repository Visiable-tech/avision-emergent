import type { Metadata } from 'next';
import Link from 'next/link';
import { Clipboard, Clock, FileText, Lock, ShieldCheck, ArrowRight } from 'lucide-react';
import { fetchMe } from '@/lib/apiAuth';
import { authedGet } from '@/lib/apiAuth';

export const metadata: Metadata = { title: 'Test Prime' };
export const dynamic = 'force-dynamic';

export default async function TestsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const me = await fetchMe();
  const [ent, tests] = await Promise.all([
    authedGet<any>(`/test-prime/entitlement?user_id=${me?.user_id || ''}`).catch(() => null),
    authedGet<any>(`/test-prime/tests?limit=100${q ? `&q=${encodeURIComponent(q)}` : ''}`).catch(() => null),
  ]);
  const isPrime = !!ent?.is_prime;
  const list = (tests?.tests || tests?.items || []) as any[];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1>Test Prime</h1>
          <p className="text-muted">Real-exam patterns. 25,000+ questions. Detailed analytics after every attempt.</p>
        </div>
        {isPrime ? (
          <div style={{ background: 'rgba(22,163,74,0.08)', color: 'var(--success)', padding: '10px 14px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={16} /> <strong>Prime active</strong>
          </div>
        ) : (
          <Link href="/courses" className="btn btn-primary">Activate Prime <ArrowRight size={14} /></Link>
        )}
      </div>

      {!isPrime && (
        <div className="card" style={{ padding: 20, marginBottom: 24, background: 'rgba(11,77,184,0.06)', border: '1px solid rgba(11,77,184,0.2)' }}>
          <strong>Preview mode:</strong> You can browse tests below. Attempting requires an active Test Prime plan.
        </div>
      )}

      <h3>Available Tests ({list.length})</h3>
      <div className="grid grid-2" style={{ marginTop: 12 }}>
        {list.map((t) => (
          <TestCard key={t.id} t={t} canAttempt={isPrime || t.is_free || t.unlocked} />
        ))}
      </div>
    </div>
  );
}

function TestCard({ t, canAttempt }: { t: any; canAttempt: boolean }) {
  return (
    <Link href={canAttempt ? `/portal/tests/${t.id}` : '#'} className="card" style={{ padding: 20, opacity: canAttempt ? 1 : 0.75, pointerEvents: canAttempt ? 'auto' : 'none' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(11,77,184,0.08)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Clipboard size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ padding: '2px 8px', background: 'var(--surface-2)', color: 'var(--text-2)', fontSize: 10, fontWeight: 800, borderRadius: 20, textTransform: 'uppercase', letterSpacing: 0.4 }}>{t.exam_name}</span>
            {t.is_free && <span style={{ padding: '2px 8px', background: 'rgba(22,163,74,0.1)', color: 'var(--success)', fontSize: 10, fontWeight: 800, borderRadius: 20 }}>FREE</span>}
            {t.type_label && <span style={{ padding: '2px 8px', background: 'rgba(11,77,184,0.08)', color: 'var(--brand)', fontSize: 10, fontWeight: 800, borderRadius: 20 }}>{t.type_label}</span>}
          </div>
          <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 8 }}>{t.name}</div>
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {t.duration_min} min</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FileText size={12} /> {t.questions} Qs · {t.marks} marks</span>
          </div>
        </div>
        {!canAttempt && <Lock size={16} color="var(--muted-light)" />}
      </div>
    </Link>
  );
}
