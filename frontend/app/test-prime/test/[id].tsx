import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  StatusBar as RNStatusBar,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';

const LANGS = ['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu'];

export default function TestPrimeInstructions() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [test, setTest] = useState<any>(null);
  const [lang, setLang] = useState<string>('English');
  const [langOpen, setLangOpen] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const t = await api.tpTestDetail(id, user?.user_id);
        setTest(t);
        const l0 = (t?.pattern?.language || t?.language || 'English').split('+')[0].trim();
        if (LANGS.includes(l0)) setLang(l0);
      } catch {}
    })();
  }, [id, user?.user_id]);

  const sections = useMemo(() => {
    const p = test?.pattern;
    return (p?.sections as any[]) || [];
  }, [test]);

  const negative = test?.pattern?.negative_marking ?? 0;
  const totalDurationMin = test?.duration_min ?? test?.pattern?.total_duration_min ?? 60;

  const startTest = async () => {
    if (!test) return;
    if (!test.unlocked && !test.is_free) {
      Alert.alert('Prime Required', 'Unlock this test with Test Prime to continue.');
      return;
    }
    if (!user?.user_id) {
      Alert.alert('Login required', 'Please log in to attempt this test.');
      return;
    }
    try {
      setStarting(true);
      const attempt = await api.tpStartAttempt(user.user_id, test.id, lang);
      router.replace(`/test-prime/attempt/${attempt.attempt_id}` as any);
    } catch (e: any) {
      Alert.alert('Could not start', e?.message || 'Please try again.');
    } finally {
      setStarting(false);
    }
  };

  if (!test) {
    return (
      <View style={s.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color="#2563EB" size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF' }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top bar */}
      <SafeAreaView edges={['top']} style={s.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={s.iconBtn} testID="tpi-back">
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </Pressable>
        <Text style={s.headTxt}>Instructions</Text>
        <View style={{ width: 30 }} />
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {/* Test name */}
        <Text style={s.testName}>{test.name}</Text>

        <View style={s.divider} />

        {/* Stat pills */}
        <View style={s.pillRow}>
          <StatPill val={String(test.questions)} lbl="Total Questions" />
          <StatPill val={String(test.marks)} lbl="Maximum Marks" />
          <StatPill val={`${totalDurationMin} mins`} lbl="Duration" />
        </View>

        <View style={s.divider} />

        <Text style={s.heading}>Please read the following instructions very carefully:</Text>

        {/* Section table */}
        {sections.length > 0 && (
          <View style={s.table}>
            <View style={[s.trow, s.thead]}>
              <TCell w={40} bold>S.No.</TCell>
              <TCell flex bold>Name of test</TCell>
              <TCell w={70} bold center>No of{'\n'}Questions</TCell>
              <TCell w={60} bold center>Max.{'\n'}Marks</TCell>
              <TCell w={70} bold center>Duration</TCell>
            </View>
            {sections.map((sec: any, i: number) => (
              <View key={i} style={s.trow}>
                <TCell w={40} center>{i + 1}</TCell>
                <TCell flex center>{sec.name}</TCell>
                <TCell w={70} center>{sec.questions}</TCell>
                <TCell w={60} center>{sec.marks}</TCell>
                <TCell w={70} center>{sec.duration_min} min</TCell>
              </View>
            ))}
            <View style={s.trow}>
              <TCell w={40} bold center>—</TCell>
              <TCell flex bold center>Total</TCell>
              <TCell w={70} bold center>{test.questions}</TCell>
              <TCell w={60} bold center>{test.marks}</TCell>
              <TCell w={70} bold center>
                {totalDurationMin >= 60 ? `${Math.floor(totalDurationMin / 60)} Hour${totalDurationMin >= 120 ? 's' : ''}` : `${totalDurationMin} min`}
              </TCell>
            </View>
          </View>
        )}

        {/* Numbered instructions */}
        <View style={{ marginTop: 16 }}>
          <Rule n={1}>
            You have <B>{totalDurationMin} minutes</B> to complete the test.
          </Rule>
          <Rule n={2}>
            The test contains a total of <B>{test.questions} questions and {test.marks} Marks</B>.
          </Rule>
          <Rule n={3}>
            There is only one correct answer to each question. Click on the most appropriate option to mark it as your answer.
          </Rule>
          <Rule n={4}>
            You will be awarded <B>{Math.round(((test.marks || 1) / (test.questions || 1)) * 100) / 100}</B> mark(s) for each correct answer.
          </Rule>
          <Rule n={5}>
            There is <B>{negative > 0 ? `${negative} penalty` : 'no penalty'}</B> mark for each wrong answer.
          </Rule>
          <Rule n={6}>You can change your answer by clicking on some other option.</Rule>
          <Rule n={7}>
            You can unmark your answer by clicking on the <B>{'"Clear Response"'}</B> button.
          </Rule>
          <Rule n={8}>
            A number list of all questions appears in the palette. You can access the questions in any order within a section or across sections by clicking on the question number.
          </Rule>
          <Rule n={9}>
            You can use rough sheets while taking the test. Do not use calculators, log tables, dictionaries, or any other printed/online reference material during the test.
          </Rule>
          <Rule n={10}>
            Do not click the button <B>{'"Submit test"'}</B> before completing the test. A test once submitted cannot be resumed.
          </Rule>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[s.footer, { paddingBottom: 12 + insets.bottom }]}>
        <Pressable onPress={() => setLangOpen(true)} style={s.langBtn} testID="tpi-lang">
          <MaterialCommunityIcons name="translate" size={16} color="#2563EB" />
          <Text style={s.langTxt}>{lang}</Text>
          <Ionicons name="chevron-down" size={14} color="#2563EB" />
        </Pressable>

        <Pressable
          onPress={startTest}
          disabled={starting}
          style={({ pressed }) => [s.startBtn, pressed && { transform: [{ scale: 0.97 }], opacity: 0.94 }]}
          testID="tpi-start"
        >
          {starting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={s.startTxt}>Start Test</Text>
          )}
        </Pressable>
      </View>

      {/* Language modal */}
      <Modal visible={langOpen} transparent animationType="fade" onRequestClose={() => setLangOpen(false)}>
        <Pressable style={s.mBg} onPress={() => setLangOpen(false)}>
          <Pressable style={[s.mSheet, { paddingBottom: 20 + insets.bottom }]}>
            <View style={s.mHandle} />
            <Text style={s.mTitle}>Select Test Language</Text>
            {LANGS.map((l) => (
              <Pressable
                key={l}
                onPress={() => {
                  setLang(l);
                  setLangOpen(false);
                }}
                style={[s.langRow, lang === l && s.langRowActive]}
                testID={`tpi-lang-${l}`}
              >
                <MaterialCommunityIcons name="translate" size={16} color={lang === l ? '#2563EB' : '#64748B'} />
                <Text style={[s.langRowTxt, lang === l && { color: '#2563EB', fontWeight: '900' }]}>{l}</Text>
                {lang === l && <Ionicons name="checkmark-circle" size={18} color="#2563EB" style={{ marginLeft: 'auto' }} />}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function StatPill({ val, lbl }: any) {
  return (
    <View style={s.statCol}>
      <View style={s.statPill}>
        <Text style={s.statVal}>{val}</Text>
      </View>
      <Text style={s.statLbl}>{lbl}</Text>
    </View>
  );
}

function Rule({ n, children }: any) {
  return (
    <View style={s.ruleRow}>
      <Text style={s.ruleN}>{n}.</Text>
      <Text style={s.ruleTxt}>{children}</Text>
    </View>
  );
}

function B({ children }: any) {
  return <Text style={{ fontWeight: '900', color: '#0F172A' }}>{children}</Text>;
}

function TCell({ children, w, flex, bold, center }: any) {
  return (
    <View style={[s.tcell, flex ? { flex: 1 } : { width: w }]}>
      <Text style={[s.tcellTxt, bold && { fontWeight: '800', color: '#0F172A' }, center && { textAlign: 'center' }]}>
        {children}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) + 6 : 8,
    paddingBottom: 10,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
    gap: 8,
  },
  iconBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  headTxt: { flex: 1, fontSize: 17, fontWeight: '900', color: '#0F172A' },

  testName: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginTop: 16, lineHeight: 27 },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginTop: 14 },

  pillRow: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 4 },
  statCol: { flex: 1, alignItems: 'center' },
  statPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    minWidth: 90,
    alignItems: 'center',
  },
  statVal: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  statLbl: { fontSize: 12, color: '#64748B', marginTop: 6, fontWeight: '600' },

  heading: { fontSize: 15, fontWeight: '900', color: '#0F172A', marginTop: 16 },

  // Table
  table: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginTop: 12,
  },
  trow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#CBD5E1' },
  thead: { backgroundColor: '#F8FAFC' },
  tcell: { paddingHorizontal: 6, paddingVertical: 10, borderRightWidth: 1, borderRightColor: '#CBD5E1', justifyContent: 'center' },
  tcellTxt: { fontSize: 12, color: '#334155' },

  // Rules
  ruleRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  ruleN: { fontSize: 13.5, fontWeight: '800', color: '#0F172A', width: 24 },
  ruleTxt: { flex: 1, fontSize: 13.5, color: '#334155', lineHeight: 20 },

  // Footer
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    backgroundColor: '#FFF',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: -4 }, shadowRadius: 10 },
      android: { elevation: 12 },
    }),
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#93C5FD',
    backgroundColor: '#FFF',
  },
  langTxt: { fontSize: 13, fontWeight: '900', color: '#2563EB' },
  startBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    ...Platform.select({
      ios: { shadowColor: '#EF4444', shadowOpacity: 0.28, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  startTxt: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.4 },

  // Modal
  mBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  mSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 10 },
  mHandle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', marginBottom: 12 },
  mTitle: { fontSize: 15, fontWeight: '900', color: '#0F172A', marginBottom: 10 },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8 },
  langRowActive: { borderColor: '#93C5FD', backgroundColor: '#EFF6FF' },
  langRowTxt: { fontSize: 13.5, fontWeight: '700', color: '#0F172A' },
});
