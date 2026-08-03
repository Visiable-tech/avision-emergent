import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
  StatusBar as RNStatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';

type Pack = {
  id: string;
  title: string;
  subject: string;
  category_id?: string | null;
  difficulty: string;
  duration_min: number;
  sections: number;
  color: string;
  accent: string;
  icon: string;
  cover_gradient: string[];
  tagline: string;
};

export default function BoosterHome() {
  const router = useRouter();
  const { user } = useAuth();
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subject, setSubject] = useState<string>('all');

  const load = useCallback(async () => {
    try {
      const cat = (user as any)?.category_id || undefined;
      const r = await api.boosters(cat);
      setPacks(r.packs || []);
    } catch {}
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const subjects = useMemo(() => {
    const set = new Set<string>();
    packs.forEach((p) => set.add(p.subject));
    return ['all', ...Array.from(set)];
  }, [packs]);

  const filtered = subject === 'all' ? packs : packs.filter((p) => p.subject === subject);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient colors={['#2563EB', '#7C3AED']} style={s.hero}>
        <SafeAreaView edges={['top']}>
          <View style={s.headRow}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={s.iconBtn} testID="bo-back">
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </Pressable>
            <View style={{ flex: 1, marginHorizontal: 8 }}>
              <View style={s.brandChip}>
                <MaterialCommunityIcons name="rocket-launch" size={11} color="#2563EB" />
                <Text style={s.brandTxt}>BOOSTER</Text>
              </View>
              <Text style={s.title}>Quick Prep Boosters</Text>
              <Text style={s.sub}>5-10 min capsules. Formulas, shortcuts, cheat-sheets.</Text>
            </View>
          </View>
        </SafeAreaView>

        {/* Subject filter */}
        {!loading && subjects.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, gap: 8 }}
          >
            {subjects.map((sub) => {
              const active = sub === subject;
              return (
                <Pressable
                  key={sub}
                  onPress={() => setSubject(sub)}
                  style={[s.subChip, active && s.subChipActive]}
                  testID={`bo-sub-${sub}`}
                >
                  <Text style={[s.subChipTxt, active && { color: '#2563EB' }]}>
                    {sub === 'all' ? 'All' : sub}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </LinearGradient>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color="#2563EB" size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.hint}>{filtered.length} boosters available</Text>

          {filtered.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => router.push(`/booster/${p.id}` as any)}
              style={s.card}
              testID={`bo-pack-${p.id}`}
            >
              <LinearGradient colors={[p.color, p.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.iconBox}>
                <MaterialCommunityIcons name={p.icon as any} size={28} color="#FFF" />
              </LinearGradient>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.cardSubject}>{p.subject.toUpperCase()}</Text>
                <Text style={s.cardTitle} numberOfLines={2}>{p.title}</Text>
                <Text style={s.cardTag} numberOfLines={2}>{p.tagline}</Text>
                <View style={s.metaRow}>
                  <View style={s.metaChip}>
                    <Ionicons name="time-outline" size={11} color="#64748B" />
                    <Text style={s.metaTxt}>{p.duration_min} min</Text>
                  </View>
                  <View style={s.metaChip}>
                    <MaterialCommunityIcons name="format-list-bulleted" size={11} color="#64748B" />
                    <Text style={s.metaTxt}>{p.sections} parts</Text>
                  </View>
                  <View
                    style={[
                      s.diffChip,
                      {
                        backgroundColor:
                          p.difficulty === 'Easy'
                            ? '#D1FAE5'
                            : p.difficulty === 'Hard'
                              ? '#FEE2E2'
                              : '#FEF3C7',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.diffTxt,
                        {
                          color:
                            p.difficulty === 'Easy'
                              ? '#065F46'
                              : p.difficulty === 'Hard'
                                ? '#991B1B'
                                : '#B45309',
                        },
                      ]}
                    >
                      {p.difficulty}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={s.arrow}>
                <Ionicons name="chevron-forward" size={16} color="#64748B" />
              </View>
            </Pressable>
          ))}

          {filtered.length === 0 && (
            <View style={s.empty}>
              <MaterialCommunityIcons name="rocket-outline" size={54} color="#94A3B8" />
              <Text style={s.emptyTxt}>No boosters match this filter yet.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 6 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.20)' },
  brandChip: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  brandTxt: { color: '#2563EB', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.8 },
  title: { color: '#FFF', fontSize: 22, fontWeight: '900', marginTop: 8 },
  sub: { color: 'rgba(255,255,255,0.9)', fontSize: 12.5, marginTop: 2, fontWeight: '600' },

  subChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)' },
  subChipActive: { backgroundColor: '#FFF' },
  subChipTxt: { color: '#FFF', fontSize: 12, fontWeight: '800' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 11.5, color: '#64748B', fontWeight: '800', marginBottom: 8, letterSpacing: 0.3 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#0B4DB8', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10 },
      android: { elevation: 1 },
    }),
  },
  iconBox: { width: 54, height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardSubject: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 0.6 },
  cardTitle: { fontSize: 14.5, fontWeight: '900', color: '#0F172A', marginTop: 2 },
  cardTag: { fontSize: 11.5, color: '#64748B', marginTop: 4, lineHeight: 16, fontWeight: '500' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F8FAFC', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  metaTxt: { fontSize: 10.5, color: '#64748B', fontWeight: '700' },
  diffChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  diffTxt: { fontSize: 10.5, fontWeight: '900', letterSpacing: 0.3 },
  arrow: { paddingLeft: 6 },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTxt: { color: '#64748B', fontSize: 13, fontWeight: '600' },
});
