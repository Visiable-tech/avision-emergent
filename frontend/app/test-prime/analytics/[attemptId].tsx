import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  StatusBar as RNStatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';

type Review = {
  id: string;
  section: string;
  topic: string;
  difficulty: string;
  text: string;
  options: string[];
  correct: number;
  user: number | null;
  explanation: string;
  status: 'correct' | 'wrong' | 'unattempted';
  marks_earned: number;
};

type Analytics = {
  test_name: string;
  exam_name: string;
  score: number;
  max_score: number;
  percentage: number;
  rank: number;
  percentile: number;
  aspirants: number;
  topper_score: number;
  average_score: number;
  correct_count: number;
  wrong_count: number;
  unattempted_count: number;
  accuracy: number;
  time_spent_sec: number;
  sectional: any[];
  topic_wise: any[];
  difficulty_wise: any[];
  review: Review[];
};

type Tab = 'overview' | 'topics' | 'solutions';
type ReviewFilter = 'all' | 'correct' | 'wrong' | 'unattempted';

export default function CbtAnalytics() {
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [d, setD] = useState<Analytics | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('wrong');

  useEffect(() => {
    (async () => {
      if (!attemptId || !user?.user_id) return;
      try {
        const r = await api.tpAnalytics(attemptId, user.user_id);
        setD(r);
      } catch {}
    })();
  }, [attemptId, user?.user_id]);

  const filteredReview = useMemo(() => {
    if (!d) return [];
    if (reviewFilter === 'all') return d.review;
    return d.review.filter((r) => r.status === reviewFilter);
  }, [d, reviewFilter]);

  const strengths = useMemo(() => {
    if (!d) return [];
    return [...d.topic_wise].filter((t) => t.total >= 2 && t.accuracy >= 60).sort((a, b) => b.accuracy - a.accuracy).slice(0, 5);
  }, [d]);

  const weaknesses = useMemo(() => {
    if (!d) return [];
    return [...d.topic_wise].filter((t) => t.total >= 2 && t.accuracy < 60).sort((a, b) => a.accuracy - b.accuracy).slice(0, 5);
  }, [d]);

  if (!d) {
    return (
      <View style={s.loading}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color="#2563EB" size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <LinearGradient colors={['#1E3A8A', '#2563EB']} style={s.hero}>
        <SafeAreaView edges={['top']}>
          <View style={s.headRow}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={s.iconBtn} testID="an-back">
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </Pressable>
            <View style={{ flex: 1, marginHorizontal: 8 }}>
              <Text style={s.headTitle}>Detailed Analytics</Text>
              <Text style={s.headSub} numberOfLines={1}>{d.test_name}</Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={s.tabRow}>
            {(['overview', 'topics', 'solutions'] as Tab[]).map((t) => (
              <Pressable key={t} onPress={() => setTab(t)} style={[s.tab, tab === t && s.tabActive]} testID={`an-tab-${t}`}>
                <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>{t[0].toUpperCase() + t.slice(1)}</Text>
              </Pressable>
            ))}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {tab === 'overview' && <OverviewTab d={d} />}

        {tab === 'topics' && (
          <>
            {/* STRENGTHS */}
            <View style={s.card}>
              <View style={s.cardHead}>
                <MaterialCommunityIcons name="arm-flex" size={18} color="#10B981" />
                <Text style={s.cardTitle}>Strengths</Text>
              </View>
              {strengths.length === 0 ? (
                <Text style={s.emptyTxt}>Keep practicing to build strengths in more topics.</Text>
              ) : (
                strengths.map((t, i) => <TopicRow key={i} t={t} />)
              )}
            </View>

            {/* WEAKNESSES */}
            <View style={s.card}>
              <View style={s.cardHead}>
                <MaterialCommunityIcons name="target" size={18} color="#EF4444" />
                <Text style={s.cardTitle}>Focus Areas</Text>
              </View>
              {weaknesses.length === 0 ? (
                <Text style={s.emptyTxt}>Excellent — no weak topics detected!</Text>
              ) : (
                weaknesses.map((t, i) => <TopicRow key={i} t={t} />)
              )}
            </View>

            {/* ALL TOPICS */}
            <View style={s.card}>
              <View style={s.cardHead}>
                <Ionicons name="library-outline" size={18} color="#0F172A" />
                <Text style={s.cardTitle}>All Topics</Text>
              </View>
              {d.topic_wise.map((t, i) => (
                <TopicRow key={i} t={t} />
              ))}
            </View>
          </>
        )}

        {tab === 'solutions' && (
          <>
            {/* Review filter tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
              {([
                { k: 'all', l: `All (${d.total_questions ?? d.review.length})` },
                { k: 'correct', l: `Correct (${d.correct_count})`, c: '#10B981' },
                { k: 'wrong', l: `Wrong (${d.wrong_count})`, c: '#EF4444' },
                { k: 'unattempted', l: `Skipped (${d.unattempted_count})`, c: '#94A3B8' },
              ] as any[]).map((f) => (
                <Pressable
                  key={f.k}
                  onPress={() => setReviewFilter(f.k)}
                  style={[
                    s.filterChip,
                    reviewFilter === f.k && { backgroundColor: f.c || '#0F172A', borderColor: f.c || '#0F172A' },
                  ]}
                  testID={`an-filter-${f.k}`}
                >
                  <Text style={[s.filterTxt, reviewFilter === f.k && { color: '#FFF' }]}>{f.l}</Text>
                </Pressable>
              ))}
            </ScrollView>

            {filteredReview.length === 0 ? (
              <View style={s.emptyCard}>
                <MaterialCommunityIcons name="clipboard-check-outline" size={44} color="#94A3B8" />
                <Text style={s.emptyTxt}>No questions in this filter.</Text>
              </View>
            ) : (
              filteredReview.map((q, i) => <ReviewCard key={q.id} q={q} idx={i + 1} />)
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ==================== OVERVIEW TAB ====================
function OverviewTab({ d }: { d: Analytics }) {
  const gap = d.topper_score - d.score;
  return (
    <>
      {/* Comparison bars */}
      <View style={s.card}>
        <Text style={s.cardTitle}>How you compare</Text>
        <CompareRow label="Your Score" value={d.score} max={d.max_score} color="#2563EB" bold />
        <CompareRow label="Topper" value={d.topper_score} max={d.max_score} color="#F59E0B" />
        <CompareRow label="Average" value={d.average_score} max={d.max_score} color="#94A3B8" />
        <View style={s.gapRow}>
          <MaterialCommunityIcons name="chart-line-variant" size={14} color="#7C3AED" />
          <Text style={s.gapTxt}>
            You are <Text style={{ fontWeight: '900', color: '#0F172A' }}>{gap.toFixed(1)}</Text> marks behind the topper.
          </Text>
        </View>
      </View>

      {/* Rank distribution visual */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Rank & Percentile</Text>
        <View style={s.rpRow}>
          <View style={s.rpBox}>
            <MaterialCommunityIcons name="podium-gold" size={20} color="#F59E0B" />
            <Text style={s.rpVal}>#{d.rank.toLocaleString()}</Text>
            <Text style={s.rpLbl}>All India Rank</Text>
            <Text style={s.rpMeta}>out of {(d.aspirants / 1000).toFixed(0)}K</Text>
          </View>
          <View style={s.rpBox}>
            <MaterialCommunityIcons name="percent-circle" size={20} color="#7C3AED" />
            <Text style={[s.rpVal, { color: '#7C3AED' }]}>{d.percentile}</Text>
            <Text style={s.rpLbl}>Percentile</Text>
            <Text style={s.rpMeta}>{d.percentile >= 90 ? 'Top 10%' : d.percentile >= 75 ? 'Top 25%' : d.percentile >= 50 ? 'Above Average' : 'Below Average'}</Text>
          </View>
        </View>
      </View>

      {/* Sectional summary */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Sectional Performance</Text>
        {d.sectional.map((sec, i) => (
          <View key={i} style={s.secBar}>
            <View style={s.secBarTop}>
              <Text style={s.secBarName} numberOfLines={1}>{sec.section}</Text>
              <Text style={s.secBarScore}>
                {sec.score}/{sec.max_score}
              </Text>
            </View>
            <View style={s.secBarTrack}>
              <View
                style={[
                  s.secBarFill,
                  {
                    width: `${Math.min(100, Math.max(0, sec.accuracy))}%`,
                    backgroundColor: sec.accuracy >= 70 ? '#10B981' : sec.accuracy >= 40 ? '#F59E0B' : '#EF4444',
                  },
                ]}
              />
            </View>
            <View style={s.secBarMeta}>
              <Text style={s.secBarMetaTxt}>✓ {sec.correct}  ✗ {sec.wrong}  – {sec.unattempted}</Text>
              <Text style={s.secBarAcc}>{sec.accuracy}% acc</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Time analysis */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Time Analysis</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TinyStat val={fmtTime(d.time_spent_sec)} lbl="Total time" c="#F59E0B" />
          <TinyStat val={fmtTime(Math.floor(d.time_spent_sec / Math.max(1, d.attempted || 1)))} lbl="Avg / Q" c="#0EA5E9" />
          <TinyStat val={`${d.accuracy}%`} lbl="Accuracy" c="#10B981" />
        </View>
      </View>
    </>
  );
}

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s < 10 ? '0' : ''}${s}s`;
}

function CompareRow({ label, value, max, color, bold }: any) {
  const pct = Math.min(100, Math.max(0, (100 * value) / (max || 1)));
  return (
    <View style={{ marginTop: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={[s.cmpLbl, bold && { fontWeight: '900', color: '#0F172A' }]}>{label}</Text>
        <Text style={[s.cmpVal, { color }]}>{value}</Text>
      </View>
      <View style={s.cmpTrack}>
        <View style={[s.cmpFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function TopicRow({ t }: { t: any }) {
  const acc = t.accuracy || 0;
  const c = acc >= 70 ? '#10B981' : acc >= 40 ? '#F59E0B' : '#EF4444';
  return (
    <View style={s.topicRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.topicName} numberOfLines={1}>{t.topic}</Text>
        <Text style={s.topicSec}>{t.section}  ·  {t.total} Qs</Text>
      </View>
      <View style={s.topicRight}>
        <View style={s.topicBarTrack}>
          <View style={[s.topicBarFill, { width: `${Math.min(100, acc)}%`, backgroundColor: c }]} />
        </View>
        <Text style={[s.topicAcc, { color: c }]}>{acc}%</Text>
      </View>
    </View>
  );
}

function TinyStat({ val, lbl, c }: any) {
  return (
    <View style={[s.tinyStat, { borderColor: `${c}30` }]}>
      <Text style={[s.tinyVal, { color: c }]}>{val}</Text>
      <Text style={s.tinyLbl}>{lbl}</Text>
    </View>
  );
}

function ReviewCard({ q, idx }: { q: Review; idx: number }) {
  const [open, setOpen] = useState(false);
  const statusColor =
    q.status === 'correct' ? '#10B981' : q.status === 'wrong' ? '#EF4444' : '#94A3B8';
  const statusIcon =
    q.status === 'correct' ? 'checkmark-circle' : q.status === 'wrong' ? 'close-circle' : 'remove-circle';
  const statusLbl = q.status === 'correct' ? 'CORRECT' : q.status === 'wrong' ? 'WRONG' : 'SKIPPED';

  return (
    <View style={s.revCard}>
      <Pressable onPress={() => setOpen((v) => !v)} style={s.revHead}>
        <View style={s.revIdx}>
          <Text style={s.revIdxTxt}>Q.{idx}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.revTitle} numberOfLines={open ? 0 : 2}>{q.text}</Text>
          <Text style={s.revMeta}>
            {q.section}  ·  {q.topic}  ·  {q.difficulty}
          </Text>
        </View>
        <View style={s.revStatus}>
          <Ionicons name={statusIcon as any} size={16} color={statusColor} />
        </View>
      </Pressable>

      {open && (
        <View style={s.revBody}>
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correct;
            const isUserWrong = q.user === i && !isCorrect;
            return (
              <View
                key={i}
                style={[
                  s.revOpt,
                  isCorrect && s.revOptCorrect,
                  isUserWrong && s.revOptWrong,
                ]}
              >
                <Text style={s.revOptLetter}>{String.fromCharCode(65 + i)}.</Text>
                <Text style={[s.revOptTxt, isCorrect && { fontWeight: '800', color: '#065F46' }, isUserWrong && { color: '#991B1B' }]}>
                  {opt}
                </Text>
                {isCorrect && <Ionicons name="checkmark-circle" size={14} color="#10B981" />}
                {isUserWrong && <Ionicons name="close-circle" size={14} color="#EF4444" />}
              </View>
            );
          })}
          <View style={s.revExpl}>
            <MaterialCommunityIcons name="lightbulb-outline" size={16} color="#B45309" />
            <Text style={s.revExplTxt}>{q.explanation}</Text>
          </View>
          <View style={s.revFoot}>
            <View style={[s.revStatusPill, { backgroundColor: `${statusColor}18` }]}>
              <Ionicons name={statusIcon as any} size={11} color={statusColor} />
              <Text style={[s.revStatusPillTxt, { color: statusColor }]}>{statusLbl}</Text>
            </View>
            <Text style={s.revMarks}>
              {q.marks_earned >= 0 ? '+' : ''}
              {q.marks_earned.toFixed(2)} marks
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },

  hero: {
    paddingHorizontal: 12,
    paddingBottom: 4,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 4 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.20)' },
  headTitle: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  headSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2, fontWeight: '600' },

  tabRow: { flexDirection: 'row', marginTop: 12, gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 999, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: 'center' },
  tabActive: { backgroundColor: '#FFF' },
  tabTxt: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  tabTxtActive: { color: '#2563EB' },

  card: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    marginTop: 12,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '900', color: '#0F172A' },

  cmpLbl: { fontSize: 12.5, fontWeight: '700', color: '#64748B' },
  cmpVal: { fontSize: 13, fontWeight: '900' },
  cmpTrack: { height: 8, borderRadius: 4, backgroundColor: '#F1F5F9', overflow: 'hidden' },
  cmpFill: { height: '100%', borderRadius: 4 },
  gapRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, padding: 10, backgroundColor: '#F5F3FF', borderRadius: 10 },
  gapTxt: { flex: 1, fontSize: 12, color: '#64748B', fontWeight: '600' },

  rpRow: { flexDirection: 'row', gap: 10 },
  rpBox: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#F8FAFC', alignItems: 'flex-start' },
  rpVal: { fontSize: 22, fontWeight: '900', color: '#F59E0B', marginTop: 8 },
  rpLbl: { fontSize: 11, fontWeight: '800', color: '#64748B', marginTop: 4, letterSpacing: 0.3 },
  rpMeta: { fontSize: 10.5, color: '#94A3B8', marginTop: 2, fontWeight: '600' },

  secBar: { marginTop: 12 },
  secBarTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  secBarName: { flex: 1, fontSize: 13, fontWeight: '800', color: '#0F172A' },
  secBarScore: { fontSize: 13, fontWeight: '900', color: '#0F172A' },
  secBarTrack: { height: 8, borderRadius: 4, backgroundColor: '#F1F5F9', overflow: 'hidden' },
  secBarFill: { height: '100%', borderRadius: 4 },
  secBarMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  secBarMetaTxt: { fontSize: 11, color: '#64748B', fontWeight: '700' },
  secBarAcc: { fontSize: 11, color: '#0F172A', fontWeight: '900' },

  tinyStat: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, backgroundColor: '#F8FAFC' },
  tinyVal: { fontSize: 15, fontWeight: '900' },
  tinyLbl: { fontSize: 10.5, color: '#64748B', marginTop: 2, fontWeight: '700' },

  topicRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  topicName: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  topicSec: { fontSize: 10.5, color: '#94A3B8', marginTop: 2, fontWeight: '600' },
  topicRight: { width: 100, alignItems: 'flex-end' },
  topicBarTrack: { width: 100, height: 6, borderRadius: 3, backgroundColor: '#F1F5F9', overflow: 'hidden' },
  topicBarFill: { height: '100%', borderRadius: 3 },
  topicAcc: { fontSize: 12, fontWeight: '900', marginTop: 4 },

  filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0' },
  filterTxt: { fontSize: 12, fontWeight: '800', color: '#0F172A' },

  emptyCard: { alignItems: 'center', paddingVertical: 40, backgroundColor: '#FFF', borderRadius: 16, marginTop: 12 },
  emptyTxt: { fontSize: 12.5, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 20, marginTop: 8 },

  revCard: { backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#EEF2F7', marginTop: 10 },
  revHead: { flexDirection: 'row', padding: 12, gap: 10, alignItems: 'center' },
  revIdx: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#EFF6FF', borderRadius: 6 },
  revIdxTxt: { color: '#2563EB', fontSize: 11, fontWeight: '900' },
  revTitle: { fontSize: 13, color: '#0F172A', fontWeight: '600', lineHeight: 18 },
  revMeta: { fontSize: 10.5, color: '#94A3B8', marginTop: 4, fontWeight: '700' },
  revStatus: { width: 24, alignItems: 'center' },
  revBody: { borderTopWidth: 1, borderTopColor: '#F1F5F9', padding: 12, gap: 8 },
  revOpt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  revOptCorrect: { backgroundColor: '#D1FAE5', borderColor: '#10B981' },
  revOptWrong: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
  revOptLetter: { fontSize: 12, fontWeight: '900', color: '#64748B' },
  revOptTxt: { flex: 1, fontSize: 12.5, color: '#0F172A' },
  revExpl: { flexDirection: 'row', gap: 8, padding: 10, backgroundColor: '#FEF3C7', borderRadius: 10 },
  revExplTxt: { flex: 1, fontSize: 12, color: '#78350F', lineHeight: 17, fontWeight: '500' },
  revFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  revStatusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  revStatusPillTxt: { fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  revMarks: { fontSize: 11.5, fontWeight: '900', color: '#0F172A' },
});
