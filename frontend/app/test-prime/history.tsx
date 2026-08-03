import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  StatusBar as RNStatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';

type Attempt = {
  attempt_id: string;
  test_id: string;
  test_name: string;
  exam_name: string;
  status: string;
  attempt_number?: number;
  score?: number;
  max_score?: number;
  percentage?: number;
  rank?: number;
  percentile?: number;
  correct_count?: number;
  wrong_count?: number;
  unattempted_count?: number;
  time_spent_sec?: number;
  started_at: string;
  submitted_at?: string;
};

function fmtDate(iso?: string) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const day = d.getDate();
    const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
    const hh = d.getHours() % 12 || 12;
    const mm = d.getMinutes().toString().padStart(2, '0');
    const p = d.getHours() >= 12 ? 'PM' : 'AM';
    return `${day} ${m} · ${hh}:${mm} ${p}`;
  } catch {
    return iso;
  }
}

type Filter = 'all' | 'submitted' | 'in_progress';

export default function AttemptHistory() {
  const router = useRouter();
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retaking, setRetaking] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    if (!user?.user_id) return;
    try {
      const r = await api.tpListAttempts(user.user_id, 50);
      setAttempts(r.attempts || []);
    } catch {}
    setLoading(false);
  }, [user?.user_id]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const retake = async (a: Attempt) => {
    if (!user?.user_id || retaking) return;
    try {
      setRetaking(a.attempt_id);
      const na = await api.tpStartAttempt(user.user_id, a.test_id);
      router.push(`/test-prime/attempt/${na.attempt_id}` as any);
    } catch (e: any) {
      alert(e?.message || 'Failed to start retake');
    } finally {
      setRetaking(null);
    }
  };

  const filtered = attempts.filter((a) => filter === 'all' || a.status === filter);

  // Aggregate stats
  const submitted = attempts.filter((a) => a.status === 'submitted');
  const best = submitted.reduce<Attempt | null>((acc, a) => (!acc || (a.score ?? -1e9) > (acc.score ?? -1e9) ? a : acc), null);
  const avgScore = submitted.length
    ? (submitted.reduce((s, a) => s + (a.score ?? 0), 0) / submitted.length).toFixed(1)
    : '—';
  const totalTime = submitted.reduce((s, a) => s + (a.time_spent_sec ?? 0), 0);

  return (
    <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient colors={['#1E3A8A', '#2563EB']} style={styles.hero}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headRow}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={styles.iconBtn} testID="hist-back">
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </Pressable>
            <View style={{ flex: 1, marginHorizontal: 8 }}>
              <Text style={styles.title}>Test History</Text>
              <Text style={styles.sub}>Your attempts, ranks, and retakes</Text>
            </View>
          </View>

          {/* Summary */}
          <View style={styles.sumRow}>
            <SumCell val={String(submitted.length)} lbl="Submitted" />
            <View style={styles.divider} />
            <SumCell val={best ? String(best.score ?? '—') : '—'} lbl="Best" />
            <View style={styles.divider} />
            <SumCell val={String(avgScore)} lbl="Average" />
            <View style={styles.divider} />
            <SumCell val={fmtMin(totalTime)} lbl="Time Spent" />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.filterRow}>
        {(['all', 'submitted', 'in_progress'] as Filter[]).map((f) => {
          const active = f === filter;
          const label = f === 'all' ? 'All' : f === 'submitted' ? 'Submitted' : 'In Progress';
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterChip, active && styles.filterActive]}
              testID={`hist-filter-${f}`}
            >
              <Text style={[styles.filterTxt, active && { color: '#FFF' }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#2563EB" size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={54} color="#94A3B8" />
          <Text style={styles.emptyTxt}>No attempts yet. Start a test to see your history here.</Text>
          <Pressable onPress={() => router.replace('/test-prime' as any)} style={styles.emptyBtn} testID="hist-go-tp">
            <Text style={styles.emptyBtnTxt}>Explore Test Prime</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
          showsVerticalScrollIndicator={false}
        >
          {filtered.map((a) => (
            <View key={a.attempt_id} style={styles.card}>
              <View style={styles.cardHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{a.test_name}</Text>
                  <Text style={styles.cardSub}>
                    {a.exam_name}  ·  Attempt #{a.attempt_number ?? 1}  ·  {fmtDate(a.submitted_at || a.started_at)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    a.status === 'submitted' ? styles.statusDone : styles.statusOngoing,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: a.status === 'submitted' ? '#10B981' : '#F59E0B' },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusTxt,
                      { color: a.status === 'submitted' ? '#065F46' : '#78350F' },
                    ]}
                  >
                    {a.status === 'submitted' ? 'SUBMITTED' : 'IN PROGRESS'}
                  </Text>
                </View>
              </View>

              {a.status === 'submitted' && (
                <>
                  <View style={styles.scoreRow}>
                    <View style={styles.scoreBox}>
                      <Text style={styles.scoreVal}>
                        {a.score}
                        <Text style={styles.scoreMax}>/{a.max_score}</Text>
                      </Text>
                      <Text style={styles.scoreLbl}>Score  ({a.percentage}%)</Text>
                    </View>
                    <View style={styles.scoreBox}>
                      <Text style={[styles.scoreVal, { color: '#F59E0B' }]}>#{(a.rank ?? 0).toLocaleString()}</Text>
                      <Text style={styles.scoreLbl}>Rank</Text>
                    </View>
                    <View style={styles.scoreBox}>
                      <Text style={[styles.scoreVal, { color: '#7C3AED' }]}>{a.percentile}</Text>
                      <Text style={styles.scoreLbl}>Percentile</Text>
                    </View>
                  </View>
                  <View style={styles.metaRow}>
                    <MetaChip icon="checkmark-circle" v={a.correct_count} c="#10B981" />
                    <MetaChip icon="close-circle" v={a.wrong_count} c="#EF4444" />
                    <MetaChip icon="help-circle" v={a.unattempted_count} c="#94A3B8" />
                    <MetaChip icon="time" v={fmtMin(a.time_spent_sec)} c="#F59E0B" />
                  </View>
                </>
              )}

              <View style={styles.actRow}>
                {a.status === 'submitted' ? (
                  <>
                    <Pressable
                      style={styles.actGhost}
                      onPress={() => router.push(`/test-prime/analytics/${a.attempt_id}` as any)}
                      testID={`hist-an-${a.attempt_id}`}
                    >
                      <MaterialCommunityIcons name="chart-line" size={14} color="#2563EB" />
                      <Text style={styles.actGhostTxt}>Analytics</Text>
                    </Pressable>
                    <Pressable
                      style={styles.actPrimary}
                      onPress={() => retake(a)}
                      disabled={retaking === a.attempt_id}
                      testID={`hist-re-${a.attempt_id}`}
                    >
                      {retaking === a.attempt_id ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <>
                          <Ionicons name="refresh" size={14} color="#FFF" />
                          <Text style={styles.actPrimaryTxt}>Retake</Text>
                        </>
                      )}
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    style={[styles.actPrimary, { backgroundColor: '#F59E0B' }]}
                    onPress={() => router.push(`/test-prime/attempt/${a.attempt_id}` as any)}
                    testID={`hist-resume-${a.attempt_id}`}
                  >
                    <Ionicons name="play" size={14} color="#FFF" />
                    <Text style={styles.actPrimaryTxt}>Resume</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function fmtMin(sec?: number) {
  if (!sec && sec !== 0) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s < 10 ? '0' : ''}${s}s`;
}

function SumCell({ val, lbl }: any) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.sumVal}>{val}</Text>
      <Text style={styles.sumLbl}>{lbl}</Text>
    </View>
  );
}

function MetaChip({ icon, v, c }: any) {
  return (
    <View style={styles.metaChip}>
      <Ionicons name={icon} size={11} color={c} />
      <Text style={[styles.metaChipTxt, { color: c }]}>{v ?? '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 6 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.20)' },
  title: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2, fontWeight: '600' },
  sumRow: {
    flexDirection: 'row',
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', height: 30 },
  sumVal: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  sumLbl: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '700', marginTop: 4, letterSpacing: 0.3 },

  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 14, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  filterTxt: { fontSize: 12, fontWeight: '800', color: '#0F172A' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTxt: { color: '#64748B', fontSize: 13, textAlign: 'center', marginTop: 12, fontWeight: '600' },
  emptyBtn: { marginTop: 16, backgroundColor: '#2563EB', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  emptyBtnTxt: { color: '#FFF', fontSize: 13, fontWeight: '900' },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    marginTop: 12,
    ...Platform.select({
      ios: { shadowColor: '#0B4DB8', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8 },
      android: { elevation: 1 },
    }),
  },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardTitle: { fontSize: 14, fontWeight: '900', color: '#0F172A', lineHeight: 20 },
  cardSub: { fontSize: 11, color: '#64748B', marginTop: 3, fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusDone: { backgroundColor: '#D1FAE5' },
  statusOngoing: { backgroundColor: '#FEF3C7' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontSize: 9.5, fontWeight: '900', letterSpacing: 0.5 },

  scoreRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  scoreBox: { flex: 1, padding: 10, backgroundColor: '#F8FAFC', borderRadius: 10, alignItems: 'flex-start' },
  scoreVal: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  scoreMax: { fontSize: 11, color: '#94A3B8', fontWeight: '700' },
  scoreLbl: { fontSize: 10, color: '#64748B', marginTop: 3, fontWeight: '700', letterSpacing: 0.2 },

  metaRow: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  metaChipTxt: { fontSize: 11, fontWeight: '800' },

  actRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actGhost: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  actGhostTxt: { color: '#2563EB', fontSize: 12, fontWeight: '900' },
  actPrimary: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2563EB',
  },
  actPrimaryTxt: { color: '#FFF', fontSize: 12, fontWeight: '900' },
});
