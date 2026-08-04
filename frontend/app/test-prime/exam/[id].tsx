import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
  StatusBar as RNStatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';

// Categories with color coding for the "What You'll Get" grid
const CATEGORY_META: {
  key: string;
  label: string;
  matchTypes: string[];
  color: string;
  routeType: string;
  stageLabel: string;
}[] = [
  { key: 'prelims', label: 'Full Length Mocks-Prelims', matchTypes: ['full-mock'], color: '#7C3AED', routeType: 'full-mock-prelims', stageLabel: 'PRELIMS' },
  { key: 'mains', label: 'Full Length Mocks-Mains', matchTypes: ['full-mock'], color: '#B45309', routeType: 'full-mock-mains', stageLabel: 'MAINS' },
  { key: 'sectional', label: 'Sectional Mocks', matchTypes: ['sectional'], color: '#CA8A04', routeType: 'sectional', stageLabel: 'SECTIONAL' },
  { key: 'topic', label: 'Topic Wise Mocks', matchTypes: ['topic', 'subject'], color: '#10B981', routeType: 'topic', stageLabel: 'TOPIC' },
  { key: 'memory', label: 'Memory Based Mocks', matchTypes: ['memory-based', 'special'], color: '#DB2777', routeType: 'memory-based', stageLabel: 'MEMORY' },
  { key: 'pyq', label: 'Previous Year Paper', matchTypes: ['pyq'], color: '#7C3AED', routeType: 'pyq', stageLabel: 'PYQ' },
];

export default function TestPrimeExamDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [exam, setExam] = useState<any>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [ent, setEnt] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activating, setActivating] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [e, tr] = await Promise.all([
        api.tpExamDetail(id),
        api.tpTests({ exam: id, user_id: user?.user_id }),
      ]);
      setExam(e);
      setTests(tr.tests || []);
      setEnt(tr.entitlement);
    } catch (err) {
      console.warn('exam detail', err);
    }
  }, [id, user?.user_id]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const isPrime = !!ent?.is_prime;

  const freeTests = useMemo(() => tests.filter((t) => t.is_free), [tests]);
  const totalTests = tests.length;

  // Compute per-category counts
  const categoryStats = useMemo(() => {
    return CATEGORY_META.map((c) => {
      const matched = tests.filter((t) => c.matchTypes.includes(t.type));
      // Split "full-mock" between Prelims (~55%) and Mains (~45%) if it's the full-mock bucket
      if (c.key === 'prelims') {
        return { ...c, count: Math.ceil(matched.length * 0.55) };
      }
      if (c.key === 'mains') {
        return { ...c, count: Math.max(1, Math.floor(matched.length * 0.45)) };
      }
      return { ...c, count: matched.length };
    });
  }, [tests]);

  const startFreeTest = (t: any) => {
    if (!user?.user_id) {
      Alert.alert('Sign in required', 'Please log in to attempt a test.');
      return;
    }
    router.push(`/test-prime/test/${t.id}` as any);
  };

  const activatePrime = async () => {
    if (!user?.user_id) {
      Alert.alert('Sign in required', 'Please sign in to activate Prime.');
      return;
    }
    try {
      setActivating(true);
      const r = await api.tpActivate(user.user_id, 'prime', 365);
      setEnt(r);
      await load();
    } catch {
    } finally {
      setActivating(false);
    }
  };

  if (!exam) {
    return (
      <View style={s.loading}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color="#2563EB" size="large" />
        <Text style={{ color: '#64748B', marginTop: 10, fontWeight: '600' }}>Loading exam…</Text>
      </View>
    );
  }

  const languages = (exam.languages || pattern_langs(exam)).join(', ');

  return (
    <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top bar — minimal */}
      <SafeAreaView edges={['top']} style={s.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.iconBtn} testID="tpex-back">
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
        </Pressable>
        <View style={{ flex: 1 }} />
        {isPrime ? (
          <View style={s.primeChip}>
            <MaterialCommunityIcons name="crown" size={11} color="#B45309" />
            <Text style={s.primeChipTxt}>PRIME</Text>
          </View>
        ) : (
          <View style={s.ticketBadge}>
            <MaterialCommunityIcons name="ticket-confirmation" size={20} color="#F59E0B" />
          </View>
        )}
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= HERO CARD ================= */}
        <View style={s.heroCard}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={s.heroTitle}>{exam.name} 2026 Mock Test Series</Text>
            <View style={s.chipRow}>
              <View style={s.stat}>
                <Text style={s.statTxt}>{totalTests} TESTS</Text>
              </View>
              <View style={s.stat}>
                <Text style={s.statTxt}>{freeTests.length} FREE TESTS</Text>
              </View>
            </View>
            <Text style={s.heroSub}>Available in {languages}</Text>
          </View>
          <View style={[s.examLogo, { backgroundColor: `${exam.color || '#2563EB'}15` }]}>
            <Text style={[s.examLogoTxt, { color: exam.color || '#2563EB' }]} numberOfLines={1}>
              {exam.logo || 'iz'}
            </Text>
          </View>
        </View>

        {/* ================= TRY FREE MOCK TESTS ================= */}
        {freeTests.length > 0 && (
          <View style={{ marginTop: 22 }}>
            <Text style={s.sectionTitle}>Try Free Mock Tests</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingRight: 6 }}
            >
              {freeTests.map((t) => (
                <View key={t.id} style={s.freeCard}>
                  <Text style={s.freeCardTitle} numberOfLines={3}>{t.name}</Text>
                  <Text style={s.freeCardMeta}>
                    {t.questions} questions  •  {t.marks} marks  •  {t.duration_min} mins
                  </Text>
                  <Pressable
                    onPress={() => startFreeTest(t)}
                    style={s.freeStartBtn}
                    testID={`tpex-start-${t.id}`}
                  >
                    <Text style={s.freeStartTxt}>START TEST</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ================= WHAT YOU'LL GET ================= */}
        <View style={{ marginTop: 26 }}>
          <Text style={s.sectionTitle}>What You{"'"}ll Get</Text>
          <View style={s.grid}>
            {categoryStats.map((c) => (
              <Pressable
                key={c.key}
                onPress={() =>
                  router.push({
                    pathname: '/test-prime/list',
                    params: {
                      exam: exam.id,
                      type: c.routeType,
                      title: c.label,
                      subtitle: `${exam.name} • ${c.count} tests`,
                      stage: c.stageLabel,
                      color: c.color,
                    },
                  } as any)
                }
                style={({ pressed }) => [s.gridCard, pressed && s.gridCardPressed]}
                testID={`tpex-cat-${c.key}`}
              >
                <Text style={s.gridLabel} numberOfLines={2}>{c.label}</Text>
                <View style={s.gridBottomRow}>
                  {!isPrime ? (
                    <View style={s.lockCircle}>
                      <Ionicons name="lock-closed" size={12} color="#94A3B8" />
                    </View>
                  ) : (
                    <View style={s.unlockCircle}>
                      <Ionicons name="checkmark" size={13} color="#10B981" />
                    </View>
                  )}
                  <Text style={[s.gridCount, { color: c.color }]}>{c.count}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ================= STICKY CTA ================= */}
      {!isPrime && (
        <View style={[s.stickyCTA, { paddingBottom: 12 + insets.bottom }]}>
          <Pressable
            onPress={activatePrime}
            disabled={activating}
            style={s.unlockBtn}
            testID="tpex-unlock"
          >
            {activating ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={s.unlockTxt}>UNLOCK WITH TEST</Text>
                <View style={s.primeTag}>
                  <Text style={s.primeTagTxt}>PRIME</Text>
                </View>
              </>
            )}
          </Pressable>
          <Text style={s.primeSub}>This package is a part of Test Prime</Text>
        </View>
      )}
      {isPrime && (
        <View style={[s.stickyCTA, { paddingBottom: 12 + insets.bottom }]}>
          <View style={s.primeActiveBar}>
            <MaterialCommunityIcons name="crown" size={16} color="#065F46" />
            <Text style={s.primeActiveTxt}>Test Prime Active — All tests unlocked</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function pattern_langs(exam: any): string[] {
  const l = exam?.pattern?.language;
  if (!l) return ['English', 'Hindi'];
  return String(l).split(/[+,/]/).map((x: string) => x.trim()).filter(Boolean);
}

const s = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) + 6 : 6,
    paddingBottom: 10,
    backgroundColor: '#EFF6FF',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  ticketBadge: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  primeChipTxt: { color: '#B45309', fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },

  // Hero card
  heroCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    ...Platform.select({
      ios: { shadowColor: '#0B4DB8', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14 },
      android: { elevation: 2 },
    }),
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 28,
  },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  stat: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statTxt: { fontSize: 10.5, fontWeight: '900', color: '#334155', letterSpacing: 0.6 },
  heroSub: { fontSize: 13, color: '#64748B', marginTop: 14, fontWeight: '500' },
  examLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  examLogoTxt: { fontSize: 15, fontWeight: '900', letterSpacing: 0.4 },

  sectionTitle: { fontSize: 17, fontWeight: '900', color: '#0F172A', marginBottom: 14 },

  // Free tests horizontal cards
  freeCard: {
    width: 240,
    padding: 18,
    backgroundColor: '#FFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    ...Platform.select({
      ios: { shadowColor: '#0B4DB8', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10 },
      android: { elevation: 1 },
    }),
  },
  freeCardTitle: { fontSize: 15, fontWeight: '900', color: '#0F172A', lineHeight: 20, minHeight: 60 },
  freeCardMeta: { fontSize: 12, color: '#64748B', marginTop: 8, fontWeight: '600' },
  freeStartBtn: {
    backgroundColor: '#EFF6FF',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  freeStartTxt: { color: '#2563EB', fontSize: 12.5, fontWeight: '900', letterSpacing: 1.2 },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  gridCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    minHeight: 130,
    justifyContent: 'space-between',
    ...Platform.select({
      ios: { shadowColor: '#0B4DB8', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8 },
      android: { elevation: 1 },
    }),
  },
  gridCardPressed: { transform: [{ scale: 0.98 }], opacity: 0.94 },
  gridLabel: { fontSize: 15, fontWeight: '700', color: '#334155', lineHeight: 20 },
  gridBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  lockCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCount: { fontSize: 28, fontWeight: '900' },

  // Sticky CTA
  stickyCTA: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingTop: 12,
    alignItems: 'center',
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
    backgroundColor: '#EF4444',
    paddingVertical: 15,
    borderRadius: 14,
    ...Platform.select({
      ios: { shadowColor: '#EF4444', shadowOpacity: 0.35, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  unlockTxt: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.8 },
  primeTag: {
    backgroundColor: '#FCD34D',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 4,
  },
  primeTagTxt: { color: '#B45309', fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  primeSub: { fontSize: 12, color: '#64748B', marginTop: 10, fontWeight: '500' },

  primeActiveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'stretch',
    backgroundColor: '#D1FAE5',
    padding: 14,
    borderRadius: 12,
    justifyContent: 'center',
  },
  primeActiveTxt: { color: '#065F46', fontSize: 13, fontWeight: '900' },
});
