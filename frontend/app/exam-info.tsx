import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Platform, StatusBar as RNStatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { useCategory } from '@/src/CategoryContext';

const QUICK_CHIPS = [
  { id: 'syllabus', label: 'Syllabus', icon: 'book-outline' as any },
  { id: 'pattern', label: 'Pattern', icon: 'grid-outline' as any },
  { id: 'cutoff', label: 'Cut-off', icon: 'analytics-outline' as any },
  { id: 'dates', label: 'Calendar', icon: 'calendar-outline' as any },
];

export default function ExamInfoScreen() {
  const router = useRouter();
  const { category, categoryId } = useCategory();
  const [exams, setExams] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'syllabus' | 'pattern' | 'cutoff' | 'dates'>('syllabus');

  const load = useCallback(async () => {
    try {
      const r = await api.examInfo(categoryId || undefined);
      setExams(r.exams || []);
      if ((r.exams || []).length > 0) setSelectedId(r.exams[0].id);
    } catch (e) { console.warn('exam info', e); }
  }, [categoryId]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const selected: any = exams.find((e) => e.id === selectedId) || exams[0];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surfaceSecondary }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Hero */}
      <LinearGradient colors={[theme.colors.brand, theme.colors.brandDark]} style={s.hero}>
        <SafeAreaView edges={['top']}>
          <View style={s.headerRow}>
            <Pressable onPress={() => router.back()} testID="exam-info-back" hitSlop={12} style={s.iconBtn}>
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </Pressable>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <Text style={s.headerTitle}>Exam Info</Text>
              <Text style={s.headerSub}>{category?.name || 'All Exams'} • {exams.length} exams</Text>
            </View>
            <MaterialCommunityIcons name="clipboard-list-outline" size={26} color="rgba(255,255,255,0.35)" />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.brand} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Exam chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.examChipsRow}>
          {exams.map((e) => {
            const active = e.id === selectedId;
            return (
              <Pressable
                key={e.id}
                testID={`exam-chip-${e.id}`}
                onPress={() => setSelectedId(e.id)}
                style={[s.examChip, active && s.examChipActive]}
              >
                <Text style={[s.examChipTxt, active && s.examChipTxtActive]}>{e.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {selected && (
          <>
            {/* Overview card */}
            <View style={s.card}>
              <Text style={s.examTitle}>{selected.full_name}</Text>
              <Text style={s.examSub}>{selected.conducting_body} • {selected.mode}</Text>
              <View style={s.statsRow}>
                <StatMini icon="people-outline" val={String(selected.posts)} lbl="Posts" />
                <StatMini icon="cash-outline" val={selected.salary} lbl="Salary" />
                <StatMini icon="language-outline" val={selected.language} lbl="Language" />
              </View>
              <View style={s.eligBox}>
                <Ionicons name="ribbon-outline" size={16} color={theme.colors.brand} />
                <Text style={s.eligTxt}>{selected.eligibility}</Text>
              </View>
            </View>

            {/* Tab pills */}
            <View style={s.pillRow}>
              {QUICK_CHIPS.map((c) => (
                <Pressable
                  key={c.id}
                  testID={`exam-tab-${c.id}`}
                  style={[s.pill, tab === c.id && s.pillActive]}
                  onPress={() => setTab(c.id as any)}
                >
                  <Ionicons name={c.icon} size={13} color={tab === c.id ? '#FFF' : theme.colors.brand} />
                  <Text style={[s.pillTxt, tab === c.id && s.pillTxtActive]}>{c.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Tab content */}
            {tab === 'syllabus' && (
              <View style={s.card}>
                <Text style={s.cardTitle}>Syllabus</Text>
                {Object.entries(selected.syllabus || {}).map(([stage, topics]: any) => (
                  <View key={stage} style={{ marginTop: 12 }}>
                    <Text style={s.stageTitle}>{stage}</Text>
                    <View style={{ marginTop: 6, gap: 6 }}>
                      {(topics as string[]).map((topic: string, i: number) => (
                        <View key={i} style={s.topicRow}>
                          <View style={s.topicDot} />
                          <Text style={s.topicTxt}>{topic}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {tab === 'pattern' && (
              <View style={s.card}>
                <Text style={s.cardTitle}>Exam Pattern</Text>
                <View style={s.tblHead}>
                  <Text style={[s.tblCell, { flex: 2 }]}>Stage</Text>
                  <Text style={s.tblCell}>Qs</Text>
                  <Text style={s.tblCell}>Marks</Text>
                  <Text style={[s.tblCell, { flex: 1.4 }]}>Duration</Text>
                </View>
                {(selected.pattern || []).map((r: any, i: number) => (
                  <View key={i} style={s.tblRow}>
                    <Text style={[s.tblCell, { flex: 2, fontWeight: '800', color: theme.colors.onSurface }]} numberOfLines={2}>{r.stage}</Text>
                    <Text style={s.tblCell}>{r.questions || '—'}</Text>
                    <Text style={s.tblCell}>{r.marks}</Text>
                    <Text style={[s.tblCell, { flex: 1.4 }]} numberOfLines={1}>{r.duration}</Text>
                  </View>
                ))}
              </View>
            )}

            {tab === 'cutoff' && (
              <View style={s.card}>
                <Text style={s.cardTitle}>Previous Year Cut-offs</Text>
                <Text style={s.cardSub}>Approximate marks based on last-year trend</Text>
                {(selected.cutoff_prev_year || []).map((c: any, i: number) => (
                  <View key={i} style={s.cutRow}>
                    <View style={[s.catChip, i === 0 && { backgroundColor: theme.colors.brand }]}>
                      <Text style={[s.catChipTxt, i === 0 && { color: '#FFF' }]}>{c.cat}</Text>
                    </View>
                    <View style={s.cutValCol}>
                      <Text style={s.cutLbl}>Prelims</Text>
                      <Text style={s.cutVal}>{c.prelims}</Text>
                    </View>
                    <View style={s.cutValCol}>
                      <Text style={s.cutLbl}>Mains</Text>
                      <Text style={s.cutVal}>{c.mains}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {tab === 'dates' && (
              <View style={s.card}>
                <Text style={s.cardTitle}>Exam Calendar</Text>
                <View style={{ marginTop: 8 }}>
                  {(selected.important_dates || []).map((d: any, i: number) => (
                    <View key={i} style={s.dateRow}>
                      <View style={s.dateDot} />
                      <Text style={s.dateEvent}>{d.event}</Text>
                      <View style={{ flex: 1 }} />
                      <Text style={s.dateVal}>{d.date}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function StatMini({ icon, val, lbl }: { icon: any; val: string; lbl: string }) {
  return (
    <View style={s.stat}>
      <Ionicons name={icon} size={14} color={theme.colors.brand} />
      <Text style={s.statVal}>{val}</Text>
      <Text style={s.statLbl}>{lbl}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 6 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2, fontWeight: '600' },
  examChipsRow: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  examChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  examChipActive: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
  examChipTxt: { fontSize: 12.5, fontWeight: '800', color: theme.colors.onSurface },
  examChipTxtActive: { color: '#FFF' },
  card: { backgroundColor: theme.colors.surface, marginHorizontal: 16, marginTop: 12, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border },
  examTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.onSurface },
  examSub: { fontSize: 12, color: theme.colors.muted, marginTop: 3, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  stat: { flex: 1, backgroundColor: theme.colors.brandTertiary, padding: 10, borderRadius: 12, alignItems: 'flex-start' },
  statVal: { fontSize: 14, fontWeight: '900', color: theme.colors.onSurface, marginTop: 6 },
  statLbl: { fontSize: 10, color: theme.colors.muted, marginTop: 2, fontWeight: '700', letterSpacing: 0.3 },
  eligBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 12, padding: 10, borderRadius: 12, backgroundColor: theme.colors.surfaceSecondary },
  eligTxt: { flex: 1, fontSize: 12.5, color: theme.colors.onSurfaceSecondary, lineHeight: 18 },
  pillRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 12, flexWrap: 'wrap' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: theme.colors.brandTertiary },
  pillActive: { backgroundColor: theme.colors.brand },
  pillTxt: { color: theme.colors.brand, fontSize: 12, fontWeight: '800' },
  pillTxtActive: { color: '#FFF' },
  cardTitle: { fontSize: 15, fontWeight: '900', color: theme.colors.onSurface },
  cardSub: { fontSize: 11.5, color: theme.colors.muted, marginTop: 2, fontWeight: '600' },
  stageTitle: { fontSize: 13, fontWeight: '900', color: theme.colors.brand, textTransform: 'uppercase', letterSpacing: 0.4 },
  topicRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  topicDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.brand },
  topicTxt: { flex: 1, fontSize: 13, color: theme.colors.onSurfaceSecondary, fontWeight: '600' },
  tblHead: { flexDirection: 'row', marginTop: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  tblRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  tblCell: { flex: 1, fontSize: 12, color: theme.colors.onSurfaceSecondary, fontWeight: '700' },
  cutRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, padding: 10, borderRadius: 12, backgroundColor: theme.colors.surfaceSecondary },
  catChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: theme.colors.brandTertiary },
  catChipTxt: { fontSize: 11, fontWeight: '900', color: theme.colors.brand },
  cutValCol: { flex: 1, alignItems: 'center' },
  cutLbl: { fontSize: 10, color: theme.colors.muted, fontWeight: '700', letterSpacing: 0.3 },
  cutVal: { fontSize: 15, fontWeight: '900', color: theme.colors.onSurface, marginTop: 2 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  dateDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.brand },
  dateEvent: { fontSize: 13, color: theme.colors.onSurface, fontWeight: '700' },
  dateVal: { fontSize: 12, color: theme.colors.muted, fontWeight: '800' },
});
