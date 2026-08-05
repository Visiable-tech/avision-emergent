"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, ChevronLeft, ChevronRight, Flag, Send, AlertTriangle } from 'lucide-react';

type Q = { id: string; text: string; options: string[]; marks: number; section: string; subject?: string; topic?: string; difficulty?: string };
type Attempt = {
  attempt_id: string;
  test_id: string;
  test_name: string;
  exam_name: string;
  language: string;
  sections: { name: string; total_questions: number; total_marks: number; duration_sec: number; time_left_sec: number; started: boolean; completed: boolean }[];
  sectional_timing: boolean;
  total_duration_sec: number;
  total_time_left_sec: number;
  negative_marking: number;
  questions: Q[];
  answers: Record<string, number>;
  marked: string[];
  seen: string[];
  current_index: number;
  violation_count?: number;
};

export default function AttemptRunner({ initialAttempt }: { initialAttempt: Attempt }) {
  const router = useRouter();
  const [attempt, setAttempt] = useState<Attempt>(initialAttempt);
  const [idx, setIdx] = useState<number>(initialAttempt.current_index || 0);
  const [answers, setAnswers] = useState<Record<string, number>>(initialAttempt.answers || {});
  const [marked, setMarked] = useState<Set<string>>(new Set(initialAttempt.marked || []));
  const [seen, setSeen] = useState<Set<string>>(new Set(initialAttempt.seen || []));
  const [timeLeft, setTimeLeft] = useState<number>(initialAttempt.total_time_left_sec || initialAttempt.total_duration_sec || 3600);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [violation, setViolation] = useState<string | null>(null);

  const questions = attempt.questions;
  const current = questions[idx];

  // Mark current as seen
  useEffect(() => {
    if (!current) return;
    setSeen((prev) => {
      if (prev.has(current.id)) return prev;
      const next = new Set(prev); next.add(current.id); return next;
    });
  }, [current?.id]);

  // Timer
  useEffect(() => {
    const iv = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (timeLeft === 0) {
      void doSubmit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // Save state every 20s
  const stateRef = useRef({ answers, marked, seen, idx, timeLeft });
  useEffect(() => { stateRef.current = { answers, marked, seen, idx, timeLeft }; }, [answers, marked, seen, idx, timeLeft]);
  useEffect(() => {
    const iv = setInterval(() => { void persist(); }, 20000);
    const beforeUnload = () => { void persist(); };
    window.addEventListener('beforeunload', beforeUnload);
    return () => { clearInterval(iv); window.removeEventListener('beforeunload', beforeUnload); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Anti-cheat: log tab-switch / blur
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        logViolation('tab_switch', 'Tab hidden / switched');
      }
    };
    const onBlur = () => logViolation('window_blur', 'Window blur');
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback(async () => {
    try {
      const { answers, marked, seen, idx, timeLeft } = stateRef.current;
      await fetch(`/api/session/attempt/${attempt.attempt_id}/state`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers, marked: Array.from(marked), seen: Array.from(seen),
          current_index: idx, total_time_left_sec: timeLeft,
        }),
      });
    } catch {}
  }, [attempt.attempt_id]);

  const logViolation = useCallback(async (type: string, note: string) => {
    setViolation(note);
    setTimeout(() => setViolation(null), 3500);
    try {
      await fetch(`/api/session/attempt/${attempt.attempt_id}/violation`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, note }),
      });
    } catch {}
  }, [attempt.attempt_id]);

  const doSubmit = useCallback(async (auto = false) => {
    setSubmitting(true);
    try {
      await persist();
      const r = await fetch(`/api/session/attempt/${attempt.attempt_id}/submit`, { method: 'POST' });
      if (r.ok) {
        router.push(`/portal/attempt/${attempt.attempt_id}/result${auto ? '?auto=1' : ''}`);
      } else {
        setSubmitting(false);
        setShowSubmitConfirm(false);
        alert('Submit failed. Please try again.');
      }
    } catch (e) {
      setSubmitting(false);
      setShowSubmitConfirm(false);
    }
  }, [attempt.attempt_id, persist, router]);

  const setAnswer = (qid: string, opt: number) => {
    setAnswers((prev) => ({ ...prev, [qid]: opt }));
  };
  const clearAnswer = (qid: string) => {
    setAnswers((prev) => { const next = { ...prev }; delete next[qid]; return next; });
  };
  const toggleMark = (qid: string) => {
    setMarked((prev) => { const next = new Set(prev); if (next.has(qid)) next.delete(qid); else next.add(qid); return next; });
  };

  const stats = useMemo(() => {
    let answered = 0, notAnswered = 0, markedNotAnswered = 0, markedAnswered = 0, notVisited = 0;
    for (const q of questions) {
      const isSeen = seen.has(q.id);
      const isAns = q.id in answers;
      const isMk = marked.has(q.id);
      if (!isSeen) notVisited++;
      else if (isAns && isMk) markedAnswered++;
      else if (!isAns && isMk) markedNotAnswered++;
      else if (isAns) answered++;
      else notAnswered++;
    }
    return { answered, notAnswered, markedNotAnswered, markedAnswered, notVisited };
  }, [questions, answers, marked, seen]);

  const time = fmt(timeLeft);
  const critical = timeLeft <= 300;

  return (
    <div style={{ margin: '-32px -40px', minHeight: 'calc(100vh - 68px - 250px)', background: 'var(--bg-alt)' }}>
      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 68, zIndex: 30, background: '#FFF', borderBottom: '1px solid var(--divider)', padding: '14px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>{attempt.exam_name}</div>
          <div style={{ fontSize: 16, fontWeight: 900 }}>{attempt.test_name}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: critical ? 'rgba(220,38,38,0.1)' : 'rgba(11,77,184,0.08)', color: critical ? 'var(--error)' : 'var(--brand)', padding: '8px 14px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, fontSize: 18, fontVariantNumeric: 'tabular-nums' }}>
            <Clock size={16} /> {time}
          </div>
          <button className="btn btn-primary" onClick={() => setShowSubmitConfirm(true)}>
            <Send size={14} /> Submit
          </button>
        </div>
      </div>

      {violation && (
        <div style={{ position: 'fixed', top: 90, left: '50%', transform: 'translateX(-50%)', background: 'var(--error)', color: '#FFF', padding: '10px 16px', borderRadius: 10, zIndex: 40, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} /> Violation logged: {violation}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, padding: '24px 40px' }}>
        <div className="card" style={{ padding: 32 }}>
          {current ? (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                <span style={{ padding: '3px 10px', background: 'var(--surface-2)', color: 'var(--text-2)', fontSize: 11, fontWeight: 800, borderRadius: 20 }}>{current.section}</span>
                {current.topic && <span style={{ padding: '3px 10px', background: 'var(--surface-2)', color: 'var(--text-2)', fontSize: 11, fontWeight: 800, borderRadius: 20 }}>{current.topic}</span>}
                {current.difficulty && <span style={{ padding: '3px 10px', background: 'rgba(11,77,184,0.08)', color: 'var(--brand)', fontSize: 11, fontWeight: 800, borderRadius: 20 }}>{current.difficulty}</span>}
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>Q{idx + 1} of {questions.length} · +{current.marks} / -{attempt.negative_marking}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, whiteSpace: 'pre-wrap' }}>{current.text}</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {current.options.map((opt, i) => {
                  const active = answers[current.id] === i;
                  return (
                    <label key={i} style={{ display: 'flex', gap: 12, padding: 14, borderRadius: 12, border: `2px solid ${active ? 'var(--brand)' : 'var(--divider)'}`, background: active ? 'rgba(11,77,184,0.06)' : '#FFF', cursor: 'pointer' }}>
                      <input type="radio" name={current.id} checked={active} onChange={() => setAnswer(current.id, i)} style={{ marginTop: 3 }} />
                      <span style={{ flex: 1, fontSize: 14 }}>{opt}</span>
                    </label>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-outline" onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}><ChevronLeft size={14} /> Prev</button>
                  <button className="btn btn-secondary" onClick={() => toggleMark(current.id)}>
                    <Flag size={14} /> {marked.has(current.id) ? 'Unmark' : 'Mark for review'}
                  </button>
                  <button className="btn btn-secondary" onClick={() => clearAnswer(current.id)} disabled={!(current.id in answers)}>
                    Clear response
                  </button>
                </div>
                <button className="btn btn-primary" onClick={() => setIdx(Math.min(questions.length - 1, idx + 1))} disabled={idx === questions.length - 1}>
                  Save & Next <ChevronRight size={14} />
                </button>
              </div>
            </>
          ) : <p>No questions</p>}
        </div>

        <aside style={{ position: 'sticky', top: 148, alignSelf: 'flex-start' }}>
          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11 }}>
              <Legend color="var(--success)" n={stats.answered} label="Answered" />
              <Legend color="var(--error)" n={stats.notAnswered} label="Not answered" />
              <Legend color="#F59E0B" n={stats.markedNotAnswered} label="Marked" />
              <Legend color="#7C3AED" n={stats.markedAnswered} label="Marked+Ans" />
              <Legend color="var(--divider)" n={stats.notVisited} label="Not visited" />
            </div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 10 }}>Question palette</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {questions.map((q, i) => {
                const isAns = q.id in answers;
                const isMk = marked.has(q.id);
                const isSeen = seen.has(q.id);
                let bg = 'var(--divider)', fg = 'var(--text)';
                if (isMk && isAns) { bg = '#7C3AED'; fg = '#FFF'; }
                else if (isMk) { bg = '#F59E0B'; fg = '#FFF'; }
                else if (isAns) { bg = 'var(--success)'; fg = '#FFF'; }
                else if (isSeen) { bg = 'var(--error)'; fg = '#FFF'; }
                const active = idx === i;
                return (
                  <button key={q.id} onClick={() => setIdx(i)} style={{ padding: '8px 0', borderRadius: 6, background: bg, color: fg, border: active ? '2px solid var(--brand)' : 'none', fontSize: 11, fontWeight: 900, cursor: 'pointer' }}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {showSubmitConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="card" style={{ maxWidth: 460, padding: 32, margin: 24 }}>
            <h3>Submit attempt?</h3>
            <p className="text-muted" style={{ marginBottom: 12 }}>Once submitted, you can't come back to change answers.</p>
            <div style={{ display: 'grid', gap: 4, fontSize: 13, marginBottom: 20 }}>
              <div>Answered: <strong style={{ color: 'var(--success)' }}>{stats.answered + stats.markedAnswered}</strong> / {questions.length}</div>
              <div>Marked for review: <strong style={{ color: '#F59E0B' }}>{stats.markedAnswered + stats.markedNotAnswered}</strong></div>
              <div>Not attempted: <strong style={{ color: 'var(--error)' }}>{questions.length - stats.answered - stats.markedAnswered}</strong></div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowSubmitConfirm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => doSubmit(false)} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Yes, submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Legend({ color, n, label }: { color: string; n: number; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 14, height: 14, borderRadius: 3, background: color }} />
      <span><strong>{n}</strong> {label}</span>
    </div>
  );
}

function fmt(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h > 0 ? String(h).padStart(2, '0') + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
