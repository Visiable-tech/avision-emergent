import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, StatusBar as RNStatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';

const LANGS = ['English', 'Hindi', 'Bengali'];

export default function TestPrimeInstructions() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [test, setTest] = useState<any>(null);
  const [checked, setChecked] = useState(false);
  const [lang, setLang] = useState<string>('English');

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const t = await api.tpTestDetail(id, user?.user_id);
        setTest(t);
        const l0 = (t?.pattern?.language || t?.language || 'English').split('+')[0].trim();
        if (LANGS.includes(l0)) setLang(l0);
      } catch (e) { console.warn('inst', e); }
    })();
  }, [id, user?.user_id]);

  const startTest = async () => {
    if (!test) return;
    if (!test.unlocked) {
      Alert.alert('Prime Required', 'Unlock this test with Test Prime to continue.');
      return;
    }
    if (!checked) {
      Alert.alert('Please confirm', 'Tick the checkbox to confirm you have read the instructions.');
      return;
    }
    if (!user?.user_id) {
      Alert.alert('Login required', 'Please log in to attempt this test.');
      return;
    }
    try {
      const attempt = await api.tpStartAttempt(user.user_id, test.id, lang);
      router.replace(`/test-prime/attempt/${attempt.attempt_id}` as any);
    } catch (e: any) {
      Alert.alert('Could not start', e?.message || 'Please try again.');
    }
  };

  const activatePrime = async () => {
    if (!user?.user_id) return;
    try {
      await api.tpActivate(user.user_id, 'prime', 365);
      const t = await api.tpTestDetail(id!, user.user_id);
      setTest(t);
    } catch {}
  };

  if (!test) {
    return (
      <View style={s.loading}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: theme.colors.muted }}>Loading…</Text>
      </View>
    );
  }

  const p = test.pattern || {};

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surfaceSecondary }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Hero */}
      <LinearGradient colors={[theme.colors.brand, theme.colors.brandDark]} style={s.hero}>
        <SafeAreaView edges={['top']}>
          <View style={s.headerRow}>
            <Pressable onPress={() => router.back()} testID="tpi-back" hitSlop={12} style={s.iconBtn}>
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </Pressable>
            <View style={s.crownRow}>
              <MaterialCommunityIcons name="crown" size={12} color="#FCD34D" />
              <Text style={s.crownTxt}>TEST PRIME</Text>
            </View>
            <View style={{ flex: 1 }} />
            {test.is_free ? (
              <View style={s.freeChip}><Text style={s.freeChipTxt}>FREE</Text></View>
            ) : test.unlocked ? (
              <View style={s.unlockedChip}><Ionicons name="checkmark-circle" size={11} color="#065F46" /><Text style={s.unlockedTxt}>UNLOCKED</Text></View>
            ) : (
              <View style={s.lockChip}><Ionicons name="lock-closed" size={11} color="#FFF" /><Text style={s.lockChipTxt}>PRIME</Text></View>
            )}
          </View>
          <Text style={s.title}>{test.name}</Text>
          <Text style={s.sub}>{test.exam_name} • {test.stage} • Pattern v{p.version || '—'}</Text>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* Stat grid */}
        <View style={s.statGrid}>
          <Stat icon="document-text-outline" val={String(test.questions)} lbl="Questions" />
          <Stat icon="calculator-outline" val={String(test.marks)} lbl="Marks" />
          <Stat icon="time-outline" val={`${test.duration_min}m`} lbl="Duration" />
          <Stat icon="close-circle-outline" val={`-${p.negative_marking ?? 0}`} lbl="Negative" />
        </View>

        {/* Sections */}
        {p.sections?.length ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>Sections</Text>
            <View style={s.tblHead}>
              <Text style={[s.tCell, { flex: 2 }]}>Section</Text>
              <Text style={s.tCell}>Qs</Text>
              <Text style={s.tCell}>Marks</Text>
              <Text style={s.tCell}>Time</Text>
            </View>
            {p.sections.map((sec: any, i: number) => (
              <View key={i} style={s.tblRow}>
                <Text style={[s.tCell, { flex: 2, fontWeight: '800', color: theme.colors.onSurface }]} numberOfLines={2}>{sec.name}</Text>
                <Text style={s.tCell}>{sec.questions}</Text>
                <Text style={s.tCell}>{sec.marks}</Text>
                <Text style={s.tCell}>{sec.duration_min}m</Text>
              </View>
            ))}
            {p.sectional_timing && (
              <View style={s.warnBox}>
                <Ionicons name="warning-outline" size={13} color="#B45309" />
                <Text style={s.warnTxt}>Sectional timing enabled – you cannot jump to another section before its time.</Text>
              </View>
            )}
          </View>
        ) : null}

        {/* Language */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Language</Text>
          <Text style={s.cardSub}>Available: {p.language || test.language}</Text>
          <View style={s.langRow}>
            {LANGS.map((l) => (
              <Pressable
                key={l}
                testID={`tpi-lang-${l}`}
                onPress={() => setLang(l)}
                style={[s.langChip, lang === l && s.langChipActive]}
              >
                <Text style={[s.langChipTxt, lang === l && { color: '#FFF' }]}>{l}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Instructions */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Important Instructions</Text>
          {[
            'Answer all questions carefully. Only one option is correct per question.',
            `Positive marks: +${(p.total_marks && p.total_questions) ? (p.total_marks / p.total_questions).toFixed(2) : '1'} per correct answer.`,
            `Negative marks: -${p.negative_marking ?? 0} per wrong answer.`,
            'You may mark questions for review and revisit them later.',
            'The timer runs continuously. Auto-submission occurs at 00:00.',
            'Answers are saved automatically – accidental exit will not lose progress.',
          ].map((line, i) => (
            <View key={i} style={s.instRow}>
              <View style={s.instDot} />
              <Text style={s.instTxt}>{line}</Text>
            </View>
          ))}
        </View>

        {/* Checkbox */}
        <Pressable
          testID="tpi-agree"
          style={s.agreeRow}
          onPress={() => setChecked((c) => !c)}
        >
          <View style={[s.checkbox, checked && s.checkboxOn]}>
            {checked ? <Ionicons name="checkmark" size={14} color="#FFF" /> : null}
          </View>
          <Text style={s.agreeTxt}>I have read and understood all the instructions.</Text>
        </Pressable>
      </ScrollView>

      {/* Sticky start bar */}
      <SafeAreaView edges={['bottom']} style={s.stickyBar}>
        <View style={{ flex: 1 }}>
          <Text style={s.startLbl}>Total Time</Text>
          <Text style={s.startVal}>{test.duration_min}:00</Text>
        </View>
        {test.unlocked ? (
          <Pressable style={s.startBtn} onPress={startTest} testID="tpi-start">
            <Ionicons name="play" size={16} color="#FFF" />
            <Text style={s.startBtnTxt}>START TEST</Text>
          </Pressable>
        ) : (
          <Pressable style={s.unlockBtn} onPress={activatePrime} testID="tpi-unlock">
            <MaterialCommunityIcons name="crown" size={16} color="#FFF" />
            <Text style={s.startBtnTxt}>Unlock with Prime</Text>
          </Pressable>
        )}
      </SafeAreaView>
    </View>
  );
}

function Stat({ icon, val, lbl }: any) {
  return (
    <View style={s.stat}>
      <View style={s.statIcon}><Ionicons name={icon} size={14} color={theme.colors.brand} /></View>
      <Text style={s.statVal}>{val}</Text>
      <Text style={s.statLbl}>{lbl}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface },
  hero: { paddingHorizontal: 16, paddingBottom: 20, paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 6, gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  crownRow: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.28)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  crownTxt: { color: '#FCD34D', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  freeChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: '#DCFCE7' },
  freeChipTxt: { color: '#166534', fontSize: 10, fontWeight: '900' },
  unlockedChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: '#D1FAE5' },
  unlockedTxt: { color: '#065F46', fontSize: 10, fontWeight: '900' },
  lockChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.28)' },
  lockChipTxt: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  title: { color: '#FFF', fontSize: 20, fontWeight: '900', marginTop: 14 },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 4, fontWeight: '600' },
  statGrid: { flexDirection: 'row', gap: 8, marginTop: -6 },
  stat: { flex: 1, backgroundColor: theme.colors.surface, padding: 10, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border },
  statIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  statVal: { fontSize: 14, fontWeight: '900', color: theme.colors.onSurface, marginTop: 6 },
  statLbl: { fontSize: 10, color: theme.colors.muted, marginTop: 2, fontWeight: '700', letterSpacing: 0.3 },
  card: { backgroundColor: theme.colors.surface, marginTop: 12, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border },
  cardTitle: { fontSize: 15, fontWeight: '900', color: theme.colors.onSurface },
  cardSub: { fontSize: 11.5, color: theme.colors.muted, marginTop: 3, fontWeight: '600' },
  tblHead: { flexDirection: 'row', marginTop: 10, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  tblRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  tCell: { flex: 1, fontSize: 11.5, color: theme.colors.onSurfaceSecondary, fontWeight: '700' },
  warnBox: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', backgroundColor: '#FEF3C7', padding: 10, borderRadius: 10, marginTop: 12 },
  warnTxt: { flex: 1, fontSize: 11.5, color: '#7C4A0C', fontWeight: '700', lineHeight: 16 },
  langRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  langChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: theme.colors.brandTertiary },
  langChipActive: { backgroundColor: theme.colors.brand },
  langChipTxt: { fontSize: 12, fontWeight: '800', color: theme.colors.brand },
  instRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 8 },
  instDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.brand, marginTop: 6 },
  instTxt: { flex: 1, fontSize: 12.5, color: theme.colors.onSurfaceSecondary, lineHeight: 18 },
  agreeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: theme.colors.brand },
  agreeTxt: { flex: 1, fontSize: 13, color: theme.colors.onSurface, fontWeight: '700' },
  stickyBar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: theme.colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 },
  startLbl: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '700', letterSpacing: 0.3 },
  startVal: { fontSize: 18, fontWeight: '900', color: theme.colors.onSurface },
  startBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.brand, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
  unlockBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#B7791F', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14 },
  startBtnTxt: { color: '#FFF', fontWeight: '900', fontSize: 13, letterSpacing: 0.4 },
});
