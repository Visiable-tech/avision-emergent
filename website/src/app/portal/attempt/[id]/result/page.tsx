import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Circle, Trophy, TrendingUp, Percent, Users, Target } from 'lucide-react';
import { API_ORIGIN } from '@/lib/api';
import { getSessionToken } from '@/lib/session';

export const dynamic = 'force-dynamic';

async function fetchAnalytics(id: string) {
  const token = await getSessionToken();
  if (!token) return null;
  const me = await fetch(`${API_ORIGIN}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!me.ok) return null;
  const uid = (await me.json()).user_id;
  const r = await fetch(`${API_ORIGIN}/api/test-prime/attempts/${id}/analytics?user_id=${uid}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
  });
  if (!r.ok) return null;
  return r.json();
}

export default async function AttemptResult({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a: any = await fetchAnalytics(id);
  if (!a) notFound();

  const score = a.score ?? 0;
  const percentage = a.percentage ?? 0;
  const correct = a.correct_count ?? 0;
  const wrong = a.wrong_count ?? 0;
  const unatt = a.unattempted_count ?? 0;
  const total = correct + wrong + unatt;
  const percentile = a.percentile ?? 0;
  const rank = a.rank;
  const accuracy = a.accuracy ?? 0;

  return (
    <div>
      <Link href="/portal/tests" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
        ← Back to tests
      </Link>

      <div style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-2))', color: '#FFF', padding: 32, borderRadius: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Trophy size={20} />
          <span style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6 }}>Result</span>
        </div>
        <h1 style={{ color: '#FFF', marginTop: 8 }}>{a.test_name}</h1>
        <div style={{ opacity: 0.85 }}>{a.exam_name}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 20, marginTop: 24 }}>
          <KpiInline icon={<Target />} value={`${score}`} label={`out of ${a.sections?.reduce((s: number, x: any) => s + (x.total_marks || 0), 0) || total}`} sub="Score" />
          <KpiInline icon={<Percent />} value={`${percentage}%`} label="Percentage" sub="of total marks" />
          <KpiInline icon={<Users />} value={rank ? `#${rank}` : '—'} label={a.exam_name} sub="Estimated rank" />
          <KpiInline icon={<TrendingUp />} value={`${percentile}%`} label="Percentile" sub="among aspirants" />
        </div>
      </div>

      {/* Question breakdown */}
      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <MetricCard icon={<CheckCircle />} value={correct} label="Correct" tone="success" />
        <MetricCard icon={<XCircle />} value={wrong} label="Wrong" tone="error" />
        <MetricCard icon={<Circle />} value={unatt} label="Unattempted" tone="muted" />
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <strong>Accuracy</strong>
          <strong style={{ color: 'var(--brand)' }}>{accuracy}%</strong>
        </div>
        <div style={{ height: 10, background: 'var(--surface-2)', borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${accuracy}%`, background: 'var(--brand)' }} />
        </div>
      </div>

      {/* Section-wise */}
      {a.section_analytics?.length ? (
        <>
          <h3>Section-wise performance</h3>
          <div className="grid grid-2" style={{ marginTop: 12, marginBottom: 24 }}>
            {a.section_analytics.map((s: any) => (
              <div key={s.name} className="card" style={{ padding: 20 }}>
                <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 8 }}>{s.name}</div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
                  <span>Score: <strong style={{ color: 'var(--text)' }}>{s.score}</strong></span>
                  <span>Correct: <strong style={{ color: 'var(--success)' }}>{s.correct}</strong></span>
                  <span>Wrong: <strong style={{ color: 'var(--error)' }}>{s.wrong}</strong></span>
                </div>
                <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${s.percentage || 0}%`, background: 'var(--brand)' }} />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {/* Difficulty breakdown */}
      {a.difficulty_analytics && (
        <>
          <h3>Difficulty split</h3>
          <div className="grid grid-3" style={{ marginTop: 12, marginBottom: 24 }}>
            {Object.entries(a.difficulty_analytics).map(([k, v]: [string, any]) => (
              <div key={k} className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>{k}</div>
                <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4 }}>{v.correct} / {v.total}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{v.wrong} wrong</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Review section */}
      {a.review?.length ? (
        <>
          <h3>Answer review</h3>
          <p className="text-muted" style={{ marginBottom: 16 }}>Every question with your answer, correct answer and explanation.</p>
          {a.review.slice(0, 20).map((q: any, i: number) => (
            <details key={q.id || i} className="card" style={{ padding: 16, marginBottom: 10 }}>
              <summary style={{ cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {q.correct_flag ? <CheckCircle size={16} color="var(--success)" />
                    : q.attempted ? <XCircle size={16} color="var(--error)" />
                    : <Circle size={16} color="var(--muted-light)" />}
                  <span style={{ fontSize: 13, fontWeight: 700, textAlign: 'left' }}>Q{i + 1}. {q.text?.slice(0, 100) || q.q?.slice(0, 100)}…</span>
                </span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{q.section} · {q.topic || ''}</span>
              </summary>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--divider)' }}>
                <div style={{ fontSize: 13, marginBottom: 8, whiteSpace: 'pre-wrap' }}><strong>Question:</strong> {q.text || q.q}</div>
                {q.options?.map((opt: string, oi: number) => (
                  <div key={oi} style={{ padding: '6px 10px', borderRadius: 6, background: oi === q.correct ? 'rgba(22,163,74,0.08)' : oi === q.your_answer ? 'rgba(220,38,38,0.06)' : 'transparent', fontSize: 13, marginBottom: 4 }}>
                    {oi === q.correct && <CheckCircle size={12} color="var(--success)" style={{ marginRight: 6, verticalAlign: 'middle' }} />}
                    {oi === q.your_answer && oi !== q.correct && <XCircle size={12} color="var(--error)" style={{ marginRight: 6, verticalAlign: 'middle' }} />}
                    {opt}
                  </div>
                ))}
                {q.explanation && (
                  <div style={{ marginTop: 10, padding: 10, background: 'var(--bg-alt)', borderRadius: 6, fontSize: 13 }}>
                    <strong>Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            </details>
          ))}
          {a.review.length > 20 && (
            <p className="text-muted text-center">Showing 20 of {a.review.length} questions. Detailed export coming soon.</p>
          )}
        </>
      ) : null}
    </div>
  );
}

function MetricCard({ icon, value, label, tone }: { icon: React.ReactNode; value: number; label: string; tone: 'success' | 'error' | 'muted' }) {
  const c = tone === 'success' ? 'var(--success)' : tone === 'error' ? 'var(--error)' : 'var(--muted)';
  return (
    <div className="card" style={{ padding: 20, display: 'flex', gap: 14, alignItems: 'center' }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: `${c}22`, color: c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 900 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
      </div>
    </div>
  );
}
function KpiInline({ icon, value, label, sub }: any) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.15)', padding: 16, borderRadius: 12, backdropFilter: 'blur(6px)' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', opacity: 0.9 }}>{icon}<span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4 }}>{sub}</span></div>
      <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>{value}</div>
      <div style={{ opacity: 0.85, fontSize: 11 }}>{label}</div>
    </div>
  );
}
