import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Clock, FileText, ChevronRight, ShieldCheck, AlertTriangle, Award } from 'lucide-react';
import { authedGet, fetchMe } from '@/lib/apiAuth';
import StartAttemptButton from '@/components/StartAttemptButton';

export const metadata: Metadata = { title: 'Test preview' };

export default async function TestPreview({ params }: { params: Promise<{ tid: string }> }) {
  const { tid } = await params;
  const [me, tests, ent] = await Promise.all([
    fetchMe(),
    authedGet<any>('/test-prime/tests?limit=200'),
    authedGet<any>(`/test-prime/entitlement?user_id=${(await fetchMe())?.user_id || ''}`).catch(() => null),
  ]);
  const list = tests?.tests || tests?.items || [];
  const t = list.find((x: any) => x.id === tid);
  if (!t) notFound();
  const canAttempt = ent?.is_prime || t.is_free || t.unlocked;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, alignItems: 'flex-start' }}>
      <div>
        <Link href="/portal/tests" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
          ← All tests
        </Link>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <span className="card-tag">{t.exam_name}</span>
          {t.type_label && <span className="card-tag">{t.type_label}</span>}
          {t.is_free && <span className="card-tag" style={{ background: 'rgba(22,163,74,0.1)', color: 'var(--success)' }}>FREE</span>}
        </div>
        <h1 style={{ marginBottom: 12 }}>{t.name}</h1>

        <div style={{ display: 'flex', gap: 24, padding: '20px 0', borderTop: '1px solid var(--divider)', borderBottom: '1px solid var(--divider)', marginBottom: 24, flexWrap: 'wrap' }}>
          <Stat icon={<FileText size={20} />} label="Questions" value={t.questions} />
          <Stat icon={<Award size={20} />} label="Marks" value={t.marks} />
          <Stat icon={<Clock size={20} />} label="Duration" value={`${t.duration_min} min`} />
          {t.language && <Stat icon={<span style={{ fontSize: 14, fontWeight: 900 }}>Aa</span>} label="Language" value={t.language} />}
          {t.difficulty && <Stat icon={<span style={{ fontSize: 14, fontWeight: 900 }}>★</span>} label="Difficulty" value={t.difficulty} />}
        </div>

        <h3>Instructions</h3>
        <ul style={{ paddingLeft: 20, lineHeight: 1.8, color: 'var(--text-2)' }}>
          <li>Timer starts as soon as you click <strong>Start Attempt</strong>. It cannot be paused.</li>
          <li>You can navigate between questions freely. Mark for review with the <strong>M</strong> key.</li>
          <li>Auto-save every ~20 seconds; refresh-safe. Your answers are never lost.</li>
          <li>Tab-switch / fullscreen-exit is logged as a violation.</li>
          <li>Detailed analytics (topic breakdown, percentile, review) available immediately after submission.</li>
        </ul>

        <div style={{ marginTop: 24 }}>
          {canAttempt ? (
            <StartAttemptButton testId={t.id} />
          ) : (
            <Link href="/courses" className="btn btn-primary btn-lg">Activate Test Prime to attempt</Link>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: 20, position: 'sticky', top: 88 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <ShieldCheck size={16} color="var(--brand)" />
          <strong>Fair-test environment</strong>
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
          Your attempt runs in a proctored view. Please close other tabs before starting for the smoothest experience.
        </p>
        <div style={{ padding: 12, background: 'rgba(245,158,11,0.08)', color: '#b45309', borderRadius: 8, display: 'flex', gap: 8, fontSize: 12 }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>Once started, the timer cannot be paused. Make sure you have {t.duration_min} minutes uninterrupted.</span>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: any }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(11,77,184,0.08)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 900 }}>{value}</div>
      </div>
    </div>
  );
}
