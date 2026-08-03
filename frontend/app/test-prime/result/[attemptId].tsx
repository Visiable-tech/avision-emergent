import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  StatusBar as RNStatusBar,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';

type Result = {
  attempt_id: string;
  test_name: string;
  exam_name: string;
  score: number;
  max_score: number;
  percentage: number;
  correct_count: number;
  wrong_count: number;
  unattempted_count: number;
  attempted: number;
  total_questions: number;
  accuracy: number;
  rank: number;
  percentile: number;
  aspirants: number;
  topper_score: number;
  average_score: number;
  time_spent_sec: number;
  sectional: any[];
  difficulty_wise: any[];
};

function fmt(sec: number): string {
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s < 10 ? '0' : ''}${s}s`;
}

function formatK(n: number): string {
  if (!n) return '0';
  if (n >= 100000) return `${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function CbtResult() {
  const { attemptId } = useLocalSearchParams<{ attemptId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [r, setR] = useState<Result | null>(null);

  useEffect(() => {
    (async () => {
      if (!attemptId || !user?.user_id) return;
      try {
        const d = await api.tpAnalytics(attemptId, user.user_id);
        setR(d);
      } catch {
        try {
          const d = await api.tpAttempt(attemptId, user.user_id);
          setR(d as any);
        } catch {}
      }
    })();
  }, [attemptId, user?.user_id]);

  if (!r) {
    return (
      <View style={s.loading}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color="#2563EB" size="large" />
      </View>
    );
  }

  const passed = r.percentage >= 50;
  const grade =
    r.percentage >= 80 ? 'A+' : r.percentage >= 70 ? 'A' : r.percentage >= 60 ? 'B+' : r.percentage >= 50 ? 'B' : r.percentage >= 40 ? 'C' : 'D';

  const shareResult = () => {
    try {
      Share.share({
        message: `🏆 I scored ${r.score}/${r.max_score} (${r.percentage}%) in ${r.test_name} on Avision Institute — AIR ${r.rank}, ${r.percentile}%ile! Beat me: https://avision.app`,
      });
    } catch {}
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Hero */}
      <LinearGradient
        colors={passed ? ['#059669', '#10B981', '#34D399'] : ['#B45309', '#F59E0B', '#FBBF24']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        <SafeAreaView edges={['top']}>
          <View style={s.headRow}>
            <Pressable onPress={() => router.replace('/(tabs)/tests' as any)} hitSlop={10} style={s.iconBtn} testID="res-back">
              <Ionicons name="close" size={22} color="#FFF" />
            </Pressable>
            <Text style={s.headTitle}>Test Result</Text>
            <Pressable onPress={shareResult} hitSlop={10} style={s.iconBtn} testID="res-share">
              <Ionicons name="share-social-outline" size={20} color="#FFF" />
            </Pressable>
          </View>

          <View style={s.heroContent}>
            <MaterialCommunityIcons
              name={passed ? 'trophy' : 'medal-outline'}
              size={54}
              color="#FDE68A"
            />
            <Text style={s.heroLabel}>{passed ? 'Great work!' : 'Keep going!'}</Text>
            <Text style={s.heroScore}>
              {r.score}
              <Text style={s.heroMax}>/{r.max_score}</Text>
            </Text>
            <Text style={s.heroTest} numberOfLines={2}>{r.test_name}</Text>
            <View style={s.gradePill}>
              <Text style={s.gradeTxt}>Grade  {grade}</Text>
              <View style={s.gradeDot} />
              <Text style={s.gradeTxt}>{r.percentage}%</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* ============ RANK & PERCENTILE ============ */}
        <View style={s.rankCard}>
          <View style={{ flex: 1 }}>
            <View style={s.rankRow}>
              <MaterialCommunityIcons name="podium-gold" size={20} color="#F59E0B" />
              <Text style={s.rankLbl}>All India Rank</Text>
            </View>
            <Text style={s.rankVal}>#{r.rank.toLocaleString()}</Text>
            <Text style={s.rankMeta}>of {formatK(r.aspirants)} aspirants</Text>
          </View>
          <View style={s.divider} />
          <View style={{ flex: 1 }}>
            <View style={s.rankRow}>
              <MaterialCommunityIcons name="percent" size={20} color="#7C3AED" />
              <Text style={s.rankLbl}>Percentile</Text>
            </View>
            <Text style={[s.rankVal, { color: '#7C3AED' }]}>{r.percentile}</Text>
            <Text style={s.rankMeta}>Better than {r.percentile}% test takers</Text>
          </View>
        </View>

        {/* ============ SUMMARY GRID ============ */}
        <View style={s.grid}>
          <StatBox icon="checkmark-circle" color="#10B981" val={r.correct_count} lbl="Correct" />
          <StatBox icon="close-circle" color="#EF4444" val={r.wrong_count} lbl="Incorrect" />
          <StatBox icon="help-circle" color="#94A3B8" val={r.unattempted_count} lbl="Skipped" />
          <StatBox icon="analytics" color="#0EA5E9" val={`${r.accuracy}%`} lbl="Accuracy" />
        </View>

        <View style={s.grid}>
          <StatBox icon="time" color="#F59E0B" val={fmt(r.time_spent_sec)} lbl="Time Spent" />
          <StatBox icon="trophy" color="#8B5CF6" val={r.topper_score} lbl="Topper Score" />
          <StatBox icon="trending-up" color="#2563EB" val={r.average_score} lbl="Avg Score" />
          <StatBox icon="document-text" color="#0F172A" val={`${r.attempted}/${r.total_questions}`} lbl="Attempted" />
        </View>

        {/* ============ PERCENTILE BAR ============ */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Where do you stand?</Text>
          <View style={s.pRail}>
            <LinearGradient
              colors={['#EF4444', '#F59E0B', '#10B981']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.pRailFill}
            />
            <View style={[s.pMarker, { left: `${Math.max(0, Math.min(100, r.percentile))}%` }]}>
              <View style={s.pMarkerDot} />
              <Text style={s.pMarkerTxt}>You</Text>
            </View>
          </View>
          <View style={s.pRailLabels}>
            <Text style={s.pRailLbl}>0</Text>
            <Text style={s.pRailLbl}>25</Text>
            <Text style={s.pRailLbl}>50</Text>
            <Text style={s.pRailLbl}>75</Text>
            <Text style={s.pRailLbl}>100</Text>
          </View>
        </View>

        {/* ============ SECTIONAL PERFORMANCE ============ */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Sectional Performance</Text>
          {r.sectional?.map((sec, i) => {
            const acc = sec.accuracy || 0;
            const scoreColor = acc >= 70 ? '#10B981' : acc >= 40 ? '#F59E0B' : '#EF4444';
            return (
              <View key={i} style={s.secBlock}>
                <View style={s.secTop}>
                  <Text style={s.secName} numberOfLines={1}>{sec.section}</Text>
                  <Text style={[s.secScore, { color: scoreColor }]}>
                    {sec.score}/{sec.max_score}
                  </Text>
                </View>
                <View style={s.progressTrack}>
                  <View
                    style={[s.progressFill, { width: `${Math.min(100, Math.max(0, acc))}%`, backgroundColor: scoreColor }]}
                  />
                </View>
                <View style={s.secStats}>
                  <SecStat label="Correct" val={sec.correct} color="#10B981" />
                  <SecStat label="Wrong" val={sec.wrong} color="#EF4444" />
                  <SecStat label="Skipped" val={sec.unattempted} color="#94A3B8" />
                  <SecStat label="Accuracy" val={`${acc}%`} color={scoreColor} />
                </View>
              </View>
            );
          })}
        </View>

        {/* ============ DIFFICULTY BREAKDOWN ============ */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Difficulty Breakdown</Text>
          <View style={s.diffRow}>
            {r.difficulty_wise?.map((d, i) => (
              <View key={i} style={s.diffBox}>
                <View
                  style={[
                    s.diffBadge,
                    {
                      backgroundColor:
                        d.difficulty === 'Easy'
                          ? '#D1FAE5'
                          : d.difficulty === 'Hard'
                            ? '#FEE2E2'
                            : '#FEF3C7',
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.diffLbl,
                      {
                        color:
                          d.difficulty === 'Easy'
                            ? '#065F46'
                            : d.difficulty === 'Hard'
                              ? '#991B1B'
                              : '#B45309',
                      },
                    ]}
                  >
                    {d.difficulty}
                  </Text>
                </View>
                <Text style={s.diffScore}>
                  {d.correct}/{d.total}
                </Text>
                <Text style={s.diffAcc}>{d.accuracy}%</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ============ CTA BUTTONS ============ */}
        <View style={s.ctaCol}>
          <Pressable
            style={s.ctaPrimary}
            onPress={() => router.push(`/test-prime/analytics/${r.attempt_id}` as any)}
            testID="res-analytics"
          >
            <MaterialCommunityIcons name="chart-line" size={18} color="#FFF" />
            <Text style={s.ctaPrimaryTxt}>View Detailed Analytics</Text>
          </Pressable>
          <Pressable
            style={s.ctaGhost}
            onPress={() => router.replace('/(tabs)/tests' as any)}
            testID="res-back-tests"
          >
            <Text style={s.ctaGhostTxt}>Back to Test Prime</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function StatBox({ icon, color, val, lbl }: any) {
  return (
    <View style={s.stat}>
      <View style={[s.statIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={s.statVal}>{val}</Text>
      <Text style={s.statLbl}>{lbl}</Text>
    </View>
  );
}

function SecStat({ label, val, color }: any) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={[s.secStatVal, { color }]}>{val}</Text>
      <Text style={s.secStatLbl}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },

  hero: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 4 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.20)' },
  headTitle: { flex: 1, textAlign: 'center', color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 0.6 },
  heroContent: { alignItems: 'center', marginTop: 6 },
  heroLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '700', marginTop: 6 },
  heroScore: { color: '#FFF', fontSize: 56, fontWeight: '900', letterSpacing: -1, marginTop: 4 },
  heroMax: { fontSize: 22, fontWeight: '800', color: 'rgba(255,255,255,0.7)' },
  heroTest: { color: '#FFF', fontSize: 14, fontWeight: '700', marginTop: 4, textAlign: 'center', paddingHorizontal: 30 },
  gradePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.24)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    marginTop: 12,
  },
  gradeTxt: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  gradeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.6)' },

  rankCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    marginTop: -16,
    ...Platform.select({
      ios: { shadowColor: '#0B4DB8', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14 },
      android: { elevation: 3 },
    }),
  },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rankLbl: { fontSize: 11.5, fontWeight: '800', color: '#64748B', letterSpacing: 0.3 },
  rankVal: { fontSize: 26, fontWeight: '900', color: '#F59E0B', marginTop: 4 },
  rankMeta: { fontSize: 10.5, fontWeight: '600', color: '#94A3B8', marginTop: 2 },
  divider: { width: 1, backgroundColor: '#E2E8F0', marginHorizontal: 12 },

  grid: { flexDirection: 'row', gap: 8, marginTop: 12 },
  stat: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  statIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statVal: { fontSize: 14, fontWeight: '900', color: '#0F172A', marginTop: 8 },
  statLbl: { fontSize: 10, fontWeight: '700', color: '#94A3B8', marginTop: 2, letterSpacing: 0.3 },

  card: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    marginTop: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '900', color: '#0F172A', marginBottom: 12 },

  pRail: { height: 12, borderRadius: 6, overflow: 'visible', backgroundColor: '#F1F5F9', marginTop: 10, position: 'relative' },
  pRailFill: { height: '100%', borderRadius: 6 },
  pMarker: { position: 'absolute', top: -10, alignItems: 'center', transform: [{ translateX: -14 }] },
  pMarkerDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#0F172A', borderWidth: 2, borderColor: '#FFF' },
  pMarkerTxt: { fontSize: 9.5, fontWeight: '900', color: '#0F172A', marginTop: 4 },
  pRailLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  pRailLbl: { fontSize: 10, color: '#94A3B8', fontWeight: '700' },

  secBlock: { marginTop: 10 },
  secTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  secName: { flex: 1, fontSize: 13, fontWeight: '800', color: '#0F172A' },
  secScore: { fontSize: 13.5, fontWeight: '900' },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: '#F1F5F9', marginTop: 6, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  secStats: { flexDirection: 'row', marginTop: 8 },
  secStatVal: { fontSize: 12.5, fontWeight: '900' },
  secStatLbl: { fontSize: 10, color: '#94A3B8', fontWeight: '700', marginTop: 1 },

  diffRow: { flexDirection: 'row', gap: 10 },
  diffBox: { flex: 1, alignItems: 'center', paddingVertical: 10, borderWidth: 1, borderColor: '#EEF2F7', borderRadius: 12 },
  diffBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  diffLbl: { fontSize: 10.5, fontWeight: '900', letterSpacing: 0.3 },
  diffScore: { fontSize: 15, fontWeight: '900', color: '#0F172A', marginTop: 6 },
  diffAcc: { fontSize: 10, color: '#64748B', fontWeight: '700', marginTop: 1 },

  ctaCol: { marginTop: 16, gap: 10 },
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
  },
  ctaPrimaryTxt: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 0.4 },
  ctaGhost: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaGhostTxt: { color: '#0F172A', fontSize: 13, fontWeight: '800' },
});
