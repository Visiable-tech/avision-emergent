import { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Platform, StatusBar as RNStatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';

const TYPE_TABS = [
  { id: 'all', label: 'All' },
  { id: 'free', label: 'Free' },
  { id: 'full-mock', label: 'Full Mocks' },
  { id: 'sectional', label: 'Sectional' },
  { id: 'subject', label: 'Subject' },
  { id: 'topic', label: 'Topic' },
  { id: 'memory-based', label: 'Memory Based' },
  { id: 'speed', label: 'Speed' },
  { id: 'pyq', label: 'Previous Year' },
  { id: 'daily', label: 'Daily' },
  { id: 'current-affairs', label: 'Current Affairs' },
  { id: 'special', label: 'Special / Live' },
];

const SORTS = [
  { id: 'latest', label: 'Latest' },
  { id: 'popular', label: 'Popular' },
  { id: 'difficulty', label: 'Difficulty' },
];

export default function TestPrimeExamDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [exam, setExam] = useState<any>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [ent, setEnt] = useState<any>(null);
  const [tab, setTab] = useState<string>('all');
  const [sort, setSort] = useState<string>('latest');
  const [filter, setFilter] = useState<'all' | 'attempted' | 'not-attempted' | 'free' | 'prime' | 'bookmarked'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [e, tr] = await Promise.all([
        api.tpExamDetail(id),
        api.tpTests({
          exam: id,
          type: tab === 'all' ? undefined : tab,
          free_only: filter === 'free',
          prime_only: filter === 'prime',
          sort,
          user_id: user?.user_id,
        }),
      ]);
      setExam(e);
      setTests(tr.tests || []);
      setEnt(tr.entitlement);
    } catch (err) { console.warn('exam detail', err); }
  }, [id, tab, sort, filter, user?.user_id]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const activatePrime = async () => {
    if (!user?.user_id) { Alert.alert('Sign in required', 'Please sign in to activate demo Prime.'); return; }
    try { const r = await api.tpActivate(user.user_id, 'prime', 365); setEnt(r); load(); } catch {}
  };

  const isPrime = !!ent?.is_prime;
  const pattern = exam?.pattern;

  const summary = useMemo(() => {
    const total = tests.length;
    const free = tests.filter((t) => t.is_free).length;
    const prime = tests.filter((t) => !t.is_free).length;
    return { total, free, prime };
  }, [tests]);

  if (!exam) {
    return (
      <View style={ss.loading}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="reload-outline" size={22} color={theme.colors.muted} />
        <Text style={{ color: theme.colors.muted, marginTop: 8 }}>Loading exam…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surfaceSecondary }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Hero */}
      <LinearGradient colors={[exam.color || '#0B4DB8', '#000000AA']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={ss.hero}>
        <SafeAreaView edges={['top']}>
          <View style={ss.headerRow}>
            <Pressable onPress={() => router.back()} testID="tpex-back" hitSlop={12} style={ss.iconBtn}>
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </Pressable>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <View style={ss.crownRow}>
                <MaterialCommunityIcons name="crown" size={12} color="#FCD34D" />
                <Text style={ss.crownLabel}>TEST PRIME</Text>
              </View>
            </View>
            {isPrime ? (
              <View style={ss.activeChip}>
                <Text style={ss.activeChipTxt}>PRIME ACTIVE</Text>
              </View>
            ) : (
              <Pressable style={ss.getPrimeBtn} onPress={activatePrime} testID="tpex-activate">
                <MaterialCommunityIcons name="crown" size={11} color="#7C4A0C" />
                <Text style={ss.getPrimeTxt}>Get Prime</Text>
              </Pressable>
            )}
          </View>
          <View style={ss.examTop}>
            <View style={ss.examLogo}>
              <Text style={ss.examLogoTxt}>{exam.logo}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ss.examName}>{exam.name}</Text>
              <Text style={ss.examFull}>{exam.full_name}</Text>
            </View>
          </View>

          {/* Pattern strip */}
          {pattern && (
            <View style={ss.patStrip}>
              <PatStat icon="document-text-outline" val={String(pattern.total_questions)} lbl="Qs" />
              <PatStat icon="calculator-outline" val={String(pattern.total_marks)} lbl="Marks" />
              <PatStat icon="time-outline" val={`${pattern.total_duration_min}m`} lbl="Duration" />
              <PatStat icon="close-circle-outline" val={`-${pattern.negative_marking}`} lbl="Negative" />
              <PatStat icon="ribbon-outline" val={pattern.status || 'V'} lbl={`Pattern ${pattern.version}`} small />
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>

      {/* Type tabs (horizontal) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ss.tabRow} style={{ flexGrow: 0 }}>
        {TYPE_TABS.map((t) => {
          const active = t.id === tab;
          return (
            <Pressable
              key={t.id}
              testID={`tpex-tab-${t.id}`}
              onPress={() => setTab(t.id)}
              style={[ss.tab, active && ss.tabActive]}
            >
              <Text style={[ss.tabTxt, active && ss.tabTxtActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Sort + filter strip */}
      <View style={ss.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ flex: 1 }}>
          {(['all', 'free', 'prime'] as const).map((f) => (
            <Pressable
              key={f}
              testID={`tpex-filter-${f}`}
              onPress={() => setFilter(f)}
              style={[ss.filChip, filter === f && ss.filChipActive]}
            >
              <Text style={[ss.filChipTxt, filter === f && ss.filChipTxtActive]}>{f.toUpperCase()}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {/* Sort */}
        <View style={ss.sortBox}>
          {SORTS.map((so) => (
            <Pressable
              key={so.id}
              testID={`tpex-sort-${so.id}`}
              onPress={() => setSort(so.id)}
              style={[ss.sortChip, sort === so.id && ss.sortChipActive]}
            >
              <Text style={[ss.sortChipTxt, sort === so.id && { color: '#FFF' }]}>{so.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.brand} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary */}
        <View style={ss.sumRow}>
          <Text style={ss.sumTxt}>{summary.total} tests</Text>
          <View style={ss.sumDot} />
          <Text style={ss.sumTxt}>{summary.free} free</Text>
          <View style={ss.sumDot} />
          <MaterialCommunityIcons name="crown" size={11} color="#B7791F" />
          <Text style={[ss.sumTxt, { color: '#B7791F' }]}>{summary.prime} prime</Text>
        </View>

        {tests.map((t) => (
          <Pressable
            key={t.id}
            testID={`tpex-test-${t.id}`}
            style={[ss.testCard, !t.unlocked && ss.testCardLocked]}
            onPress={() => router.push(`/test-prime/test/${t.id}`)}
          >
            {/* Ribbon */}
            <View style={ss.testTop}>
              {t.is_live ? (
                <View style={ss.liveTag}>
                  <View style={ss.livePulse} />
                  <Text style={ss.liveTagTxt}>LIVE</Text>
                </View>
              ) : null}
              <View style={ss.typePill}>
                <Text style={ss.typePillTxt}>{t.type_label}</Text>
              </View>
              <View style={{ flex: 1 }} />
              {t.is_free ? (
                <View style={ss.freeTag}><Text style={ss.freeTagTxt}>FREE</Text></View>
              ) : t.unlocked ? (
                <View style={ss.unlockedTag}>
                  <Ionicons name="checkmark-circle" size={11} color="#065F46" />
                  <Text style={ss.unlockedTagTxt}>UNLOCKED</Text>
                </View>
              ) : (
                <View style={ss.primeTag}>
                  <MaterialCommunityIcons name="crown" size={11} color="#7C4A0C" />
                  <Text style={ss.primeTagTxt}>PRIME</Text>
                </View>
              )}
            </View>

            <Text style={ss.testName} numberOfLines={2}>{t.name}</Text>
            <Text style={ss.stageLbl}>{t.stage} • {t.difficulty}</Text>

            <View style={ss.metaGrid}>
              <MetaChip icon="document-text-outline" val={String(t.questions)} lbl="Qs" />
              <MetaChip icon="calculator-outline" val={String(t.marks)} lbl="Marks" />
              <MetaChip icon="time-outline" val={`${t.duration_min}m`} lbl="Duration" />
              <MetaChip icon="language-outline" val={t.language} lbl="Language" small />
            </View>

            <View style={ss.testBottom}>
              <View style={ss.attemptsWrap}>
                <Ionicons name="people-outline" size={11} color={theme.colors.muted} />
                <Text style={ss.attemptsTxt}>{t.attempts_count.toLocaleString('en-IN')} attempts</Text>
              </View>
              {t.unlocked ? (
                <View style={ss.startBtn}>
                  <Text style={ss.startBtnTxt}>Start Test</Text>
                  <Ionicons name="arrow-forward" size={13} color="#FFF" />
                </View>
              ) : (
                <View style={ss.lockedBtn}>
                  <Ionicons name="lock-closed" size={11} color="#FFF" />
                  <Text style={ss.lockedBtnTxt}>Unlock with Prime</Text>
                </View>
              )}
            </View>
          </Pressable>
        ))}
        {tests.length === 0 && (
          <View style={ss.empty}>
            <Ionicons name="document-outline" size={38} color={theme.colors.mutedLight} />
            <Text style={ss.emptyTxt}>No tests found for this filter.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function PatStat({ icon, val, lbl, small }: any) {
  return (
    <View style={ss.patCol}>
      <Ionicons name={icon} size={12} color="rgba(255,255,255,0.85)" />
      <Text style={[ss.patVal, small && { fontSize: 12 }]} numberOfLines={1}>{val}</Text>
      <Text style={ss.patLbl} numberOfLines={1}>{lbl}</Text>
    </View>
  );
}

function MetaChip({ icon, val, lbl, small }: any) {
  return (
    <View style={ss.metaChip}>
      <Ionicons name={icon} size={12} color={theme.colors.brand} />
      <View style={{ flex: 1 }}>
        <Text style={[ss.metaVal, small && { fontSize: 11 }]} numberOfLines={1}>{val}</Text>
        <Text style={ss.metaLbl}>{lbl}</Text>
      </View>
    </View>
  );
}

const ss = StyleSheet.create({
  loading: { flex: 1, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  hero: { paddingHorizontal: 16, paddingBottom: 18, paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 6 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  crownRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.28)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  crownLabel: { color: '#FCD34D', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  activeChip: { backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  activeChipTxt: { color: '#065F46', fontSize: 10, fontWeight: '900' },
  getPrimeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  getPrimeTxt: { color: '#7C4A0C', fontSize: 11, fontWeight: '900' },
  examTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  examLogo: { backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  examLogoTxt: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 0.6 },
  examName: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  examFull: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  patStrip: { flexDirection: 'row', gap: 8, marginTop: 14 },
  patCol: { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', padding: 8, borderRadius: 10 },
  patVal: { color: '#FFF', fontSize: 14, fontWeight: '900', marginTop: 4 },
  patLbl: { color: 'rgba(255,255,255,0.75)', fontSize: 9, fontWeight: '700', letterSpacing: 0.3, marginTop: 1 },
  tabRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 6, backgroundColor: theme.colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: theme.colors.surfaceSecondary },
  tabActive: { backgroundColor: theme.colors.brand },
  tabTxt: { fontSize: 12.5, fontWeight: '800', color: theme.colors.onSurfaceSecondary },
  tabTxtActive: { color: '#FFF' },
  filterRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8, backgroundColor: theme.colors.surface },
  filChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: theme.colors.surfaceSecondary },
  filChipActive: { backgroundColor: theme.colors.onSurface },
  filChipTxt: { fontSize: 10.5, fontWeight: '800', color: theme.colors.muted, letterSpacing: 0.3 },
  filChipTxtActive: { color: '#FFF' },
  sortBox: { flexDirection: 'row', gap: 4 },
  sortChip: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, backgroundColor: theme.colors.brandTertiary },
  sortChipActive: { backgroundColor: theme.colors.brand },
  sortChipTxt: { fontSize: 10.5, fontWeight: '800', color: theme.colors.brand },
  sumRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sumTxt: { fontSize: 12, color: theme.colors.muted, fontWeight: '700' },
  sumDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: theme.colors.mutedLight },
  testCard: { backgroundColor: theme.colors.surface, borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  testCardLocked: { borderColor: 'rgba(183,121,31,0.35)', backgroundColor: '#FFFBEB' },
  testTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  livePulse: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFF' },
  liveTagTxt: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  typePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: theme.colors.brandTertiary },
  typePillTxt: { fontSize: 10, fontWeight: '900', color: theme.colors.brand, letterSpacing: 0.3 },
  freeTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: '#DCFCE7' },
  freeTagTxt: { color: '#166534', fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  primeTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: '#FEF3C7' },
  primeTagTxt: { color: '#7C4A0C', fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  unlockedTag: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: '#D1FAE5' },
  unlockedTagTxt: { color: '#065F46', fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  testName: { fontSize: 15, fontWeight: '900', color: theme.colors.onSurface, marginTop: 10 },
  stageLbl: { fontSize: 11.5, color: theme.colors.muted, marginTop: 3, fontWeight: '700' },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  metaChip: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 10, backgroundColor: theme.colors.surfaceSecondary },
  metaVal: { fontSize: 13, fontWeight: '800', color: theme.colors.onSurface },
  metaLbl: { fontSize: 10, color: theme.colors.muted, fontWeight: '700' },
  testBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  attemptsWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  attemptsTxt: { fontSize: 11, color: theme.colors.muted, fontWeight: '700' },
  startBtn: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.brand, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  startBtnTxt: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  lockedBtn: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#B7791F', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  lockedBtnTxt: { color: '#FFF', fontSize: 11.5, fontWeight: '900' },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyTxt: { color: theme.colors.muted, fontSize: 13 },
});
