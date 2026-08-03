import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Platform, StatusBar as RNStatusBar, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';

export default function TestPrimeLanding() {
  const router = useRouter();
  const { user } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>('banking');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [ent, setEnt] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const [c, e, en] = await Promise.all([
        api.tpCategories(),
        api.tpExams(selectedCat, undefined, search.trim() || undefined),
        user?.user_id ? api.tpEntitlement(user.user_id).catch(() => null) : Promise.resolve(null),
      ]);
      setCategories(c.categories || []);
      setExams(e.exams || []);
      setEnt(en);
    } catch (err) { console.warn('tp landing', err); }
  }, [selectedCat, search, user?.user_id]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const isPrime = !!ent?.is_prime;
  const totalTests = exams.reduce((a, x) => a + (x.tests_count || 0), 0);
  const totalAspirants = exams.reduce((a, x) => a + (x.aspirants || 0), 0);

  const activatePrime = async () => {
    if (!user?.user_id) return;
    try {
      const r = await api.tpActivate(user.user_id, 'prime', 365);
      setEnt(r);
    } catch (e) { console.warn('activate', e); }
  };
  const resetPrime = async () => {
    if (!user?.user_id) return;
    try { await api.tpReset(user.user_id); setEnt(null); } catch {}
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surfaceSecondary }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Hero: Copper-Gold */}
      <LinearGradient colors={['#7C4A0C', '#B7791F', '#F59E0B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
        <SafeAreaView edges={['top']}>
          <View style={s.headerRow}>
            <Pressable onPress={() => router.back()} testID="tp-back" hitSlop={12} style={s.iconBtn}>
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </Pressable>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <View style={s.brandChip}>
                <MaterialCommunityIcons name="crown" size={12} color="#7C4A0C" />
                <Text style={s.brandChipTxt}>AVISION</Text>
              </View>
            </View>
            <Pressable onPress={() => router.push('/(tabs)/profile')} testID="tp-profile" hitSlop={12} style={s.iconBtn}>
              <Ionicons name="person-circle-outline" size={22} color="#FFF" />
            </Pressable>
          </View>
          <Text style={s.title}>TEST PRIME</Text>
          <Text style={s.tag}>One Pass. Every Exam. Unlimited Practice.</Text>

          {/* Search */}
          <View style={s.searchWrap}>
            <Ionicons name="search-outline" size={16} color="#7C4A0C" />
            <TextInput
              testID="tp-search"
              value={search}
              onChangeText={setSearch}
              placeholder="Search exam (SBI PO, CLAT, IPMAT…)"
              placeholderTextColor="rgba(124,74,12,0.55)"
              style={s.searchInput}
            />
          </View>

          {/* Status pill */}
          <View style={s.statusRow}>
            {isPrime ? (
              <View style={s.activeBar}>
                <Ionicons name="checkmark-circle" size={14} color="#065F46" />
                <Text style={s.activeBarTxt}>PRIME ACTIVE • {ent?.plan || 'Test Prime'}</Text>
                <View style={{ flex: 1 }} />
                <Pressable onPress={resetPrime} testID="tp-reset"><Text style={s.linkTxt}>Reset</Text></Pressable>
              </View>
            ) : (
              <View style={s.upgradeBar}>
                <Ionicons name="lock-closed" size={14} color="#FFF" />
                <Text style={s.upgradeTxt}>Unlock unlimited tests • demo activation</Text>
                <View style={{ flex: 1 }} />
                <Pressable onPress={activatePrime} style={s.getPrimeBtn} testID="tp-activate">
                  <Text style={s.getPrimeTxt}>Get Prime</Text>
                </Pressable>
              </View>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#B7791F" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Category selector – horizontal chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catRow}>
          {categories.map((c) => {
            const active = c.id === selectedCat;
            return (
              <Pressable
                key={c.id}
                testID={`tp-cat-${c.id}`}
                onPress={() => setSelectedCat(c.id)}
                style={[s.catChip, active && { backgroundColor: c.color, borderColor: c.color }]}
              >
                <Ionicons name={c.icon as any} size={14} color={active ? '#FFF' : c.color} />
                <Text style={[s.catChipTxt, active && { color: '#FFF' }]}>{c.name}</Text>
                {c.exam_count > 0 && (
                  <View style={[s.catCount, active && { backgroundColor: 'rgba(255,255,255,0.24)' }]}>
                    <Text style={[s.catCountTxt, active && { color: '#FFF' }]}>{c.exam_count}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Stat strip */}
        <View style={s.statStrip}>
          <View style={s.strip}>
            <Text style={s.stripVal}>{exams.length}</Text>
            <Text style={s.stripLbl}>Exams</Text>
          </View>
          <View style={s.strip}>
            <Text style={s.stripVal}>{totalTests}+</Text>
            <Text style={s.stripLbl}>Tests</Text>
          </View>
          <View style={s.strip}>
            <Text style={s.stripVal}>{formatK(totalAspirants)}</Text>
            <Text style={s.stripLbl}>Aspirants</Text>
          </View>
        </View>

        {/* Exam grid */}
        <View style={s.examGrid}>
          {exams.map((e) => (
            <Pressable
              key={e.id}
              testID={`tp-exam-${e.id}`}
              style={s.examCard}
              onPress={() => router.push(`/test-prime/exam/${e.id}`)}
            >
              <View style={[s.examLogo, { backgroundColor: `${e.color}15` }]}>
                <Text style={[s.examLogoTxt, { color: e.color }]}>{e.logo}</Text>
              </View>
              <Text style={s.examName} numberOfLines={2}>{e.name}</Text>
              <Text style={s.examFull} numberOfLines={2}>{e.full_name}</Text>
              <View style={s.examBottom}>
                <View style={s.testsBadge}>
                  <Ionicons name="document-text-outline" size={11} color={e.color} />
                  <Text style={[s.testsBadgeTxt, { color: e.color }]}>{e.tests_count} Tests</Text>
                </View>
                <View style={s.aspBadge}>
                  <Ionicons name="people-outline" size={10} color={theme.colors.muted} />
                  <Text style={s.aspBadgeTxt}>{formatK(e.aspirants)}</Text>
                </View>
              </View>
            </Pressable>
          ))}
          {exams.length === 0 && (
            <View style={s.empty}>
              <MaterialCommunityIcons name="clipboard-search-outline" size={44} color={theme.colors.mutedLight} />
              <Text style={s.emptyTxt}>No exams found. Try another category or search term.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function formatK(n: number): string {
  if (!n) return '0';
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const s = StyleSheet.create({
  hero: { paddingHorizontal: 16, paddingBottom: 22, paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 6 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  brandChip: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  brandChipTxt: { color: '#7C4A0C', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: '#FFF', fontSize: 30, fontWeight: '900', marginTop: 12, letterSpacing: 1.5 },
  tag: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 4, fontWeight: '600' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, marginTop: 14 },
  searchInput: { flex: 1, fontSize: 13, color: '#7C4A0C', paddingVertical: 0 },
  statusRow: { marginTop: 12 },
  activeBar: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#D1FAE5', padding: 10, borderRadius: 12 },
  activeBarTxt: { color: '#065F46', fontSize: 12, fontWeight: '900' },
  linkTxt: { color: '#065F46', fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  upgradeBar: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.28)', padding: 10, borderRadius: 12 },
  upgradeTxt: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  getPrimeBtn: { backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  getPrimeTxt: { color: '#7C4A0C', fontSize: 11, fontWeight: '900' },
  catRow: { paddingHorizontal: 16, paddingTop: 14, gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  catChipTxt: { fontSize: 12.5, fontWeight: '800', color: theme.colors.onSurface },
  catCount: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, backgroundColor: theme.colors.brandTertiary },
  catCountTxt: { fontSize: 10, fontWeight: '900', color: theme.colors.brand },
  statStrip: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 14 },
  strip: { flex: 1, backgroundColor: theme.colors.surface, padding: 10, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center' },
  stripVal: { fontSize: 18, fontWeight: '900', color: theme.colors.onSurface },
  stripLbl: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '700', letterSpacing: 0.3, marginTop: 2 },
  examGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, paddingTop: 12, gap: 10 },
  examCard: { width: '48%', marginHorizontal: '1%', backgroundColor: theme.colors.surface, padding: 12, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border },
  examLogo: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  examLogoTxt: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  examName: { fontSize: 15, fontWeight: '900', color: theme.colors.onSurface, marginTop: 8 },
  examFull: { fontSize: 11.5, color: theme.colors.muted, marginTop: 3, fontWeight: '600' },
  examBottom: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  testsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.brandTertiary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  testsBadgeTxt: { fontSize: 10.5, fontWeight: '900' },
  aspBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' },
  aspBadgeTxt: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '700' },
  empty: { width: '100%', alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyTxt: { color: theme.colors.muted, fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },
});
