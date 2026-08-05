import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Circle, Trophy, TrendingUp, Percent, Users, Target, Calculator, ListChecks, BookOpen } from 'lucide-react';
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
  const maxScore = a.max_score ?? (a.sections?.reduce((s: number, x: any) => s + (x.total_marks || 0), 0) || 0);
  const percentage = a.percentage ?? 0;
  const correct = a.correct_count ?? 0;
  const wrong = a.wrong_count ?? 0;
  const unatt = a.unattempted_count ?? 0;
  const total = a.total_questions ?? (correct + wrong + unatt);
  const percentile = a.percentile ?? 0;
  const rank = a.rank;
  const accuracy = a.accuracy ?? 0;

  // Support both new (sectional) & legacy (section_analytics) shape
  const sectional: any[] = a.sectional || a.section_analytics || [];
  // Support both new (difficulty_wise) & legacy (difficulty_analytics)
  const difficulty: any[] = Array.isArray(a.difficulty_wise)
    ? a.difficulty_wise
    : a.difficulty_analytics
      ? Object.entries(a.difficulty_analytics).map(([k, v]: [string, any]) => ({ difficulty: k, ...v }))
      : [];
  const topics: any[] = a.topic_wise || [];
  const review: any[] = a.review || [];

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
          <KpiInline icon={<Target />} value={`${score}`} label={`out of ${maxScore || total}`} sub="Score" />
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
          <div style={{ height: '100%', width: `${Math.min(100, accuracy)}%`, background: 'var(--brand)' }} />
        </div>
      </div>

      {/* Section-wise */}
      {sectional.length ? (
        <>
          <h3>Section-wise performance</h3>
          <div className="grid grid-2" style={{ marginTop: 12, marginBottom: 24 }}>
            {sectional.map((s: any) => {
              const total = s.total || (s.correct + s.wrong + (s.unattempted || 0));
              const maxScore = s.max_score || 0;
              const pct = maxScore ? Math.round((s.score / maxScore) * 100) : (s.percentage || 0);
              return (
                <div key={s.section || s.name} className="card" style={{ padding: 20 }}>
                  <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 8 }}>{s.section || s.name}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--muted)', marginBottom: 10, flexWrap: 'wrap' }}>
                    <span>Score: <strong style={{ color: 'var(--text)' }}>{s.score}{maxScore ? `/${maxScore}` : ''}</strong></span>
                    <span>Correct: <strong style={{ color: 'var(--success)' }}>{s.correct}</strong>/{total}</span>
                    <span>Wrong: <strong style={{ color: 'var(--error)' }}>{s.wrong}</strong></span>
                    {s.accuracy != null && <span>Accuracy: <strong>{s.accuracy}%</strong></span>}
                  </div>
                  <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, pct))}%`, background: 'var(--brand)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {/* Difficulty breakdown */}
      {difficulty.length ? (
        <>
          <h3>Difficulty split</h3>
          <div className="grid grid-3" style={{ marginTop: 12, marginBottom: 24 }}>
            {difficulty.map((d: any) => (
              <div key={d.difficulty} className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>{d.difficulty}</div>
                <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4 }}>{d.correct} / {d.total}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{d.wrong} wrong · {d.accuracy}% accuracy</div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {/* Topic breakdown (top 8) */}
      {topics.length ? (
        <>
          <h3>Topic-wise performance</h3>
          <div className="card" style={{ padding: 0, marginTop: 12, marginBottom: 24, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr 1fr', gap: 0, background: 'var(--surface-2)', padding: '10px 14px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)' }}>
              <div>Topic</div><div>Section</div><div style={{ textAlign: 'right' }}>Correct</div><div style={{ textAlign: 'right' }}>Wrong</div><div style={{ textAlign: 'right' }}>Accuracy</div>
            </div>
            {topics.slice(0, 12).map((t: any, i: number) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr 1fr', gap: 0, padding: '10px 14px', fontSize: 13, borderTop: '1px solid var(--divider)' }}>
                <div style={{ fontWeight: 700 }}>{t.topic}</div>
                <div style={{ color: 'var(--muted)' }}>{t.section}</div>
                <div style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 700 }}>{t.correct}</div>
                <div style={{ textAlign: 'right', color: 'var(--error)', fontWeight: 700 }}>{t.wrong}</div>
                <div style={{ textAlign: 'right', fontWeight: 800 }}>{t.accuracy}%</div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {/* Review section */}
      {review.length ? (
        <>
          <h3>Answer review</h3>
          <p className="text-muted" style={{ marginBottom: 16 }}>Every question with your answer, correct answer and explanation.</p>
          {review.slice(0, 25).map((q: any, i: number) => (
            <ReviewItem key={q.id || i} q={q} i={i} />
          ))}
          {review.length > 25 && (
            <p className="text-muted text-center">Showing 25 of {review.length} questions. Detailed export coming soon.</p>
          )}
        </>
      ) : null}
    </div>
  );
}

function ReviewItem({ q, i }: { q: any; i: number }) {
  const qType = q.q_type || 'mcq';
  const user = q.user;
  const correct = q.correct;
  const status = q.status; // correct | wrong | unattempted
  const statusIcon = status === 'correct' ? <CheckCircle size={16} color="var(--success)" />
    : status === 'wrong' ? <XCircle size={16} color="var(--error)" />
    : <Circle size={16} color="var(--muted-light)" />;
  const typeBadge = qType === 'tita' ? { icon: <Calculator size={10} />, label: 'TITA' }
    : qType === 'msq' ? { icon: <ListChecks size={10} />, label: 'MSQ' }
    : qType === 'passage-mcq' ? { icon: <BookOpen size={10} />, label: 'Passage' }
    : null;

  return (
    <details className="card" style={{ padding: 16, marginBottom: 10 }}>
      <summary style={{ cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
          {statusIcon}
          <span style={{ fontSize: 13, fontWeight: 700, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 640 }}>
            Q{i + 1}. {(q.text || '').slice(0, 100)}{(q.text || '').length > 100 ? '…' : ''}
          </span>
          {typeBadge && (
            <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', padding: '2px 8px', background: '#111', color: '#FFF', borderRadius: 20, fontSize: 10, fontWeight: 800 }}>
              {typeBadge.icon} {typeBadge.label}
            </span>
          )}
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{q.section} · {q.topic || ''}</span>
      </summary>
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--divider)' }}>
        {q.passage && (
          <div style={{ padding: 12, background: 'var(--bg-alt)', borderLeft: '4px solid var(--brand)', borderRadius: 6, marginBottom: 12, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            <strong style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)' }}>Passage</strong>
            <div style={{ marginTop: 6 }}>{q.passage}</div>
          </div>
        )}
        <div style={{ fontSize: 13, marginBottom: 8, whiteSpace: 'pre-wrap' }}><strong>Question:</strong> {q.text}</div>

        {qType === 'tita' ? (
          <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
            <div style={{ padding: '8px 12px', borderRadius: 6, background: 'rgba(22,163,74,0.08)', fontSize: 13 }}>
              <strong>Correct answer:</strong> {String(correct)}
            </div>
            {user != null && user !== '' && (
              <div style={{ padding: '8px 12px', borderRadius: 6, background: status === 'correct' ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.06)', fontSize: 13 }}>
                <strong>Your answer:</strong> {String(user)}
              </div>
            )}
            {(user == null || user === '') && (
              <div style={{ padding: '8px 12px', borderRadius: 6, background: 'var(--surface-2)', fontSize: 13, color: 'var(--muted)' }}>
                Not attempted
              </div>
            )}
          </div>
        ) : qType === 'msq' ? (
          <div style={{ display: 'grid', gap: 4 }}>
            {q.options?.map((opt: string, oi: number) => {
              const isCorrect = Array.isArray(correct) && correct.includes(oi);
              const isUser = Array.isArray(user) && user.includes(oi);
              return (
                <div key={oi} style={{ padding: '6px 10px', borderRadius: 6, background: isCorrect && isUser ? 'rgba(22,163,74,0.14)' : isCorrect ? 'rgba(22,163,74,0.08)' : isUser ? 'rgba(220,38,38,0.06)' : 'transparent', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
                  {isCorrect && <CheckCircle size={12} color="var(--success)" />}
                  {!isCorrect && isUser && <XCircle size={12} color="var(--error)" />}
                  <strong>{String.fromCharCode(65 + oi)}.</strong> <span>{opt}</span>
                </div>
              );
            })}
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Multi-select · Requires exact match to score.</div>
          </div>
        ) : (
          // mcq / passage-mcq
          <div style={{ display: 'grid', gap: 4 }}>
            {q.options?.map((opt: string, oi: number) => {
              const isCorrect = oi === correct;
              const isUser = user === oi;
              return (
                <div key={oi} style={{ padding: '6px 10px', borderRadius: 6, background: isCorrect ? 'rgba(22,163,74,0.08)' : isUser ? 'rgba(220,38,38,0.06)' : 'transparent', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
                  {isCorrect && <CheckCircle size={12} color="var(--success)" />}
                  {!isCorrect && isUser && <XCircle size={12} color="var(--error)" />}
                  <strong>{String.fromCharCode(65 + oi)}.</strong> <span>{opt}</span>
                </div>
              );
            })}
          </div>
        )}

        {q.explanation && (
          <div style={{ marginTop: 10, padding: 10, background: 'var(--bg-alt)', borderRadius: 6, fontSize: 13 }}>
            <strong>Explanation:</strong> {q.explanation}
          </div>
        )}
      </div>
    </details>
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
