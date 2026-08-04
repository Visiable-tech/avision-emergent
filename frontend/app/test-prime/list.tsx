import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  StatusBar as RNStatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';

// Soft gradient palette (Material 3-ish) rotated across cards
const CARD_GRADIENTS: [string, string, string][] = [
  ['#3B82F6', '#2563EB', '#1D4ED8'],   // Blue
  ['#10B981', '#059669', '#047857'],   // Green
  ['#8B5CF6', '#7C3AED', '#6D28D9'],   // Purple
  ['#F97316', '#EA580C', '#C2410C'],   // Orange
  ['#EC4899', '#DB2777', '#BE185D'],   // Pink
  ['#06B6D4', '#0891B2', '#0E7490'],   // Cyan
  ['#14B8A6', '#0D9488', '#0F766E'],   // Teal
  ['#6366F1', '#4F46E5', '#4338CA'],   // Indigo
];

const CARD_ICONS = [
  'book-education',
  'shield-crown',
  'ticket-percent',
  'lightning-bolt',
  'star-four-points',
  'trophy-award',
  'medal',
  'chart-bar',
];

// Human-readable title map for known type keys
const TYPE_TITLES: Record<string, { title: string; subtitle: string; icon: string }> = {
  'full-mock': { title: 'Full Length Mocks', subtitle: 'Full syllabus • Real exam pattern', icon: 'clipboard-text' },
  'full-mock-prelims': { title: 'Prelims Full Mocks', subtitle: 'Prelims pattern • Full length', icon: 'clipboard-text' },
  'full-mock-mains': { title: 'Mains Full Mocks', subtitle: 'Mains pattern • Full length', icon: 'clipboard-check' },
  'sectional': { title: 'Sectional Mocks', subtitle: 'One section at a time', icon: 'view-grid' },
  'topic': { title: 'Topic-Wise Mocks', subtitle: 'Master one topic per test', icon: 'target' },
  'subject': { title: 'Subject Practice', subtitle: 'Deep-dive subject tests', icon: 'book-open-variant' },
  'memory-based': { title: 'Memory-Based Mocks', subtitle: 'Actual questions recalled by aspirants', icon: 'brain' },
  'pyq': { title: 'Previous Year Papers', subtitle: 'Real past papers with solutions', icon: 'history' },
  'speed': { title: 'Speed Tests', subtitle: '10 mins • Accuracy race', icon: 'speedometer' },
  'special': { title: 'Special Mocks', subtitle: 'Curated by our experts', icon: 'star' },
};

export default function TestsList() {
  const params = useLocalSearchParams<{
    exam?: string;
    type?: string;
    title?: string;
    subtitle?: string;
    stage?: string;
    color?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [tests, setTests] = useState<any[]>([]);
  const [ent, setEnt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const type = (params.type as string) || undefined;
  const examId = (params.exam as string) || undefined;

  const meta = TYPE_TITLES[type || ''] || {
    title: (params.title as string) || 'Mock Tests',
    subtitle: (params.subtitle as string) || 'Select a test to begin',
    icon: 'clipboard-text',
  };
  const title = (params.title as string) || meta.title;
  const subtitle = (params.subtitle as string) || meta.subtitle;

  const load = useCallback(async () => {
    try {
      const r = await api.tpTests({
        exam: examId,
        type: type && !type.includes('prelims') && !type.includes('mains') ? type : type?.replace('-prelims', '').replace('-mains', ''),
        user_id: user?.user_id,
        limit: 100,
      });
      setTests(r.tests || []);
      setEnt(r.entitlement);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [examId, type, user?.user_id]);

  useEffect(() => {
    load();
  }, [load]);

  const isPrime = !!ent?.is_prime;

  // Client-side stage filter (Prelims / Mains) when type explicitly has that variant
  const stageFilter: string | null = useMemo(() => {
    if (!type) return null;
    if (type.includes('prelims')) return 'prelims';
    if (type.includes('mains') || type.includes('mains')) return 'mains';
    return null;
  }, [type]);

  const filtered = useMemo(() => {
    let list = tests;
    if (stageFilter) {
      list = list.filter((t) => {
        const name = (t.name || '').toLowerCase();
        const stage = (t.stage || '').toLowerCase();
        if (stageFilter === 'prelims') return name.includes('prelims') || stage.includes('prelim');
        if (stageFilter === 'mains') return name.includes('mains') || name.includes('main') || stage.includes('main');
        return true;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q));
    }
    return list;
  }, [tests, stageFilter, search]);

  const startTest = async (t: any) => {
    if (!user?.user_id) {
      Alert.alert('Sign in required', 'Please log in to attempt a test.');
      return;
    }
    if (!t.is_free && !isPrime) {
      Alert.alert('Prime Required', 'Activate Test Prime to unlock this test.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          onPress: async () => {
            try {
              const r = await api.tpActivate(user.user_id, 'prime', 365);
              setEnt(r);
              startTest(t);
            } catch {}
          },
        },
      ]);
      return;
    }
    try {
      setStarting(t.id);
      const attempt = await api.tpStartAttempt(user.user_id, t.id);
      router.push(`/test-prime/attempt/${attempt.attempt_id}` as any);
    } catch (e: any) {
      Alert.alert('Could not start', e?.message || 'Please try again.');
    } finally {
      setStarting(null);
    }
  };

  const headerColor = (params.color as string) || '#1E3A8A';

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Stack.Screen options={{ headerShown: false, animation: 'slide_from_right' }} />

      {/* Hero */}
      <LinearGradient
        colors={[headerColor, '#4F46E5', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.hero}
      >
        <View style={s.heroGlow} />
        <SafeAreaView edges={['top']}>
          <View style={s.headRow}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={s.iconBtn} testID="tl-back">
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </Pressable>
            <View style={{ flex: 1, marginHorizontal: 8 }}>
              <View style={s.stageChip}>
                <MaterialCommunityIcons name={meta.icon as any} size={11} color="#FCD34D" />
                <Text style={s.stageChipTxt}>{(params.stage as string) || (title || '').toUpperCase()}</Text>
              </View>
              <Text style={s.title}>{title}</Text>
              <Text style={s.subtitle}>{subtitle}</Text>
            </View>
          </View>

          {/* Search */}
          <View style={s.searchWrap}>
            <Ionicons name="search-outline" size={14} color="rgba(255,255,255,0.7)" />
            <TextInput
              testID="tl-search"
              value={search}
              onChangeText={setSearch}
              placeholder="Search test name…"
              placeholderTextColor="rgba(255,255,255,0.6)"
              style={s.searchInput}
            />
            {!!search && (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={14} color="rgba(255,255,255,0.7)" />
              </Pressable>
            )}
          </View>

          {/* Stats bar */}
          <View style={s.statsRow}>
            <View style={s.stat}>
              <Text style={s.statVal}>{filtered.length}</Text>
              <Text style={s.statLbl}>Total Tests</Text>
            </View>
            <View style={s.statSep} />
            <View style={s.stat}>
              <Text style={s.statVal}>{filtered.filter((t) => t.is_free).length}</Text>
              <Text style={s.statLbl}>Free Tests</Text>
            </View>
            <View style={s.statSep} />
            <View style={s.stat}>
              <Text style={[s.statVal, { color: isPrime ? '#A7F3D0' : '#FCD34D' }]}>
                {isPrime ? 'ACTIVE' : 'LOCKED'}
              </Text>
              <Text style={s.statLbl}>Prime</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color="#2563EB" size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={54} color="#94A3B8" />
          <Text style={s.emptyTxt}>No tests found in this section.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }} showsVerticalScrollIndicator={false}>
          {filtered.map((t, idx) => {
            const grad = CARD_GRADIENTS[idx % CARD_GRADIENTS.length];
            const icon = CARD_ICONS[idx % CARD_ICONS.length];
            const locked = !t.is_free && !isPrime;
            return (
              <Pressable
                key={t.id}
                onPress={() => startTest(t)}
                disabled={starting === t.id}
                style={({ pressed }) => [
                  s.card,
                  pressed && s.cardPressed,
                ]}
                testID={`tl-test-${t.id}`}
              >
                <LinearGradient
                  colors={grad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.cardGrad}
                >
                  <View style={s.cardShine} />
                  <View style={s.cardTop}>
                    <View style={s.cardIcon}>
                      <MaterialCommunityIcons name={icon as any} size={22} color="#FFF" />
                    </View>
                    <View style={[s.diffPill, {
                      backgroundColor: t.difficulty === 'Hard' ? 'rgba(220,38,38,0.85)' : t.difficulty === 'Easy' ? 'rgba(16,185,129,0.85)' : 'rgba(245,158,11,0.85)',
                    }]}>
                      <Text style={s.diffTxt}>{(t.difficulty || 'Medium').toUpperCase()}</Text>
                    </View>
                  </View>

                  <Text style={s.cardTitle} numberOfLines={2}>{t.name}</Text>

                  <View style={s.metaRow}>
                    <View style={s.metaChip}>
                      <MaterialCommunityIcons name="format-list-bulleted" size={11} color="#FFF" />
                      <Text style={s.metaTxt}>{t.questions} Qs</Text>
                    </View>
                    <View style={s.metaChip}>
                      <Ionicons name="calculator-outline" size={11} color="#FFF" />
                      <Text style={s.metaTxt}>{t.marks} marks</Text>
                    </View>
                    <View style={s.metaChip}>
                      <Ionicons name="time-outline" size={11} color="#FFF" />
                      <Text style={s.metaTxt}>{t.duration_min} min</Text>
                    </View>
                  </View>

                  <View style={s.cardFooter}>
                    <View style={s.tagRow}>
                      {t.is_free ? (
                        <View style={s.freeTag}>
                          <Ionicons name="flash" size={10} color="#065F46" />
                          <Text style={s.freeTagTxt}>FREE</Text>
                        </View>
                      ) : (
                        <View style={s.primeTag}>
                          <MaterialCommunityIcons name="crown" size={10} color="#78350F" />
                          <Text style={s.primeTagTxt}>PRIME</Text>
                        </View>
                      )}
                      <View style={s.attemptTag}>
                        <Ionicons name="people-outline" size={10} color="rgba(255,255,255,0.9)" />
                        <Text style={s.attemptTagTxt}>{(t.attempts_count || 0).toLocaleString()} attempted</Text>
                      </View>
                    </View>
                    <View style={s.playBtn}>
                      {starting === t.id ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : locked ? (
                        <Ionicons name="lock-closed" size={16} color="#FFF" />
                      ) : (
                        <Ionicons name="play" size={16} color="#FFF" />
                      )}
                    </View>
                  </View>
                </LinearGradient>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    overflow: 'hidden',
  },
  heroGlow: { position: 'absolute', top: -100, right: -80, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(252,211,77,0.18)' },
  headRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 6 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  stageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(252,211,77,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(252,211,77,0.4)',
  },
  stageChipTxt: { color: '#FCD34D', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  title: { color: '#FFF', fontSize: 22, fontWeight: '900', marginTop: 6, letterSpacing: -0.3 },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2, fontWeight: '600' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    marginTop: 16,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#FFF', paddingVertical: 0 },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: 14,
  },
  stat: { flex: 1, alignItems: 'center' },
  statSep: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.2)' },
  statVal: { color: '#FFF', fontSize: 15, fontWeight: '900' },
  statLbl: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '700', marginTop: 2, letterSpacing: 0.4 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTxt: { color: '#64748B', fontSize: 13, marginTop: 12, fontWeight: '600' },

  // Card
  card: {
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14 },
      android: { elevation: 4 },
    }),
  },
  cardPressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  cardGrad: {
    padding: 16,
    minHeight: 168,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  cardShine: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  diffPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  diffTxt: { color: '#FFF', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.5 },
  cardTitle: { color: '#FFF', fontSize: 16.5, fontWeight: '900', lineHeight: 22, marginTop: 12 },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaTxt: { color: '#FFF', fontSize: 10.5, fontWeight: '700' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  tagRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 },
  freeTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#A7F3D0', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  freeTagTxt: { color: '#065F46', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.4 },
  primeTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FCD34D', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  primeTagTxt: { color: '#78350F', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.4 },
  attemptTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  attemptTagTxt: { color: 'rgba(255,255,255,0.95)', fontSize: 9.5, fontWeight: '700' },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
});
