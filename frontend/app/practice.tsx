import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Platform, StatusBar as RNStatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';
import { useCategory } from '@/src/CategoryContext';

const PRACTICE_TYPES = [
  { id: 'daily-quiz', label: 'Daily Quiz', icon: 'flash', color: '#F59E0B', tint: '#FEF3C7', route: '/quiz' },
  { id: 'daily-challenge', label: 'Daily Challenge', icon: 'trophy', color: '#EF4444', tint: '#FEE2E2', route: null },
  { id: 'sectional', label: 'Sectional', icon: 'grid', color: '#0B4DB8', tint: '#DBEAFE', route: '/(tabs)/tests' },
  { id: 'full-mock', label: 'Full Mock', icon: 'document-text', color: '#4F46E5', tint: '#E0E7FF', route: '/(tabs)/tests' },
  { id: 'pyq', label: 'PYQ Papers', icon: 'library', color: '#0D9488', tint: '#CCFBF1', route: '/(tabs)/tests' },
  { id: 'speed', label: 'Speed Test', icon: 'speedometer', color: '#EA580C', tint: '#FED7AA', route: '/(tabs)/tests' },
];

export default function PracticeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { categoryId, category } = useCategory();
  const [mocks, setMocks] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [mt, dc] = await Promise.all([
        api.mockTests(categoryId || undefined),
        api.dailyChallenges(categoryId || undefined, user?.user_id),
      ]);
      setMocks(mt.tests || []);
      setChallenges(dc.challenges || []);
    } catch (e) { console.warn('practice', e); }
  }, [categoryId, user?.user_id]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const attempted = challenges.filter((c) => c.attempted).length;
  const streak = 0; // future: read from user

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surfaceSecondary }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Hero */}
      <LinearGradient colors={['#EA580C', '#9A3412']} style={s.hero}>
        <SafeAreaView edges={['top']}>
          <View style={s.headerRow}>
            <Pressable onPress={() => router.back()} testID="practice-back" hitSlop={12} style={s.iconBtn}>
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </Pressable>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <Text style={s.headerTitle}>Practice</Text>
              <Text style={s.headerSub}>{category?.name || 'All'} • Sharpen with tests & PYQ</Text>
            </View>
            <MaterialCommunityIcons name="notebook-edit-outline" size={26} color="rgba(255,255,255,0.35)" />
          </View>

          {/* Progress strip */}
          <View style={s.progressRow}>
            <View style={s.progressCard}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <View>
                <Text style={s.progressVal}>{attempted}/{challenges.length}</Text>
                <Text style={s.progressLbl}>Challenges Today</Text>
              </View>
            </View>
            <View style={s.progressCard}>
              <Ionicons name="flame" size={18} color="#F59E0B" />
              <View>
                <Text style={s.progressVal}>{streak}</Text>
                <Text style={s.progressLbl}>Day Streak</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.brand} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Practice type grid */}
        <SectionTitle title="Choose Practice Type" />
        <View style={s.typeGrid}>
          {PRACTICE_TYPES.map((p) => (
            <Pressable
              key={p.id}
              testID={`practice-type-${p.id}`}
              style={s.typeCard}
              onPress={() => {
                if (p.route) router.push(p.route);
              }}
            >
              <View style={[s.typeIcon, { backgroundColor: p.tint }]}>
                <Ionicons name={p.icon as any} size={22} color={p.color} />
              </View>
              <Text style={s.typeLabel}>{p.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Daily challenges */}
        {challenges.length > 0 && (
          <>
            <SectionTitle title="Today's Daily Challenges" />
            <View style={{ paddingHorizontal: 16, gap: 10 }}>
              {challenges.map((c: any) => (
                <Pressable
                  key={c.id}
                  testID={`practice-dc-${c.id}`}
                  style={[s.dcRow, c.attempted && s.dcRowDone]}
                  onPress={() => {
                    if (c.attempted) return;
                    router.push({ pathname: '/daily-challenge/[subject]', params: { subject: c.id } });
                  }}
                >
                  <View style={[s.dcIcon, { backgroundColor: c.attempted ? theme.colors.success : `${c.color || theme.colors.brand}15` }]}>
                    <Ionicons name={c.icon as any} size={22} color={c.attempted ? '#FFF' : (c.color || theme.colors.brand)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.dcName}>{c.name}</Text>
                    <View style={s.dcMetaRow}>
                      <Text style={s.dcMeta}>{c.questions_count} Q</Text>
                      <Text style={s.dotSep}>•</Text>
                      <Text style={s.dcMeta}>{c.duration_min}m</Text>
                      <Text style={s.dotSep}>•</Text>
                      <Text style={s.dcMeta}>{c.difficulty}</Text>
                    </View>
                  </View>
                  <View style={s.rewardChip}>
                    <Ionicons name="ellipse" size={10} color={theme.colors.gold} />
                    <Text style={s.rewardTxt}>+{c.reward_coins}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Trending mocks */}
        {mocks.length > 0 && (
          <>
            <SectionTitle title="Featured Mock Tests" />
            <View style={{ paddingHorizontal: 16, gap: 10 }}>
              {mocks.slice(0, 6).map((m: any) => (
                <Pressable key={m.id} testID={`practice-mock-${m.id}`} style={s.mockCard} onPress={() => router.push('/(tabs)/tests')}>
                  <View style={s.mockIcon}>
                    <Ionicons name="document-text" size={22} color={theme.colors.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.mockTitle} numberOfLines={2}>{m.title}</Text>
                    <Text style={s.mockMeta}>{m.questions} Qs • {m.duration} min • {m.difficulty}</Text>
                  </View>
                  <View style={s.startBtn}>
                    <Text style={s.startBtnTxt}>Start</Text>
                    <Ionicons name="arrow-forward" size={12} color="#FFF" />
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={s.sectionTitle}>{title}</Text>;
}

const s = StyleSheet.create({
  hero: { paddingHorizontal: 16, paddingBottom: 20, paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 6 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2, fontWeight: '600' },
  progressRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  progressCard: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', padding: 10, borderRadius: 14 },
  progressVal: { color: '#FFF', fontSize: 15, fontWeight: '900' },
  progressLbl: { color: 'rgba(255,255,255,0.8)', fontSize: 10.5, fontWeight: '700', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: theme.colors.onSurface, marginTop: 22, marginBottom: 12, marginHorizontal: 16 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  typeCard: { width: '33.33%', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6 },
  typeIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { fontSize: 12, fontWeight: '800', color: theme.colors.onSurface, marginTop: 8, textAlign: 'center' },
  dcRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: theme.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border },
  dcRowDone: { opacity: 0.85 },
  dcIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dcName: { fontSize: 14, fontWeight: '800', color: theme.colors.onSurface },
  dcMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  dcMeta: { fontSize: 11, color: theme.colors.muted, fontWeight: '700' },
  dotSep: { color: theme.colors.mutedLight },
  rewardChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.goldTint, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 },
  rewardTxt: { color: theme.colors.gold, fontSize: 11, fontWeight: '900' },
  mockCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: theme.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border },
  mockIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  mockTitle: { fontSize: 13.5, fontWeight: '800', color: theme.colors.onSurface },
  mockMeta: { fontSize: 11, color: theme.colors.muted, marginTop: 3, fontWeight: '600' },
  startBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.brand, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  startBtnTxt: { color: '#FFF', fontSize: 12, fontWeight: '900' },
});
