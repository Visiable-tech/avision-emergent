import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/src/theme';
import { api } from '@/src/api';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'full-mock', label: 'Full Mock' },
  { id: 'sectional', label: 'Sectional' },
  { id: 'pyq', label: 'PYQs' },
];

export default function Tests() {
  const router = useRouter();
  const [tests, setTests] = useState<any[]>([]);
  const [leaderboard, setLB] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const [t, lb] = await Promise.all([api.mockTests(), api.leaderboard()]);
      setTests(t.tests); setLB(lb.users);
    })();
  }, []);

  const filtered = filter === 'all' ? tests : tests.filter((t) => t.type === filter);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <SafeAreaView edges={['top']} style={s.header}>
        <Text style={s.title}>Test Series</Text>
        <Text style={s.subtitle}>Practice. Analyze. Rank up.</Text>

        <View style={s.dailyCard}>
          <LinearGradient colors={[theme.colors.brand, theme.colors.brandDark]} style={StyleSheet.absoluteFill} />
          <View style={s.dailyContent}>
            <View style={s.dailyBadge}>
              <Ionicons name="flash" size={12} color={theme.colors.gold} />
              <Text style={s.dailyBadgeText}>DAILY CHALLENGE</Text>
            </View>
            <Text style={s.dailyTitle}>5 Questions • 50 Coins</Text>
            <Text style={s.dailyDesc}>Boost your streak with today's quiz</Text>
            <Pressable testID="take-daily-quiz" style={s.dailyBtn} onPress={() => router.push('/quiz')}>
              <Text style={s.dailyBtnText}>Take Quiz</Text>
              <Ionicons name="arrow-forward" size={16} color={theme.colors.brand} />
            </Pressable>
          </View>
          <View style={s.dailyDecor}>
            <Ionicons name="trophy" size={80} color="rgba(255,255,255,0.12)" />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
          {FILTERS.map((f) => (
            <Pressable key={f.id} testID={`test-filter-${f.id}`} style={[s.chip, filter === f.id && s.chipActive]} onPress={() => setFilter(f.id)}>
              <Text style={[s.chipText, filter === f.id && s.chipTextActive]}>{f.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 140 }}
        ListFooterComponent={
          <View style={{ marginTop: 20 }}>
            <Text style={s.section}>Leaderboard</Text>
            <View style={s.lbCard}>
              {leaderboard.slice(0, 7).map((u: any) => (
                <View key={u.rank} style={[s.lbRow, u.is_me && s.lbRowMe]}>
                  <View style={[s.lbRank, u.rank <= 3 ? { backgroundColor: theme.colors.gold } : { backgroundColor: theme.colors.surfaceTertiary }]}>
                    <Text style={[s.lbRankText, u.rank <= 3 && { color: '#FFF' }]}>#{u.rank}</Text>
                  </View>
                  <View style={s.lbAvatar}><Text style={s.lbAvatarText}>{u.avatar}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.lbName}>{u.name}</Text>
                    <Text style={s.lbStreak}>🔥 {u.streak} day streak</Text>
                  </View>
                  <Text style={s.lbXp}>{u.xp} XP</Text>
                </View>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable testID={`test-${item.id}`} style={s.testCard} onPress={() => router.push('/quiz')}>
            <View style={s.testIcon}>
              <Ionicons
                name={item.type === 'full-mock' ? 'document-text' : item.type === 'sectional' ? 'layers' : 'time'}
                size={22}
                color={theme.colors.brand}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.testTitle} numberOfLines={2}>{item.title}</Text>
              <View style={s.testMetaRow}>
                <Text style={s.testMeta}>{item.questions} Qs</Text>
                <Text style={s.dot}>•</Text>
                <Text style={s.testMeta}>{item.duration} min</Text>
                <Text style={s.dot}>•</Text>
                <Text style={[s.testMeta, { color: item.difficulty === 'Hard' ? theme.colors.error : item.difficulty === 'Medium' ? theme.colors.warning : theme.colors.success }]}>{item.difficulty}</Text>
              </View>
              <Text style={s.testAttempted}>{(item.attempted / 1000).toFixed(1)}k attempted</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.mutedLight} />
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: theme.spacing.lg, paddingBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', color: theme.colors.onSurface, marginTop: 8 },
  subtitle: { fontSize: 13, color: theme.colors.muted, marginTop: 4 },
  dailyCard: { marginTop: 16, height: 130, borderRadius: 22, overflow: 'hidden', ...(theme.shadow.card as object) },
  dailyContent: { padding: 16, flex: 1, justifyContent: 'center' },
  dailyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  dailyBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  dailyTitle: { color: '#FFF', fontSize: 18, fontWeight: '800', marginTop: 8 },
  dailyDesc: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  dailyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, alignSelf: 'flex-start', marginTop: 10 },
  dailyBtnText: { color: theme.colors.brand, fontWeight: '700', fontSize: 13 },
  dailyDecor: { position: 'absolute', right: 8, top: 12 },
  chipsRow: { paddingVertical: 12, gap: 8 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: theme.colors.surfaceSecondary, borderWidth: 1, borderColor: theme.colors.border, justifyContent: 'center', flexShrink: 0 },
  chipActive: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
  chipText: { fontSize: 13, color: theme.colors.onSurfaceSecondary, fontWeight: '600' },
  chipTextActive: { color: '#FFF' },
  testCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: theme.colors.surface, borderRadius: 18, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border, ...(theme.shadow.soft as object) },
  testIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  testTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.onSurface },
  testMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  testMeta: { fontSize: 12, color: theme.colors.onSurfaceSecondary, fontWeight: '600' },
  dot: { color: theme.colors.mutedLight },
  testAttempted: { fontSize: 11, color: theme.colors.muted, marginTop: 4 },
  section: { fontSize: 18, fontWeight: '800', color: theme.colors.onSurface, marginBottom: 12 },
  lbCard: { backgroundColor: theme.colors.surface, borderRadius: 20, padding: 8, borderWidth: 1, borderColor: theme.colors.border, ...(theme.shadow.soft as object) },
  lbRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  lbRowMe: { backgroundColor: theme.colors.brandTertiary, borderRadius: 14 },
  lbRank: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  lbRankText: { fontSize: 12, fontWeight: '800', color: theme.colors.onSurfaceSecondary },
  lbAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center' },
  lbAvatarText: { color: '#FFF', fontWeight: '700' },
  lbName: { fontSize: 14, fontWeight: '700', color: theme.colors.onSurface },
  lbStreak: { fontSize: 11, color: theme.colors.muted, marginTop: 2 },
  lbXp: { fontSize: 13, fontWeight: '800', color: theme.colors.gold },
});
