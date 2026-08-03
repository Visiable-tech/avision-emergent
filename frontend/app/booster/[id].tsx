import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  StatusBar as RNStatusBar,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { api } from '@/src/api';

type Pack = {
  id: string;
  title: string;
  subject: string;
  difficulty: string;
  duration_min: number;
  sections: number;
  color: string;
  accent: string;
  icon: string;
  cover_gradient: string[];
  tagline: string;
  content: { h: string; b: string }[];
};

export default function BoosterDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [p, setP] = useState<Pack | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({ 0: true });
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const r = await api.boosterPack(id);
        setP(r);
      } catch {}
    })();
  }, [id]);

  const share = () => {
    if (!p) return;
    try {
      Share.share({ message: `⚡ Just crushed the "${p.title}" booster on Avision — ${p.duration_min} min to nail ${p.subject}. Try it!` });
    } catch {}
  };

  if (!p) {
    return (
      <View style={s.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color="#2563EB" size="large" />
      </View>
    );
  }

  const toggle = (i: number) => setExpanded((prev) => ({ ...prev, [i]: !prev[i] }));
  const markDone = (i: number) => {
    const n = new Set(completed);
    if (n.has(i)) n.delete(i);
    else n.add(i);
    setCompleted(n);
  };

  const progress = Math.round((completed.size / p.content.length) * 100);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient colors={[p.color, p.accent]} style={s.hero}>
        <SafeAreaView edges={['top']}>
          <View style={s.headRow}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={s.iconBtn} testID="bd-back">
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </Pressable>
            <Text style={s.headTxt}>BOOSTER</Text>
            <Pressable onPress={share} hitSlop={12} style={s.iconBtn} testID="bd-share">
              <Ionicons name="share-outline" size={18} color="#FFF" />
            </Pressable>
          </View>

          <View style={s.iconWrap}>
            <MaterialCommunityIcons name={p.icon as any} size={44} color="#FFF" />
          </View>
          <Text style={s.subject}>{p.subject.toUpperCase()}</Text>
          <Text style={s.title}>{p.title}</Text>
          <Text style={s.tagline}>{p.tagline}</Text>

          <View style={s.metaRow}>
            <View style={s.metaChip}>
              <Ionicons name="time-outline" size={11} color="#FFF" />
              <Text style={s.metaChipTxt}>{p.duration_min} min</Text>
            </View>
            <View style={s.metaChip}>
              <MaterialCommunityIcons name="format-list-bulleted" size={11} color="#FFF" />
              <Text style={s.metaChipTxt}>{p.sections} parts</Text>
            </View>
            <View style={s.metaChip}>
              <MaterialCommunityIcons name="chart-donut" size={11} color="#FFF" />
              <Text style={s.metaChipTxt}>{p.difficulty}</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Progress */}
        <View style={s.progressCard}>
          <View style={s.progressTop}>
            <Text style={s.progressTitle}>Your Progress</Text>
            <Text style={[s.progressPct, { color: p.color }]}>{progress}%</Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progress}%`, backgroundColor: p.color }]} />
          </View>
          <Text style={s.progressSub}>{completed.size} of {p.content.length} parts complete</Text>
        </View>

        {/* Content sections */}
        {p.content.map((c, i) => {
          const open = !!expanded[i];
          const done = completed.has(i);
          return (
            <View key={i} style={s.secCard}>
              <Pressable onPress={() => toggle(i)} style={s.secHead} testID={`bd-sec-${i}`}>
                <View
                  style={[
                    s.secIndex,
                    { backgroundColor: done ? p.color : '#F1F5F9' },
                  ]}
                >
                  {done ? (
                    <Ionicons name="checkmark" size={14} color="#FFF" />
                  ) : (
                    <Text style={s.secIndexTxt}>{i + 1}</Text>
                  )}
                </View>
                <Text style={[s.secTitle, done && { color: '#94A3B8', textDecorationLine: 'line-through' }]} numberOfLines={open ? 0 : 1}>
                  {c.h}
                </Text>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#94A3B8" />
              </Pressable>
              {open && (
                <View style={s.secBody}>
                  {c.b.split('\n\n').map((para, j) => (
                    <Text key={j} style={s.secPara}>{para}</Text>
                  ))}
                  <Pressable
                    onPress={() => markDone(i)}
                    style={[s.doneBtn, done && { backgroundColor: p.color, borderColor: p.color }]}
                    testID={`bd-done-${i}`}
                  >
                    <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={done ? '#FFF' : '#0F172A'} />
                    <Text style={[s.doneBtnTxt, done && { color: '#FFF' }]}>
                      {done ? 'Marked as Read' : 'Mark as Read'}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })}

        {progress === 100 && (
          <View style={[s.completeCard, { backgroundColor: `${p.color}15`, borderColor: p.color }]}>
            <MaterialCommunityIcons name="trophy" size={30} color={p.color} />
            <Text style={[s.completeTitle, { color: p.color }]}>Booster Complete! 🎉</Text>
            <Text style={s.completeSub}>
              You've finished all {p.content.length} parts of {p.title}. Go smash your next mock!
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  hero: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    alignItems: 'flex-start',
  },
  headRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 6, alignSelf: 'stretch' },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.20)' },
  headTxt: { flex: 1, textAlign: 'center', color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },

  iconWrap: { width: 74, height: 74, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  subject: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginTop: 12 },
  title: { color: '#FFF', fontSize: 24, fontWeight: '900', marginTop: 4 },
  tagline: { color: 'rgba(255,255,255,0.95)', fontSize: 13, fontWeight: '600', marginTop: 6, lineHeight: 18 },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 14 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  metaChipTxt: { color: '#FFF', fontSize: 10.5, fontWeight: '800' },

  progressCard: {
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    marginTop: -14,
    marginBottom: 14,
  },
  progressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressTitle: { fontSize: 13, fontWeight: '900', color: '#0F172A' },
  progressPct: { fontSize: 16, fontWeight: '900' },
  progressTrack: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  progressSub: { fontSize: 11, color: '#64748B', marginTop: 6, fontWeight: '700' },

  secCard: { backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#EEF2F7', marginBottom: 10, overflow: 'hidden' },
  secHead: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  secIndex: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  secIndexTxt: { fontSize: 12, fontWeight: '900', color: '#0F172A' },
  secTitle: { flex: 1, fontSize: 13.5, fontWeight: '900', color: '#0F172A' },
  secBody: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
  secPara: { fontSize: 13.5, color: '#0F172A', lineHeight: 22, marginBottom: 8, fontWeight: '500' },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    marginTop: 6,
  },
  doneBtnTxt: { fontSize: 12, fontWeight: '900', color: '#0F172A', letterSpacing: 0.3 },

  completeCard: {
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
  },
  completeTitle: { fontSize: 16, fontWeight: '900', marginTop: 8 },
  completeSub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6, lineHeight: 19, fontWeight: '500' },
});
