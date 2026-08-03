import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  StatusBar as RNStatusBar,
  Modal,
  Alert,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';

type Q = {
  id: string;
  section: string;
  subject: string;
  topic: string;
  text: string;
  options: string[];
  marks: number;
  difficulty: string;
};

type Attempt = {
  attempt_id: string;
  test_id: string;
  test_name: string;
  exam_name: string;
  sections: {
    name: string;
    total_questions: number;
    total_marks: number;
    duration_sec: number;
    time_left_sec: number;
    started: boolean;
    completed: boolean;
  }[];
  sectional_timing: boolean;
  total_duration_sec: number;
  total_time_left_sec: number;
  questions: Q[];
  answers: Record<string, number>;
  marked: string[];
  seen: string[];
  current_index: number;
  status: string;
};

const STATUS = {
  NOT_VISITED: 'not_visited',
  NOT_ANSWERED: 'not_answered',
  ANSWERED: 'answered',
  MARKED: 'marked',
  MARKED_ANSWERED: 'marked_answered',
} as const;
type QStatus = (typeof STATUS)[keyof typeof STATUS];

const STATUS_COLORS: Record<QStatus, { bg: string; fg: string; label: string }> = {
  not_visited: { bg: '#E5E7EB', fg: '#374151', label: 'Not Visited' },
  not_answered: { bg: '#EF4444', fg: '#FFF', label: 'Not Answered' },
  answered: { bg: '#10B981', fg: '#FFF', label: 'Answered' },
  marked: { bg: '#8B5CF6', fg: '#FFF', label: 'Marked for Review' },
  marked_answered: { bg: '#8B5CF6', fg: '#FFF', label: 'Marked & Answered' },
};

function fmt(sec: number): string {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pp = (n: number) => (n < 10 ? `0${n}` : String(n));
  return h > 0 ? `${pp(h)}:${pp(m)}:${pp(s)}` : `${pp(m)}:${pp(s)}`;
}

export default function CbtAttempt() {
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [activeSection, setActiveSection] = useState<string>('');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [totalLeft, setTotalLeft] = useState(0);
  const [sectionLeft, setSectionLeft] = useState<Record<string, number>>({});
  const [showPalette, setShowPalette] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const lastSaveRef = useRef(Date.now());

  // ==================== LOAD ATTEMPT ====================
  useEffect(() => {
    (async () => {
      if (!attemptId || !user?.user_id) return;
      try {
        const a: Attempt = await api.tpAttempt(attemptId, user.user_id);
        setAttempt(a);
        setAnswers(a.answers || {});
        setMarked(new Set(a.marked || []));
        setSeen(new Set(a.seen || []));
        setCurrent(a.current_index || 0);
        setTotalLeft(a.total_time_left_sec || a.total_duration_sec);
        const initSec: Record<string, number> = {};
        (a.sections || []).forEach((s) => (initSec[s.name] = s.time_left_sec ?? s.duration_sec));
        setSectionLeft(initSec);
        const startSec = a.sections?.find((s) => (s.time_left_sec ?? s.duration_sec) > 0)?.name;
        setActiveSection(startSec || a.sections?.[0]?.name || '');
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to load attempt');
        router.back();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, user?.user_id]);

  // ==================== HANDLE ANDROID BACK ====================
  useEffect(() => {
    const onBack = () => {
      confirmExit();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, marked, seen, totalLeft]);

  // ==================== SECTION SWITCH ON CURRENT CHANGE ====================
  useEffect(() => {
    if (!attempt) return;
    const q = attempt.questions[current];
    if (!q) return;
    if (q.section !== activeSection) setActiveSection(q.section);
    // mark as seen
    if (!seen.has(q.id)) {
      const next = new Set(seen);
      next.add(q.id);
      setSeen(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, attempt]);

  // ==================== TIMER ====================
  useEffect(() => {
    if (!attempt || loading) return;
    const t = setInterval(() => {
      setTotalLeft((prev) => {
        const nxt = prev - 1;
        if (nxt <= 0) {
          clearInterval(t);
          onTimeUp();
          return 0;
        }
        return nxt;
      });
      if (activeSection) {
        setSectionLeft((prev) => {
          const cur = (prev[activeSection] ?? 0) - 1;
          if (cur <= 0 && attempt.sectional_timing) {
            // advance to next uncompleted section
            const secs = attempt.sections;
            const idx = secs.findIndex((s) => s.name === activeSection);
            let nextIdx = -1;
            for (let i = idx + 1; i < secs.length; i++) {
              if ((prev[secs[i].name] ?? 0) > 0) {
                nextIdx = i;
                break;
              }
            }
            if (nextIdx !== -1) {
              const firstQ = attempt.questions.findIndex((q) => q.section === secs[nextIdx].name);
              if (firstQ !== -1) setCurrent(firstQ);
              setActiveSection(secs[nextIdx].name);
            } else {
              onTimeUp();
            }
            return { ...prev, [activeSection]: 0 };
          }
          return { ...prev, [activeSection]: Math.max(0, cur) };
        });
      }
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, activeSection, loading]);

  // ==================== AUTO-SAVE ====================
  useEffect(() => {
    if (!attempt || loading || !user?.user_id) return;
    const t = setInterval(() => {
      saveState();
    }, 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, loading, answers, marked, seen, totalLeft, sectionLeft, current]);

  const saveState = useCallback(async () => {
    if (!attempt || !user?.user_id) return;
    lastSaveRef.current = Date.now();
    try {
      await api.tpSaveState(attempt.attempt_id, user.user_id, {
        answers,
        marked: Array.from(marked),
        seen: Array.from(seen),
        current_index: current,
        total_time_left_sec: totalLeft,
        section_times: sectionLeft,
        active_section: activeSection,
      });
    } catch {}
  }, [attempt, user?.user_id, answers, marked, seen, current, totalLeft, sectionLeft, activeSection]);

  // ==================== STATUS COMPUTATION ====================
  const statusFor = (qid: string): QStatus => {
    const hasAns = qid in answers;
    const isMarked = marked.has(qid);
    if (isMarked && hasAns) return STATUS.MARKED_ANSWERED;
    if (isMarked) return STATUS.MARKED;
    if (hasAns) return STATUS.ANSWERED;
    if (seen.has(qid)) return STATUS.NOT_ANSWERED;
    return STATUS.NOT_VISITED;
  };

  const counts = useMemo(() => {
    const c = { answered: 0, not_answered: 0, not_visited: 0, marked: 0, marked_answered: 0 };
    if (!attempt) return c;
    attempt.questions.forEach((q) => {
      const st = statusFor(q.id);
      c[st] += 1;
    });
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, answers, marked, seen]);

  // ==================== ACTIONS ====================
  const pickOption = (idx: number) => {
    if (!attempt) return;
    const q = attempt.questions[current];
    setAnswers((p) => ({ ...p, [q.id]: idx }));
  };

  const clearResponse = () => {
    if (!attempt) return;
    const q = attempt.questions[current];
    setAnswers((p) => {
      const n = { ...p };
      delete n[q.id];
      return n;
    });
  };

  const navigateTo = (idx: number) => {
    if (!attempt) return;
    if (idx < 0 || idx >= attempt.questions.length) return;
    const target = attempt.questions[idx];
    if (attempt.sectional_timing && target.section !== activeSection) {
      Alert.alert('Locked', 'Sectional timing is enabled. You cannot jump to another section until its time expires.');
      return;
    }
    setCurrent(idx);
    setShowPalette(false);
  };

  const saveAndNext = () => {
    navigateTo(current + 1);
  };

  const markAndNext = () => {
    if (!attempt) return;
    const q = attempt.questions[current];
    setMarked((prev) => {
      const n = new Set(prev);
      if (n.has(q.id)) n.delete(q.id);
      else n.add(q.id);
      return n;
    });
    setTimeout(() => navigateTo(current + 1), 30);
  };

  const previous = () => navigateTo(current - 1);

  const confirmExit = () => {
    Alert.alert('Exit Test?', 'Your progress will be saved. You can resume later, but the timer keeps running.', [
      { text: 'Continue Test', style: 'cancel' },
      {
        text: 'Save & Exit',
        style: 'destructive',
        onPress: async () => {
          await saveState();
          router.back();
        },
      },
    ]);
  };

  const onTimeUp = async () => {
    if (submitting) return;
    Alert.alert('Time Up!', 'Your test has been auto-submitted.');
    await handleSubmit(true);
  };

  const handleSubmit = async (auto = false) => {
    if (!attempt || !user?.user_id || submitting) return;
    setSubmitting(true);
    try {
      await saveState();
      await api.tpSubmitAttempt(attempt.attempt_id, user.user_id);
      setSubmitting(false);
      setShowSubmit(false);
      router.replace(`/test-prime/result/${attempt.attempt_id}` as any);
    } catch (err: any) {
      setSubmitting(false);
      Alert.alert('Submit failed', err?.message || 'Try again');
    }
  };

  // ==================== RENDER ====================
  if (loading || !attempt) {
    return (
      <View style={s.loading}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color="#2563EB" size="large" />
        <Text style={{ color: '#64748B', marginTop: 12, fontWeight: '600' }}>Preparing your test…</Text>
      </View>
    );
  }

  const q = attempt.questions[current];
  const userAns = answers[q.id];
  const isMarked = marked.has(q.id);
  const activeSecMeta = attempt.sections.find((s) => s.name === activeSection);
  void activeSecMeta;

  const questionsInSection = attempt.questions
    .map((qq, i) => ({ qq, i }))
    .filter((x) => x.qq.section === activeSection);
  const sectionIndex = questionsInSection.findIndex((x) => x.i === current) + 1;

  return (
    <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      {/* ============ TOP BAR ============ */}
      <LinearGradient colors={['#1E3A8A', '#2563EB']} style={s.topBar}>
        <SafeAreaView edges={['top']}>
          <View style={s.topBarRow}>
            <Pressable onPress={confirmExit} testID="cbt-exit" hitSlop={10} style={s.iconBtn}>
              <Ionicons name="close" size={22} color="#FFF" />
            </Pressable>
            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <Text style={s.testName} numberOfLines={1}>{attempt.test_name}</Text>
              <Text style={s.testSub} numberOfLines={1}>{attempt.exam_name}</Text>
            </View>
            <View style={s.timerPill}>
              <Ionicons name="time-outline" size={14} color="#F59E0B" />
              <Text style={s.timerTxt}>{fmt(totalLeft)}</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* ============ SECTION TABS ============ */}
      <View style={s.secBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
          {attempt.sections.map((sec) => {
            const active = sec.name === activeSection;
            const secTime = sectionLeft[sec.name] ?? sec.duration_sec;
            const disabled = attempt.sectional_timing && !active;
            return (
              <Pressable
                key={sec.name}
                onPress={() => {
                  if (disabled) return;
                  const firstQ = attempt.questions.findIndex((qq) => qq.section === sec.name);
                  if (firstQ !== -1) setCurrent(firstQ);
                }}
                style={[s.secChip, active && s.secChipActive, disabled && { opacity: 0.55 }]}
                testID={`cbt-sec-${sec.name}`}
              >
                <Text style={[s.secChipName, active && { color: '#FFF' }]} numberOfLines={1}>
                  {sec.name}
                </Text>
                <View style={[s.secTimer, active && { backgroundColor: 'rgba(255,255,255,0.28)' }]}>
                  <Ionicons name="time-outline" size={10} color={active ? '#FFF' : '#64748B'} />
                  <Text style={[s.secTimerTxt, active && { color: '#FFF' }]}>{fmt(secTime)}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ============ QUESTION AREA ============ */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={s.qHeader}>
          <View style={s.qNum}>
            <Text style={s.qNumTxt}>Q. {current + 1}</Text>
          </View>
          <Text style={s.qMeta}>
            <Text style={{ fontWeight: '800' }}>{sectionIndex}</Text>
            <Text style={{ color: '#94A3B8' }}> of {questionsInSection.length}</Text>
            <Text style={{ color: '#94A3B8' }}>  ·  </Text>
            <Text style={{ color: '#0F172A', fontWeight: '700' }}>{q.topic}</Text>
            <Text style={{ color: '#94A3B8' }}>  ·  </Text>
            <Text
              style={{
                color:
                  q.difficulty === 'Easy'
                    ? '#059669'
                    : q.difficulty === 'Hard'
                      ? '#DC2626'
                      : '#D97706',
                fontWeight: '800',
              }}
            >
              {q.difficulty}
            </Text>
          </Text>
          {isMarked && (
            <View style={s.markedBadge}>
              <MaterialCommunityIcons name="bookmark" size={12} color="#8B5CF6" />
              <Text style={s.markedBadgeTxt}>MARKED</Text>
            </View>
          )}
        </View>

        <View style={s.qCard}>
          <Text style={s.qText}>{q.text}</Text>

          <View style={{ marginTop: 16, gap: 10 }}>
            {q.options.map((opt, idx) => {
              const active = userAns === idx;
              return (
                <Pressable
                  key={idx}
                  onPress={() => pickOption(idx)}
                  style={[s.opt, active && s.optActive]}
                  testID={`cbt-opt-${idx}`}
                >
                  <View style={[s.optRadio, active && s.optRadioActive]}>
                    {active && <View style={s.optRadioInner} />}
                  </View>
                  <Text style={s.optLetter}>{String.fromCharCode(65 + idx)}.</Text>
                  <Text style={[s.optText, active && { color: '#1E3A8A', fontWeight: '700' }]}>{opt}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Legend */}
        <View style={s.legend}>
          <LegendItem count={counts.answered} status="answered" />
          <LegendItem count={counts.not_answered} status="not_answered" />
          <LegendItem count={counts.not_visited} status="not_visited" />
          <LegendItem count={counts.marked + counts.marked_answered} status="marked" />
        </View>
      </ScrollView>

      {/* ============ ACTION BAR ============ */}
      <SafeAreaView edges={['bottom']} style={s.actionBar}>
        <View style={s.actionRow}>
          <Pressable onPress={markAndNext} style={s.btnMark} testID="cbt-mark">
            <MaterialCommunityIcons name="bookmark-outline" size={14} color="#8B5CF6" />
            <Text style={s.btnMarkTxt}>MARK & NEXT</Text>
          </Pressable>
          <Pressable onPress={clearResponse} style={s.btnGhost} testID="cbt-clear">
            <Text style={s.btnGhostTxt}>CLEAR</Text>
          </Pressable>
        </View>
        <View style={s.actionRow}>
          <Pressable onPress={previous} style={[s.btnGhost, { flex: 1 }]} testID="cbt-prev" disabled={current === 0}>
            <Ionicons name="chevron-back" size={14} color={current === 0 ? '#94A3B8' : '#0F172A'} />
            <Text style={[s.btnGhostTxt, current === 0 && { color: '#94A3B8' }]}>PREVIOUS</Text>
          </Pressable>
          <Pressable onPress={saveAndNext} style={s.btnPrimary} testID="cbt-save-next">
            <Text style={s.btnPrimaryTxt}>SAVE & NEXT</Text>
            <Ionicons name="chevron-forward" size={14} color="#FFF" />
          </Pressable>
        </View>
      </SafeAreaView>

      {/* ============ FLOATING PALETTE FAB ============ */}
      <Pressable
        onPress={() => setShowPalette(true)}
        style={[s.fab, { bottom: 138 + insets.bottom }]}
        testID="cbt-fab"
      >
        <MaterialCommunityIcons name="view-grid-outline" size={20} color="#FFF" />
      </Pressable>

      {/* ============ PALETTE MODAL ============ */}
      <Modal visible={showPalette} animationType="slide" transparent onRequestClose={() => setShowPalette(false)}>
        <Pressable style={s.paletteBackdrop} onPress={() => setShowPalette(false)}>
          <Pressable style={[s.paletteSheet, { paddingBottom: 24 + insets.bottom }]}>
            <View style={s.sheetHandle} />
            <View style={s.paletteHead}>
              <Text style={s.paletteTitle}>Question Palette</Text>
              <Pressable onPress={() => setShowPalette(false)}>
                <Ionicons name="close" size={22} color="#0F172A" />
              </Pressable>
            </View>

            {/* Legend */}
            <View style={s.legendGrid}>
              <LegendItem count={counts.answered} status="answered" />
              <LegendItem count={counts.not_answered} status="not_answered" />
              <LegendItem count={counts.not_visited} status="not_visited" />
              <LegendItem count={counts.marked} status="marked" />
              <LegendItem count={counts.marked_answered} status="marked_answered" />
            </View>

            <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ paddingBottom: 16 }}>
              {attempt.sections.map((sec) => {
                const secQs = attempt.questions.map((qq, i) => ({ qq, i })).filter((x) => x.qq.section === sec.name);
                return (
                  <View key={sec.name} style={{ marginTop: 10 }}>
                    <Text style={s.paletteSecTitle}>{sec.name}</Text>
                    <View style={s.paletteGrid}>
                      {secQs.map(({ qq, i }) => {
                        const st = statusFor(qq.id);
                        const c = STATUS_COLORS[st];
                        const isCurrent = i === current;
                        return (
                          <Pressable
                            key={qq.id}
                            onPress={() => navigateTo(i)}
                            style={[
                              s.paletteCell,
                              { backgroundColor: c.bg },
                              isCurrent && s.paletteCellCurrent,
                            ]}
                            testID={`cbt-pal-${i}`}
                          >
                            <Text style={[s.paletteCellTxt, { color: c.fg }]}>{i + 1}</Text>
                            {st === STATUS.MARKED_ANSWERED && (
                              <View style={s.paletteCheck}>
                                <Ionicons name="checkmark" size={9} color="#FFF" />
                              </View>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <Pressable
              onPress={() => {
                setShowPalette(false);
                setShowSubmit(true);
              }}
              style={s.submitFromPalette}
              testID="cbt-open-submit"
            >
              <Text style={s.submitFromPaletteTxt}>SUBMIT TEST</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ============ SUBMIT CONFIRM MODAL ============ */}
      <Modal visible={showSubmit} animationType="fade" transparent onRequestClose={() => setShowSubmit(false)}>
        <View style={s.confirmBackdrop}>
          <View style={s.confirmCard}>
            <View style={s.confirmIcon}>
              <MaterialCommunityIcons name="clipboard-check" size={36} color="#2563EB" />
            </View>
            <Text style={s.confirmTitle}>Submit Test?</Text>
            <View style={s.confirmStats}>
              <ConfirmStat count={counts.answered} label="Answered" color="#10B981" />
              <ConfirmStat count={counts.not_answered} label="Not Answered" color="#EF4444" />
              <ConfirmStat count={counts.marked + counts.marked_answered} label="Marked" color="#8B5CF6" />
              <ConfirmStat count={counts.not_visited} label="Not Visited" color="#6B7280" />
            </View>
            <Text style={s.confirmSub}>You will not be able to change your answers after submission.</Text>

            <View style={s.confirmBtnRow}>
              <Pressable
                style={[s.cBtn, s.cBtnGhost]}
                onPress={() => setShowSubmit(false)}
                disabled={submitting}
                testID="cbt-submit-cancel"
              >
                <Text style={s.cBtnGhostTxt}>Continue</Text>
              </Pressable>
              <Pressable
                style={[s.cBtn, s.cBtnPrimary]}
                onPress={() => handleSubmit()}
                disabled={submitting}
                testID="cbt-submit-confirm"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={s.cBtnPrimaryTxt}>Submit</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function LegendItem({ count, status }: { count: number; status: QStatus }) {
  const c = STATUS_COLORS[status];
  return (
    <View style={s.legItem}>
      <View style={[s.legDot, { backgroundColor: c.bg }]}>
        <Text style={[s.legDotTxt, { color: c.fg }]}>{count}</Text>
      </View>
      <Text style={s.legLbl}>{c.label}</Text>
    </View>
  );
}

function ConfirmStat({ count, label, color }: any) {
  return (
    <View style={s.cStat}>
      <View style={[s.cStatVal, { backgroundColor: `${color}18` }]}>
        <Text style={[s.cStatValTxt, { color }]}>{count}</Text>
      </View>
      <Text style={s.cStatLbl}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },

  // Top bar
  topBar: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0,
  },
  topBarRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 4 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  testName: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  testSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2, fontWeight: '600' },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  timerTxt: { color: '#FFF', fontSize: 12.5, fontWeight: '900', letterSpacing: 0.5 },

  // Section tabs
  secBar: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
    paddingVertical: 10,
  },
  secChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  secChipName: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  secTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  secTimerTxt: { fontSize: 10, fontWeight: '900', color: '#64748B' },

  // Question
  qHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  qNum: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#EFF6FF' },
  qNumTxt: { color: '#2563EB', fontSize: 12, fontWeight: '900' },
  qMeta: { flex: 1, fontSize: 11.5 },
  markedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#EDE9FE',
  },
  markedBadgeTxt: { color: '#8B5CF6', fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },

  qCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    ...Platform.select({
      ios: { shadowColor: '#0B4DB8', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10 },
      android: { elevation: 1 },
    }),
  },
  qText: { fontSize: 15, color: '#0F172A', lineHeight: 22, fontWeight: '600' },

  opt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFF',
  },
  optActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  optRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optRadioActive: { borderColor: '#2563EB' },
  optRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563EB' },
  optLetter: { fontSize: 13, fontWeight: '900', color: '#64748B' },
  optText: { flex: 1, fontSize: 13.5, color: '#0F172A', fontWeight: '600' },

  // Legend
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  legItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legDot: {
    minWidth: 26,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legDotTxt: { fontSize: 11, fontWeight: '900' },
  legLbl: { fontSize: 10.5, color: '#64748B', fontWeight: '700' },

  // Action bar
  actionBar: {
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: -3 }, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
  actionRow: { flexDirection: 'row', gap: 8 },
  btnMark: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#8B5CF6',
  },
  btnMarkTxt: { color: '#8B5CF6', fontSize: 12, fontWeight: '900', letterSpacing: 0.4 },
  btnGhost: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  btnGhostTxt: { color: '#0F172A', fontSize: 12, fontWeight: '900', letterSpacing: 0.4 },
  btnPrimary: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2563EB',
  },
  btnPrimaryTxt: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 0.4 },

  // FAB
  fab: {
    position: 'absolute',
    right: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#8B5CF6', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },

  // Palette
  paletteBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  paletteSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  sheetHandle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', marginBottom: 12 },
  paletteHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  paletteTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  paletteSecTitle: { fontSize: 12.5, fontWeight: '900', color: '#0F172A', marginBottom: 8 },
  paletteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  paletteCell: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  paletteCellCurrent: { borderWidth: 2, borderColor: '#F59E0B' },
  paletteCellTxt: { fontSize: 12, fontWeight: '900' },
  paletteCheck: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitFromPalette: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#DC2626', shadowOpacity: 0.25, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  submitFromPaletteTxt: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 0.6 },

  // Confirm
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  confirmCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 22,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  confirmIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  confirmTitle: { fontSize: 17, fontWeight: '900', color: '#0F172A', marginBottom: 12 },
  confirmStats: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  confirmSub: { fontSize: 12, color: '#64748B', textAlign: 'center', lineHeight: 18 },
  cStat: { alignItems: 'center', minWidth: 62 },
  cStatVal: {
    minWidth: 44,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cStatValTxt: { fontSize: 15, fontWeight: '900' },
  cStatLbl: { fontSize: 10, color: '#64748B', marginTop: 6, fontWeight: '700', textAlign: 'center' },

  confirmBtnRow: { flexDirection: 'row', gap: 10, marginTop: 18, alignSelf: 'stretch' },
  cBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  cBtnGhost: { borderWidth: 1, borderColor: '#E2E8F0' },
  cBtnGhostTxt: { color: '#0F172A', fontSize: 13, fontWeight: '800' },
  cBtnPrimary: { backgroundColor: '#DC2626' },
  cBtnPrimaryTxt: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
});
