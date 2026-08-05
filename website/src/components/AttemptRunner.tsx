"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, ChevronLeft, ChevronRight, Flag, Send, AlertTriangle, Languages, Calculator, ListChecks, BookOpen } from 'lucide-react';

type QType = 'mcq' | 'msq' | 'tita' | 'passage-mcq';
type Q = {
  id: string;
  q_type?: QType;
  text: string;
  text_hi?: string;
  options: string[];
  options_hi?: string[];
  passage_id?: string;
  passage?: string;
  passage_hi?: string;
  marks: number;
  section: string;
  subject?: string;
  topic?: string;
  difficulty?: string;
};
type Section = {
  name: string;
  total_questions: number;
  total_marks: number;
  duration_sec: number;
  time_left_sec: number;
  started: boolean;
  completed: boolean;
};
type Attempt = {
  attempt_id: string;
  test_id: string;
  test_name: string;
  exam_name: string;
  language: string;
  sections: Section[];
  sectional_timing: boolean;
  total_duration_sec: number;
  total_time_left_sec: number;
  negative_marking: number;
  questions: Q[];
  answers: Record<string, number | number[] | string>;
  marked: string[];
  seen: string[];
  current_index: number;
  violation_count?: number;
};

type Answer = number | number[] | string;

export default function AttemptRunner({ initialAttempt }: { initialAttempt: Attempt }) {
  const router = useRouter();
  const [attempt] = useState<Attempt>(initialAttempt);
  const [idx, setIdx] = useState<number>(initialAttempt.current_index || 0);
  const [answers, setAnswers] = useState<Record<string, Answer>>(initialAttempt.answers || {});
  const [marked, setMarked] = useState<Set<string>>(new Set(initialAttempt.marked || []));
  const [seen, setSeen] = useState<Set<string>>(new Set(initialAttempt.seen || []));
  const [timeLeft, setTimeLeft] = useState<number>(initialAttempt.total_time_left_sec || initialAttempt.total_duration_sec || 3600);
  const [sectionTimes, setSectionTimes] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    (initialAttempt.sections || []).forEach((s) => { map[s.name] = s.time_left_sec ?? s.duration_sec; });
    return map;
  });
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [violation, setViolation] = useState<string | null>(null);
  const [lang, setLang] = useState<'en' | 'hi'>('en');

  const questions = attempt.questions;
  const current = questions[idx];
  const sectional = attempt.sectional_timing === true;

  // Group questions by section
  const bySection = useMemo(() => {
    const groups: { name: string; items: { q: Q; globalIdx: number }[] }[] = [];
    const seenSecs = new Set<string>();
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      let g = groups.find((x) => x.name === q.section);
      if (!g) { g = { name: q.section, items: [] }; groups.push(g); seenSecs.add(q.section); }
      g.items.push({ q, globalIdx: i });
    }
    return groups;
  }, [questions]);

  const currentSection = current?.section || (attempt.sections?.[0]?.name ?? '');

  // Group passages: {passage_id: [globalIdx...]}
  const currentPassageGroup = useMemo(() => {
    if (!current?.passage_id) return null;
    return questions.map((q, i) => ({ q, i })).filter((x) => x.q.passage_id === current.passage_id);
  }, [current, questions]);

  // Mark current as seen
  useEffect(() => {
    if (!current) return;
    setSeen((prev) => {
      if (prev.has(current.id)) return prev;
      const next = new Set(prev); next.add(current.id); return next;
    });
  }, [current?.id]);

  // Global timer
  useEffect(() => {
    const iv = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(iv);
  }, []);

  // Section timer (only ticks when sectional_timing is on)
  useEffect(() => {
    if (!sectional || !currentSection) return;
    const iv = setInterval(() => {
      setSectionTimes((prev) => ({ ...prev, [currentSection]: Math.max(0, (prev[currentSection] ?? 0) - 1) }));
    }, 1000);
    return () => clearInterval(iv);
  }, [sectional, currentSection]);

  // Auto-submit when either global time or (in sectional mode) all sections done
  useEffect(() => {
    if (timeLeft === 0) { void doSubmit(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // Section auto-jump when the current section's timer hits 0
  useEffect(() => {
    if (!sectional) return;
    const t = sectionTimes[currentSection];
    if (t === 0) {
      // find next section with time_left > 0
      const secs = attempt.sections;
      const curIdx = secs.findIndex((s) => s.name === currentSection);
      const next = secs.slice(curIdx + 1).find((s) => (sectionTimes[s.name] ?? 0) > 0);
      if (next) {
        const firstOfNext = questions.findIndex((q) => q.section === next.name);
        if (firstOfNext >= 0) setIdx(firstOfNext);
      } else {
        // no more sections — trigger submit
        void doSubmit(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionTimes[currentSection], sectional]);

  // Persist every 20s + on unload
  const stateRef = useRef({ answers, marked, seen, idx, timeLeft, sectionTimes });
  useEffect(() => { stateRef.current = { answers, marked, seen, idx, timeLeft, sectionTimes }; }, [answers, marked, seen, idx, timeLeft, sectionTimes]);
  useEffect(() => {
    const iv = setInterval(() => { void persist(); }, 20000);
    const beforeUnload = () => { void persist(); };
    window.addEventListener('beforeunload', beforeUnload);
    return () => { clearInterval(iv); window.removeEventListener('beforeunload', beforeUnload); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Anti-cheat: log tab-switch / blur
  useEffect(() => {
    const onVis = () => { if (document.hidden) logViolation('tab_switch', 'Tab hidden / switched'); };
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
      const { answers, marked, seen, idx, timeLeft, sectionTimes } = stateRef.current;
      await fetch(`/api/session/attempt/${attempt.attempt_id}/state`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers, marked: Array.from(marked), seen: Array.from(seen),
          current_index: idx, total_time_left_sec: timeLeft,
          section_times: sectionTimes,
          active_section: questions[idx]?.section,
        }),
      });
    } catch {}
  }, [attempt.attempt_id, questions]);

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
    } catch {
      setSubmitting(false);
      setShowSubmitConfirm(false);
    }
  }, [attempt.attempt_id, persist, router]);

  // Answer setters
  const setMcqAnswer = (qid: string, opt: number) => setAnswers((prev) => ({ ...prev, [qid]: opt }));
  const toggleMsqAnswer = (qid: string, opt: number) => {
    setAnswers((prev) => {
      const raw = prev[qid];
      const list = Array.isArray(raw) ? [...raw] : [];
      const p = list.indexOf(opt);
      if (p >= 0) list.splice(p, 1); else list.push(opt);
      list.sort((a, b) => a - b);
      return { ...prev, [qid]: list };
    });
  };
  const setTitaAnswer = (qid: string, val: string) => setAnswers((prev) => ({ ...prev, [qid]: val }));
  const clearAnswer = (qid: string) => setAnswers((prev) => { const next = { ...prev }; delete next[qid]; return next; });
  const toggleMark = (qid: string) => {
    setMarked((prev) => { const next = new Set(prev); if (next.has(qid)) next.delete(qid); else next.add(qid); return next; });
  };

  const isAnswered = (qid: string): boolean => {
    const a = answers[qid];
    if (a === undefined || a === null) return false;
    if (Array.isArray(a)) return a.length > 0;
    if (typeof a === 'string') return a.trim() !== '';
    return true;
  };

  const stats = useMemo(() => {
    let answered = 0, notAnswered = 0, markedNotAnswered = 0, markedAnswered = 0, notVisited = 0;
    for (const q of questions) {
      const s = seen.has(q.id);
      const a = isAnswered(q.id);
      const m = marked.has(q.id);
      if (!s) notVisited++;
      else if (a && m) markedAnswered++;
      else if (!a && m) markedNotAnswered++;
      else if (a) answered++;
      else notAnswered++;
    }
    return { answered, notAnswered, markedNotAnswered, markedAnswered, notVisited };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, answers, marked, seen]);

  const time = fmt(timeLeft);
  const secTime = sectional ? fmt(sectionTimes[currentSection] ?? 0) : null;
  const critical = timeLeft <= 300;
  const secCritical = sectional && (sectionTimes[currentSection] ?? 0) <= 60;

  const displayText = (t?: string, t_hi?: string) => (lang === 'hi' && t_hi ? t_hi : t) || '';
  const displayOptions = (opts: string[] = [], opts_hi: string[] = []) => {
    if (lang === 'hi' && opts_hi && opts_hi.length === opts.length) return opts_hi;
    return opts;
  };

  const qType: QType = (current?.q_type as QType) || 'mcq';
  const hasPassage = qType === 'passage-mcq' && !!current?.passage;

  return (
    <div style={{ margin: '-32px -40px', minHeight: 'calc(100vh - 68px - 250px)', background: 'var(--bg-alt)' }}>
      {/* Sticky top header */}
      <div style={{ position: 'sticky', top: 68, zIndex: 30, background: '#FFF', borderBottom: '1px solid var(--divider)', padding: '14px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>{attempt.exam_name}</div>
          <div style={{ fontSize: 16, fontWeight: 900 }}>{attempt.test_name}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {sectional && secTime && (
            <div title="Section timer" style={{ background: secCritical ? 'rgba(220,38,38,0.1)' : 'rgba(245,158,11,0.12)', color: secCritical ? 'var(--error)' : '#B45309', padding: '8px 12px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 900, fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
              <Clock size={14} /> Section: {secTime}
            </div>
          )}
          <div title="Total timer" style={{ background: critical ? 'rgba(220,38,38,0.1)' : 'rgba(11,77,184,0.08)', color: critical ? 'var(--error)' : 'var(--brand)', padding: '8px 14px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, fontSize: 18, fontVariantNumeric: 'tabular-nums' }}>
            <Clock size={16} /> {time}
          </div>
          <button
            className="btn btn-outline"
            onClick={() => setLang((l) => (l === 'en' ? 'hi' : 'en'))}
            title="Toggle language (EN/HI)"
            style={{ paddingLeft: 10, paddingRight: 10 }}
          >
            <Languages size={14} /> {lang === 'en' ? 'EN' : 'हिं'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowSubmitConfirm(true)}>
            <Send size={14} /> Submit
          </button>
        </div>
      </div>

      {/* Section tabs — only when multiple sections */}
      {attempt.sections?.length > 1 && (
        <div style={{ background: '#FFF', borderBottom: '1px solid var(--divider)', padding: '10px 40px', display: 'flex', gap: 8, overflowX: 'auto' }}>
          {attempt.sections.map((s) => {
            const firstIdx = questions.findIndex((q) => q.section === s.name);
            const active = s.name === currentSection;
            const timeExpired = sectional && (sectionTimes[s.name] ?? 0) <= 0;
            return (
              <button
                key={s.name}
                disabled={firstIdx < 0 || timeExpired}
                onClick={() => firstIdx >= 0 && setIdx(firstIdx)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 20,
                  border: `1px solid ${active ? 'var(--brand)' : 'var(--divider)'}`,
                  background: active ? 'var(--brand)' : '#FFF',
                  color: active ? '#FFF' : timeExpired ? 'var(--muted)' : 'var(--text)',
                  fontWeight: 800, fontSize: 12,
                  cursor: firstIdx >= 0 && !timeExpired ? 'pointer' : 'not-allowed',
                  whiteSpace: 'nowrap',
                  opacity: timeExpired ? 0.6 : 1,
                }}
                title={sectional ? `${s.name} • ${fmt(sectionTimes[s.name] ?? 0)} left` : s.name}
              >
                {s.name}
                {sectional && (
                  <span style={{ marginLeft: 8, opacity: 0.75, fontSize: 11 }}>· {fmt(sectionTimes[s.name] ?? 0)}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {violation && (
        <div style={{ position: 'fixed', top: 90, left: '50%', transform: 'translateX(-50%)', background: 'var(--error)', color: '#FFF', padding: '10px 16px', borderRadius: 10, zIndex: 40, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} /> Violation logged: {violation}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, padding: '24px 40px' }}>
        {/* Question / passage area */}
        {hasPassage ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card" style={{ padding: 22, maxHeight: 'calc(100vh - 260px)', overflowY: 'auto', position: 'sticky', top: 148 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <BookOpen size={16} color="var(--brand)" />
                <strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--muted)' }}>Passage</strong>
                {currentPassageGroup && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>{currentPassageGroup.length} questions in this set</span>}
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{displayText(current?.passage, current?.passage_hi)}</div>
            </div>
            <div className="card" style={{ padding: 22 }}>
              <QuestionBody
                q={current} idx={idx} totalQuestions={questions.length}
                lang={lang} negative={attempt.negative_marking}
                answer={answers[current.id]}
                onSetMcq={(i) => setMcqAnswer(current.id, i)}
                onToggleMsq={(i) => toggleMsqAnswer(current.id, i)}
                onSetTita={(v) => setTitaAnswer(current.id, v)}
                displayText={displayText} displayOptions={displayOptions}
              />
              <ActionBar
                idx={idx} total={questions.length}
                isMarked={marked.has(current.id)}
                hasAnswer={isAnswered(current.id)}
                onPrev={() => setIdx(Math.max(0, idx - 1))}
                onNext={() => setIdx(Math.min(questions.length - 1, idx + 1))}
                onMark={() => toggleMark(current.id)}
                onClear={() => clearAnswer(current.id)}
              />
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 32 }}>
            {current ? (
              <>
                <QuestionBody
                  q={current} idx={idx} totalQuestions={questions.length}
                  lang={lang} negative={attempt.negative_marking}
                  answer={answers[current.id]}
                  onSetMcq={(i) => setMcqAnswer(current.id, i)}
                  onToggleMsq={(i) => toggleMsqAnswer(current.id, i)}
                  onSetTita={(v) => setTitaAnswer(current.id, v)}
                  displayText={displayText} displayOptions={displayOptions}
                />
                <ActionBar
                  idx={idx} total={questions.length}
                  isMarked={marked.has(current.id)}
                  hasAnswer={isAnswered(current.id)}
                  onPrev={() => setIdx(Math.max(0, idx - 1))}
                  onNext={() => setIdx(Math.min(questions.length - 1, idx + 1))}
                  onMark={() => toggleMark(current.id)}
                  onClear={() => clearAnswer(current.id)}
                />
              </>
            ) : <p>No questions</p>}
          </div>
        )}

        {/* Palette sidebar */}
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
          <div className="card" style={{ padding: 16, maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 10 }}>Question palette</div>
            {bySection.map((g) => (
              <div key={g.name} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-2)', marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{g.name}</span>
                  {sectional && <span style={{ color: 'var(--muted)' }}>{fmt(sectionTimes[g.name] ?? 0)}</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                  {g.items.map(({ q, globalIdx }) => {
                    const isAns = isAnswered(q.id);
                    const isMk = marked.has(q.id);
                    const isSeen = seen.has(q.id);
                    let bg = 'var(--divider)', fg = 'var(--text)';
                    if (isMk && isAns) { bg = '#7C3AED'; fg = '#FFF'; }
                    else if (isMk) { bg = '#F59E0B'; fg = '#FFF'; }
                    else if (isAns) { bg = 'var(--success)'; fg = '#FFF'; }
                    else if (isSeen) { bg = 'var(--error)'; fg = '#FFF'; }
                    const active = idx === globalIdx;
                    // For q_type badge on palette (small icon overlay for special types)
                    const badge = q.q_type === 'tita' ? '№' : q.q_type === 'msq' ? '☰' : q.passage_id ? '¶' : null;
                    return (
                      <button
                        key={q.id}
                        onClick={() => setIdx(globalIdx)}
                        style={{
                          padding: '8px 0',
                          borderRadius: 6,
                          background: bg, color: fg,
                          border: active ? '2px solid var(--brand)' : 'none',
                          fontSize: 11, fontWeight: 900, cursor: 'pointer',
                          position: 'relative',
                        }}
                        title={`Q${globalIdx + 1} • ${q.q_type || 'mcq'}`}
                      >
                        {globalIdx + 1}
                        {badge && <span style={{ position: 'absolute', top: -4, right: -2, fontSize: 9, background: '#111', color: '#fff', width: 12, height: 12, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{badge}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {showSubmitConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="card" style={{ maxWidth: 460, padding: 32, margin: 24 }}>
            <h3>Submit attempt?</h3>
            <p className="text-muted" style={{ marginBottom: 12 }}>Once submitted, you can&apos;t come back to change answers.</p>
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

/* ------------------------- Sub-components ------------------------- */

function QuestionBody({
  q, idx, totalQuestions, lang, negative, answer,
  onSetMcq, onToggleMsq, onSetTita, displayText, displayOptions,
}: {
  q: Q; idx: number; totalQuestions: number; lang: 'en' | 'hi'; negative: number;
  answer: Answer | undefined;
  onSetMcq: (i: number) => void;
  onToggleMsq: (i: number) => void;
  onSetTita: (v: string) => void;
  displayText: (t?: string, t_hi?: string) => string;
  displayOptions: (opts?: string[], opts_hi?: string[]) => string[];
}) {
  const type: QType = (q.q_type as QType) || 'mcq';
  const typeIcon = type === 'tita' ? <Calculator size={12} /> : type === 'msq' ? <ListChecks size={12} /> : null;
  const typeLabel = type === 'tita' ? 'Type-in Answer'
    : type === 'msq' ? 'Multi-select'
    : type === 'passage-mcq' ? 'Passage · MCQ'
    : 'MCQ';
  const opts = displayOptions(q.options, q.options_hi);

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ padding: '3px 10px', background: 'var(--surface-2)', color: 'var(--text-2)', fontSize: 11, fontWeight: 800, borderRadius: 20 }}>{q.section}</span>
        {q.topic && <span style={{ padding: '3px 10px', background: 'var(--surface-2)', color: 'var(--text-2)', fontSize: 11, fontWeight: 800, borderRadius: 20 }}>{q.topic}</span>}
        {q.difficulty && <span style={{ padding: '3px 10px', background: 'rgba(11,77,184,0.08)', color: 'var(--brand)', fontSize: 11, fontWeight: 800, borderRadius: 20 }}>{q.difficulty}</span>}
        <span style={{ padding: '3px 10px', background: '#111', color: '#FFF', fontSize: 11, fontWeight: 800, borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {typeIcon} {typeLabel}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>
          Q{idx + 1} of {totalQuestions} · +{q.marks} {type !== 'tita' && `/ -${negative}`}
        </span>
      </div>

      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, whiteSpace: 'pre-wrap' }}>
        {displayText(q.text, q.text_hi)}
      </div>

      {type === 'mcq' || type === 'passage-mcq' ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {opts.map((opt, i) => {
            const active = answer === i;
            return (
              <label key={i} style={{ display: 'flex', gap: 12, padding: 14, borderRadius: 12, border: `2px solid ${active ? 'var(--brand)' : 'var(--divider)'}`, background: active ? 'rgba(11,77,184,0.06)' : '#FFF', cursor: 'pointer' }}>
                <input type="radio" name={q.id} checked={active} onChange={() => onSetMcq(i)} style={{ marginTop: 3 }} />
                <span style={{ flex: 1, fontSize: 14 }}><strong style={{ marginRight: 6 }}>{String.fromCharCode(65 + i)}.</strong>{opt}</span>
              </label>
            );
          })}
        </div>
      ) : type === 'msq' ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {opts.map((opt, i) => {
            const list = Array.isArray(answer) ? (answer as number[]) : [];
            const active = list.includes(i);
            return (
              <label key={i} style={{ display: 'flex', gap: 12, padding: 14, borderRadius: 12, border: `2px solid ${active ? 'var(--brand)' : 'var(--divider)'}`, background: active ? 'rgba(11,77,184,0.06)' : '#FFF', cursor: 'pointer' }}>
                <input type="checkbox" checked={active} onChange={() => onToggleMsq(i)} style={{ marginTop: 3 }} />
                <span style={{ flex: 1, fontSize: 14 }}><strong style={{ marginRight: 6 }}>{String.fromCharCode(65 + i)}.</strong>{opt}</span>
              </label>
            );
          })}
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Multi-select · No partial marks · Choose ALL correct options exactly.</div>
        </div>
      ) : (
        // TITA
        <div>
          <input
            type="text"
            inputMode="decimal"
            value={typeof answer === 'string' ? answer : ''}
            onChange={(e) => onSetTita(e.target.value)}
            placeholder="Type your answer (numeric)"
            style={{
              width: '100%',
              padding: '14px 16px',
              fontSize: 18,
              fontWeight: 700,
              border: '2px solid var(--divider)',
              borderRadius: 12,
              outline: 'none',
              fontVariantNumeric: 'tabular-nums',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--brand)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--divider)')}
          />
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Type-in-the-Answer · Enter exact numeric value · No negative marking.</div>
        </div>
      )}
    </>
  );
}

function ActionBar({
  idx, total, isMarked, hasAnswer, onPrev, onNext, onMark, onClear,
}: {
  idx: number; total: number; isMarked: boolean; hasAnswer: boolean;
  onPrev: () => void; onNext: () => void; onMark: () => void; onClear: () => void;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 8, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-outline" onClick={onPrev} disabled={idx === 0}><ChevronLeft size={14} /> Prev</button>
        <button className="btn btn-secondary" onClick={onMark}>
          <Flag size={14} /> {isMarked ? 'Unmark' : 'Mark for review'}
        </button>
        <button className="btn btn-secondary" onClick={onClear} disabled={!hasAnswer}>
          Clear response
        </button>
      </div>
      <button className="btn btn-primary" onClick={onNext} disabled={idx === total - 1}>
        Save & Next <ChevronRight size={14} />
      </button>
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
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${h > 0 ? String(h).padStart(2, '0') + ':' : ''}${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}
