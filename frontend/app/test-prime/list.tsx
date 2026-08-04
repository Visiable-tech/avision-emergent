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
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';

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
  const [exam, setExam] = useState<any>(null);
  const [ent, setEnt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [attemptByTest, setAttemptByTest] = useState<Record<string, any>>({});

  const type = (params.type as string) || undefined;
  const examId = (params.exam as string) || undefined;

  const load = useCallback(async () => {
    if (!examId) return;
    try {
      const [tr, e, at] = await Promise.all([
        api.tpTests({
          exam: examId,
          type: type?.replace('-prelims', '').replace('-mains', ''),
          user_id: user?.user_id,
          limit: 100,
        }),
        api.tpExamDetail(examId).catch(() => null),
        user?.user_id
          ? api.tpListAttempts(user.user_id, 50).catch(() => ({ attempts: [] }))
          : Promise.resolve({ attempts: [] }),
      ]);
      setTests(tr.tests || []);
      setEnt(tr.entitlement);
      setExam(e);
      // build map: latest submitted attempt per test
      const map: Record<string, any> = {};
      (at.attempts || []).forEach((a: any) => {
        if (a.status === 'submitted' && !map[a.test_id]) map[a.test_id] = a;
      });
      setAttemptByTest(map);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [examId, type, user?.user_id]);

  useEffect(() => {
    load();
  }, [load]);

  const isPrime = !!ent?.is_prime;

  const stageFilter: string | null = useMemo(() => {
    if (!type) return null;
    if (type.includes('prelims')) return 'prelims';
    if (type.includes('mains')) return 'mains';
    return null;
  }, [type]);

  const filtered = useMemo(() => {
    let list = tests;
    if (stageFilter) {
      const matched = list.filter((t) => {
        const name = (t.name || '').toLowerCase();
        const stage = (t.stage || '').toLowerCase();
        if (stageFilter === 'prelims') return name.includes('prelims') || stage.includes('prelim');
        if (stageFilter === 'mains') return name.includes('mains') || name.includes('main') || stage.includes('main');
        return true;
      });
      // If nothing matches the stage filter, fall back to full list — patterns may not tag stage per-test
      if (matched.length > 0) list = matched;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q));
    }
    return list;
  }, [tests, stageFilter, search]);

  // status per test
  const todayISO = new Date().toISOString().slice(0, 10);
  const statusFor = (t: any): 'coming' | 'analysis' | 'start' => {
    if (attemptByTest[t.id]) return 'analysis';
    if (t.published_at && t.published_at > todayISO) return 'coming';
    return 'start';
  };

  const onStart = (t: any) => {
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
              router.push(`/test-prime/test/${t.id}` as any);
            } catch {}
          },
        },
      ]);
      return;
    }
    router.push(`/test-prime/test/${t.id}` as any);
  };

  const onAnalysis = (t: any) => {
    const att = attemptByTest[t.id];
    if (att?.attempt_id) {
      router.push(`/test-prime/analytics/${att.attempt_id}` as any);
    }
  };

  const headerTitle = (exam?.name || (params.stage as string) || (params.title as string) || 'Mock Tests').toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>
      <Stack.Screen options={{ headerShown: false, animation: 'slide_from_right' }} />

      {/* Header — solid navy */}
      <SafeAreaView edges={['top']} style={s.hero}>
        <View style={s.headRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.iconBtn} testID="tl-back">
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </Pressable>
          <Text style={s.title} numberOfLines={1}>{headerTitle}</Text>
          <View style={{ width: 30 }} />
        </View>

        {/* Search inline */}
        {tests.length > 3 && (
          <View style={s.searchWrap}>
            <Ionicons name="search-outline" size={14} color="rgba(255,255,255,0.7)" />
            <TextInput
              testID="tl-search"
              value={search}
              onChangeText={setSearch}
              placeholder="Search test…"
              placeholderTextColor="rgba(255,255,255,0.6)"
              style={s.searchInput}
            />
            {!!search && (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={14} color="rgba(255,255,255,0.7)" />
              </Pressable>
            )}
          </View>
        )}
      </SafeAreaView>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color="#0B4DB8" size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={54} color="#94A3B8" />
          <Text style={s.emptyTxt}>No tests found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 + insets.bottom }} showsVerticalScrollIndicator={false}>
          {filtered.map((t) => {
            const st = statusFor(t);
            const locked = !t.is_free && !isPrime && st === 'start';
            return (
              <View key={t.id} style={s.card}>
                <View style={s.topRow}>
                  <View style={s.lockIcon}>
                    <MaterialCommunityIcons
                      name={locked ? 'lock-outline' : 'lock-open-variant-outline'}
                      size={16}
                      color={locked ? '#F87171' : '#10B981'}
                    />
                  </View>
                  <Text style={s.testName} numberOfLines={2}>
                    {(t.name || '').toUpperCase()}
                  </Text>

                  {st === 'coming' ? (
                    <View style={[s.actionBtn, s.actionComing]}>
                      <Text style={s.actionComingTxt}>Coming Soon</Text>
                    </View>
                  ) : st === 'analysis' ? (
                    <Pressable
                      onPress={() => onAnalysis(t)}
                      style={({ pressed }) => [s.actionBtn, s.actionAnalysis, pressed && s.pressed]}
                      testID={`tl-analysis-${t.id}`}
                    >
                      <Text style={s.actionAnalysisTxt}>View Analysis</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => onStart(t)}
                      style={({ pressed }) => [s.actionBtn, s.actionStart, pressed && s.pressed]}
                      testID={`tl-start-${t.id}`}
                    >
                      <Text style={s.actionStartTxt}>Start Test</Text>
                    </Pressable>
                  )}
                </View>

                <View style={s.metaBar}>
                  <MetaCol label="Questions" value={String(t.questions)} />
                  <MetaCol label="Marks" value={String(t.marks)} />
                  <MetaCol label="Time" value={`${t.duration_min} minutes`} />
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function MetaCol({ label, value }: any) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={s.metaLbl}>{label}</Text>
      <Text style={s.metaVal}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  hero: {
    backgroundColor: '#0B4DB8',
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0,
    ...Platform.select({
      ios: { shadowColor: '#0B4DB8', shadowOpacity: 0.24, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  headRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  iconBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  title: {
    flex: 1,
    textAlign: 'left',
    color: '#FFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1,
    marginLeft: 14,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#FFF', paddingVertical: 0 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTxt: { color: '#64748B', fontSize: 13, marginTop: 12, fontWeight: '600' },

  // Card
  card: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 0,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 3 }, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 14 },
  lockIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  testName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.3,
    lineHeight: 19,
  },

  actionBtn: {
    minWidth: 108,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionStart: { backgroundColor: '#2E7EF7' },
  actionStartTxt: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  actionAnalysis: { backgroundColor: '#2FA84F' },
  actionAnalysisTxt: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  actionComing: { backgroundColor: '#F4A6A6' },
  actionComingTxt: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  pressed: { transform: [{ scale: 0.96 }], opacity: 0.9 },

  metaBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    marginHorizontal: -14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  metaLbl: { fontSize: 13, color: '#2563EB', fontWeight: '700' },
  metaVal: { fontSize: 13, color: '#94A3B8', marginTop: 6, fontWeight: '500' },
});
