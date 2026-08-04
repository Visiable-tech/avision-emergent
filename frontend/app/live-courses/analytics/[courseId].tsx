import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';

export default function CourseAnalytics() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!courseId) return;
    try {
      const d = await api.courseAnalytics(courseId);
      setData(d);
    } catch (e) { console.warn('analytics', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [courseId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !data) {
    return (
      <View style={s.loading}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }

  const { course, overall, subjects, top_weak, top_strong, ai_tips } = data;
  const maxWeekly = Math.max(...overall.weekly_hours_trend, 1);

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={course.gradient || [theme.colors.brand, theme.colors.brandDark]} style={s.header}>
        <SafeAreaView edges={['top']}>
          <View style={s.headRow}>
            <Pressable onPress={() => router.back()} style={s.iconBtn} testID="an-back">
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Performance Analytics</Text>
              <Text style={s.sub} numberOfLines={1}>{course.name}</Text>
            </View>
            <View style={s.iconBtn}>
              <Ionicons name="stats-chart" size={18} color="#FFF" />
            </View>
          </View>

          {/* KPI row */}
          <View style={s.kpiRow}>
            <View style={s.kpi}>
              <Text style={s.kpiVal}>{overall.accuracy_pct}%</Text>
              <Text style={s.kpiLbl}>Accuracy</Text>
            </View>
            <View style={s.kpi}>
              <Text style={s.kpiVal}>{overall.attendance_pct}%</Text>
              <Text style={s.kpiLbl}>Attendance</Text>
            </View>
            <View style={s.kpi}>
              <Text style={s.kpiVal}>{overall.attempts_total}</Text>
              <Text style={s.kpiLbl}>Attempts</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.brand} />}
      >
        {/* Weekly hours bar chart */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Weekly Study Hours</Text>
            <Text style={s.cardSub}>Last 6 weeks</Text>
          </View>
          <View style={s.chartRow}>
            {overall.weekly_hours_trend.map((h: number, i: number) => {
              const heightPct = Math.max(6, Math.round((h / maxWeekly) * 100));
              const isLast = i === overall.weekly_hours_trend.length - 1;
              return (
                <View key={i} style={s.barCol}>
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { height: `${heightPct}%`, backgroundColor: isLast ? theme.colors.gold : theme.colors.brand + 'BB' }]} />
                  </View>
                  <Text style={s.barVal}>{h}h</Text>
                  <Text style={s.barLbl}>W{i + 1}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* AI Tips */}
        <View style={s.tipsCard}>
          <View style={s.tipsHead}>
            <MaterialCommunityIcons name="lightbulb-on" size={16} color={theme.colors.gold} />
            <Text style={s.tipsTitle}>AI Recommendations</Text>
          </View>
          <View style={{ marginTop: 10, gap: 8 }}>
            {ai_tips.map((t: string, i: number) => (
              <View key={i} style={s.tipRow}>
                <View style={s.tipDot}>
                  <Text style={s.tipDotTxt}>{i + 1}</Text>
                </View>
                <Text style={s.tipTxt}>{t}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top Weak Topics */}
        {top_weak?.length ? (
          <View style={s.card}>
            <View style={s.cardHead}>
              <Text style={s.cardTitle}>Focus Areas</Text>
              <View style={s.weakChip}>
                <Ionicons name="alert-circle" size={11} color="#FFF" />
                <Text style={s.weakChipTxt}>{overall.weak_count} weak</Text>
              </View>
            </View>
            <View style={{ marginTop: 10, gap: 8 }}>
              {top_weak.map((t: any, i: number) => (
                <View key={i} style={s.topicRow}>
                  <View style={[s.topicBadge, { backgroundColor: '#EF444418' }]}>
                    <Ionicons name="warning" size={11} color="#EF4444" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.topicName}>{t.topic}</Text>
                    <Text style={s.topicMeta}>{t.subject} • {t.attempts} attempts</Text>
                  </View>
                  <Text style={[s.topicAcc, { color: '#EF4444' }]}>{t.accuracy}%</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Top Strong */}
        {top_strong?.length ? (
          <View style={s.card}>
            <View style={s.cardHead}>
              <Text style={s.cardTitle}>Your Strengths</Text>
              <View style={[s.weakChip, { backgroundColor: theme.colors.success }]}>
                <Ionicons name="trophy" size={11} color="#FFF" />
                <Text style={s.weakChipTxt}>{overall.strong_count} strong</Text>
              </View>
            </View>
            <View style={{ marginTop: 10, gap: 8 }}>
              {top_strong.map((t: any, i: number) => (
                <View key={i} style={s.topicRow}>
                  <View style={[s.topicBadge, { backgroundColor: theme.colors.success + '18' }]}>
                    <Ionicons name="checkmark-circle" size={11} color={theme.colors.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.topicName}>{t.topic}</Text>
                    <Text style={s.topicMeta}>{t.subject} • {t.attempts} attempts</Text>
                  </View>
                  <Text style={[s.topicAcc, { color: theme.colors.success }]}>{t.accuracy}%</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Subject breakdown */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Subject Breakdown</Text>
          <View style={{ marginTop: 10, gap: 10 }}>
            {subjects.map((sj: any, i: number) => (
              <SubjectCard key={i} sj={sj} />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function SubjectCard({ sj }: { sj: any }) {
  const [open, setOpen] = useState(false);
  const acc = sj.accuracy;
  const delta = sj.vs_peer_delta;
  return (
    <Pressable style={s.subjCard} onPress={() => setOpen((v) => !v)}>
      <View style={s.subjHead}>
        <View style={{ flex: 1 }}>
          <Text style={s.subjName}>{sj.subject}</Text>
          <Text style={s.subjMeta}>{sj.total_topics} topics • {sj.classes_attended}/{sj.classes_total} classes</Text>
        </View>
        <View style={s.accBox}>
          <Text style={[s.accVal, { color: acc >= 75 ? theme.colors.success : acc >= 55 ? theme.colors.warning : theme.colors.error }]}>
            {acc}%
          </Text>
          <View style={[s.deltaChip, { backgroundColor: delta >= 0 ? theme.colors.success + '18' : theme.colors.error + '18' }]}>
            <Ionicons name={delta >= 0 ? 'arrow-up' : 'arrow-down'} size={9} color={delta >= 0 ? theme.colors.success : theme.colors.error} />
            <Text style={[s.deltaTxt, { color: delta >= 0 ? theme.colors.success : theme.colors.error }]}>
              {Math.abs(delta)} vs peers
            </Text>
          </View>
        </View>
      </View>
      <View style={s.accBar}>
        <View style={[s.accBarFill, { width: `${acc}%`, backgroundColor: acc >= 75 ? theme.colors.success : acc >= 55 ? theme.colors.warning : theme.colors.error }]} />
      </View>

      {open && (
        <View style={s.subjExp}>
          <View style={s.miniStats}>
            <View style={s.miniStat}>
              <Text style={s.miniVal}>{sj.attempts}</Text>
              <Text style={s.miniLbl}>Attempts</Text>
            </View>
            <View style={s.miniStat}>
              <Text style={s.miniVal}>{sj.avg_time_sec}s</Text>
              <Text style={s.miniLbl}>Avg time</Text>
            </View>
            <View style={s.miniStat}>
              <Text style={s.miniVal}>{sj.attendance_pct}%</Text>
              <Text style={s.miniLbl}>Attendance</Text>
            </View>
          </View>
          {sj.weak_topics?.length ? (
            <View style={{ marginTop: 10 }}>
              <Text style={s.expTitle}>Weak topics</Text>
              {sj.weak_topics.map((t: any, i: number) => (
                <View key={i} style={s.miniTopicRow}>
                  <View style={[s.miniDot, { backgroundColor: theme.colors.error }]} />
                  <Text style={s.miniTopicTxt}>{t.topic}</Text>
                  <Text style={s.miniTopicAcc}>{t.accuracy}%</Text>
                </View>
              ))}
            </View>
          ) : null}
          {/* Sparkline */}
          <View style={s.spark}>
            {sj.trend.map((v: number, i: number) => (
              <View key={i} style={[s.sparkBar, { height: Math.max(4, v * 0.4), backgroundColor: theme.colors.brand + '55' }]} />
            ))}
          </View>
          <Text style={s.spLbl}>Accuracy trend (last 6 weeks)</Text>
        </View>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surfaceSecondary },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface },
  header: { paddingHorizontal: 16, paddingBottom: 22, paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 6, paddingBottom: 12 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  title: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 11.5, fontWeight: '600', marginTop: 2 },
  kpiRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  kpi: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 12, borderRadius: 14 },
  kpiVal: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  kpiLbl: { color: 'rgba(255,255,255,0.85)', fontSize: 10.5, fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },
  card: { backgroundColor: theme.colors.surface, marginHorizontal: 16, borderRadius: 18, padding: 14, marginTop: 12, borderWidth: 1, borderColor: theme.colors.border },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15.5, fontWeight: '900', color: theme.colors.onSurface },
  cardSub: { fontSize: 11, color: theme.colors.muted, fontWeight: '700' },

  // Chart
  chartRow: { flexDirection: 'row', gap: 8, height: 140, alignItems: 'flex-end', marginTop: 12 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { flex: 1, width: '100%', backgroundColor: theme.colors.surfaceSecondary, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 6 },
  barVal: { fontSize: 10, fontWeight: '900', color: theme.colors.onSurface },
  barLbl: { fontSize: 10, color: theme.colors.muted, fontWeight: '700' },

  // AI Tips
  tipsCard: { marginHorizontal: 16, borderRadius: 18, padding: 14, marginTop: 12, backgroundColor: theme.colors.brandTertiary, borderWidth: 1, borderColor: theme.colors.brand + '22' },
  tipsHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tipsTitle: { fontSize: 14, fontWeight: '900', color: theme.colors.brand },
  tipRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  tipDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center' },
  tipDotTxt: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  tipTxt: { flex: 1, fontSize: 12.5, color: theme.colors.onSurface, fontWeight: '600', lineHeight: 18 },

  // Topic rows
  weakChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.error, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  weakChipTxt: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  topicRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.surfaceSecondary, padding: 10, borderRadius: 10 },
  topicBadge: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  topicName: { fontSize: 12.5, fontWeight: '800', color: theme.colors.onSurface },
  topicMeta: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '700', marginTop: 2 },
  topicAcc: { fontSize: 14, fontWeight: '900' },

  // Subject card
  subjCard: { padding: 12, borderRadius: 14, backgroundColor: theme.colors.surfaceSecondary, borderWidth: 1, borderColor: theme.colors.border },
  subjHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subjName: { fontSize: 13.5, fontWeight: '900', color: theme.colors.onSurface },
  subjMeta: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '700', marginTop: 2 },
  accBox: { alignItems: 'flex-end', gap: 3 },
  accVal: { fontSize: 18, fontWeight: '900' },
  deltaChip: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  deltaTxt: { fontSize: 9.5, fontWeight: '900' },
  accBar: { height: 6, backgroundColor: theme.colors.border, borderRadius: 3, marginTop: 10, overflow: 'hidden' },
  accBarFill: { height: '100%', borderRadius: 3 },
  subjExp: { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
  miniStats: { flexDirection: 'row', gap: 8 },
  miniStat: { flex: 1, alignItems: 'center', padding: 8, backgroundColor: theme.colors.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border },
  miniVal: { fontSize: 14, fontWeight: '900', color: theme.colors.onSurface },
  miniLbl: { fontSize: 9.5, color: theme.colors.muted, fontWeight: '700', marginTop: 2 },
  expTitle: { fontSize: 11, fontWeight: '900', color: theme.colors.brand, letterSpacing: 0.5, marginBottom: 6 },
  miniTopicRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  miniDot: { width: 6, height: 6, borderRadius: 3 },
  miniTopicTxt: { flex: 1, fontSize: 11.5, color: theme.colors.onSurface, fontWeight: '700' },
  miniTopicAcc: { fontSize: 11, color: theme.colors.error, fontWeight: '900' },
  spark: { flexDirection: 'row', gap: 4, alignItems: 'flex-end', height: 40, marginTop: 12 },
  sparkBar: { flex: 1, borderRadius: 3 },
  spLbl: { fontSize: 10, color: theme.colors.muted, fontWeight: '700', marginTop: 6, textAlign: 'center' },
});
