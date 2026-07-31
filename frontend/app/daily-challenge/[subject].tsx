import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';
import { useI18n } from '@/src/i18n';

export default function DailyChallenge() {
  const { subject } = useLocalSearchParams<{ subject: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const [meta, setMeta] = useState<any>(null);
  const [qs, setQs] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const started = useRef<number>(Date.now());

  useEffect(() => {
    if (!subject) return;
    api.dailyChallengeDetail(subject).then((r: any) => {
      setMeta(r); setQs(r.questions); setAnswers(new Array(r.questions.length).fill(-1));
      started.current = Date.now();
    }).catch((e: any) => setErr(e.message || 'Could not load challenge'));
  }, [subject]);

  if (err) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#FFF' }}>
      <Ionicons name="alert-circle" size={40} color={theme.colors.error} />
      <Text style={{ color: theme.colors.error, marginTop: 12, textAlign: 'center' }}>{err}</Text>
      <Pressable style={s.finishBtn} onPress={() => router.back()}><Text style={s.finishTxt}>Back</Text></Pressable>
    </View>
  );
  if (!meta) return <View style={{ flex: 1, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={theme.colors.brand} /></View>;

  const q = qs[idx];
  const total = qs.length;
  const isLast = idx === total - 1;

  const next = () => {
    const na = [...answers]; na[idx] = selected ?? -1; setAnswers(na);
    setSelected(na[idx + 1] === -1 ? null : na[idx + 1]);
    setIdx(idx + 1);
  };
  const prev = () => {
    const na = [...answers]; if (selected !== null) na[idx] = selected; setAnswers(na);
    setIdx(idx - 1); setSelected(na[idx - 1] === -1 ? null : na[idx - 1]);
  };
  const submit = async () => {
    const na = [...answers]; na[idx] = selected ?? -1;
    setSubmitting(true);
    try {
      const tsec = Math.round((Date.now() - started.current) / 1000);
      const r = await api.dailyChallengeSubmit(subject!, na, tsec, user?.user_id);
      setResult(r);
    } catch (e: any) {
      setErr(e.message || 'Submit failed');
    } finally { setSubmitting(false); }
  };

  if (result) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
        <SafeAreaView edges={['top']} style={r.headBg}>
          <LinearGradient colors={[theme.colors.brand, theme.colors.brandDark]} style={StyleSheet.absoluteFill} />
          <View style={r.headContent}>
            <Pressable testID="dc-close-result" style={r.iconBtn} onPress={() => router.replace('/(tabs)')}><Ionicons name="close" size={22} color="#FFF" /></Pressable>
            <View style={r.trophy}><Ionicons name="trophy" size={40} color={theme.colors.gold} /></View>
            <Text style={r.done}>{result.subject_name}</Text>
            <View style={r.scoreRow}>
              <View style={r.scoreCell}><Text style={r.scoreVal}>{result.correct}/{result.total}</Text><Text style={r.scoreLbl}>{t('yourScore')}</Text></View>
              <View style={r.scoreCell}><Text style={r.scoreVal}>{result.accuracy}%</Text><Text style={r.scoreLbl}>{t('accuracy')}</Text></View>
              <View style={r.scoreCell}><Text style={r.scoreVal}>{Math.round(result.time_taken_sec / 60)}m {result.time_taken_sec % 60}s</Text><Text style={r.scoreLbl}>{t('timeTaken')}</Text></View>
              <View style={r.scoreCell}><Text style={[r.scoreVal, { color: theme.colors.gold }]}>#{result.rank}</Text><Text style={r.scoreLbl}>{t('yourRank')}</Text></View>
            </View>
            <Text style={r.reward}>+{result.coins_earned} coins  •  +{result.xp_earned} XP</Text>
          </View>
        </SafeAreaView>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
          <Text style={r.section}>Review</Text>
          {result.questions.map((qq: any, i: number) => (
            <View key={qq.id} style={r.reviewCard}>
              <View style={r.reviewHead}>
                <Text style={r.reviewNum}>Q{i + 1}</Text>
                <View style={[r.reviewBadge, { backgroundColor: qq.is_correct ? theme.colors.success : theme.colors.error }]}>
                  <Ionicons name={qq.is_correct ? 'checkmark' : 'close'} size={14} color="#FFF" />
                </View>
              </View>
              <Text style={r.reviewQ}>{qq.text}</Text>
              <Text style={r.correct}>✓ {qq.options[qq.correct_answer]}</Text>
              <Text style={r.expl}>{qq.explanation}</Text>
            </View>
          ))}
          <Pressable testID="dc-finish" style={s.finishBtn} onPress={() => router.replace('/(tabs)')}><Text style={s.finishTxt}>Back to Home</Text></Pressable>
        </ScrollView>
      </View>
    );
  }

  const progress = ((idx + 1) / total) * 100;
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <SafeAreaView edges={['top']} style={{ paddingHorizontal: 16 }}>
        <View style={s.head}>
          <Pressable testID="dc-close" style={s.iconBtn} onPress={() => router.back()}><Ionicons name="close" size={22} color={theme.colors.onSurface} /></Pressable>
          <View style={s.progWrap}><View style={[s.progFill, { width: `${progress}%` }]} /></View>
          <View style={s.timer}><Ionicons name="time-outline" size={13} color={theme.colors.brand} /><Text style={s.timerTxt}>{meta.duration_min}:00</Text></View>
        </View>
        <View style={s.subjRow}>
          <View style={s.subjIcon}><Ionicons name={meta.icon} size={16} color={theme.colors.brand} /></View>
          <Text style={s.subjName}>{meta.name}</Text>
          <View style={[s.diffChip, { backgroundColor: meta.difficulty === 'Hard' ? '#FEE2E2' : meta.difficulty === 'Medium' ? '#FEF3C7' : '#DCFCE7' }]}>
            <Text style={[s.diffTxt, { color: meta.difficulty === 'Hard' ? theme.colors.error : meta.difficulty === 'Medium' ? theme.colors.warning : theme.colors.success }]}>{meta.difficulty}</Text>
          </View>
        </View>
        <Text style={s.qNum}>Question {idx + 1} of {total}</Text>
      </SafeAreaView>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 20 }}>
        <Text style={s.qText}>{q.text}</Text>
        <View style={{ marginTop: 20, gap: 10 }}>
          {q.options.map((opt: string, i: number) => (
            <Pressable key={i} testID={`dc-opt-${i}`} style={[s.opt, selected === i && s.optActive]} onPress={() => setSelected(i)}>
              <View style={[s.optLetter, selected === i && s.optLetterActive]}>
                <Text style={[s.optLetterTxt, selected === i && { color: '#FFF' }]}>{String.fromCharCode(65 + i)}</Text>
              </View>
              <Text style={[s.optTxt, selected === i && { color: theme.colors.brand, fontWeight: '700' }]}>{opt}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <View style={s.bar}>
        {idx > 0 && (
          <Pressable testID="dc-prev" style={[s.navBtn, s.navPrev]} onPress={prev}>
            <Ionicons name="arrow-back" size={18} color={theme.colors.brand} />
            <Text style={s.navPrevTxt}>{t('previous')}</Text>
          </Pressable>
        )}
        {isLast ? (
          <Pressable testID="dc-submit" style={[s.navBtn, s.navNext, submitting && { opacity: 0.6 }]} onPress={submit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#FFF" /> : (<><Text style={s.navNextTxt}>{t('submit')}</Text><Ionicons name="checkmark" size={18} color="#FFF" /></>)}
          </Pressable>
        ) : (
          <Pressable testID="dc-next" style={[s.navBtn, s.navNext, selected === null && { opacity: 0.4 }]} disabled={selected === null} onPress={next}>
            <Text style={s.navNextTxt}>{t('next')}</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: theme.colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
  progWrap: { flex: 1, height: 8, backgroundColor: theme.colors.surfaceSecondary, borderRadius: 4, overflow: 'hidden' },
  progFill: { height: '100%', backgroundColor: theme.colors.gold },
  timer: { flexDirection: 'row', gap: 4, alignItems: 'center', backgroundColor: theme.colors.brandTertiary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  timerTxt: { fontSize: 12, fontWeight: '800', color: theme.colors.brand },
  subjRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  subjIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  subjName: { fontSize: 14, fontWeight: '800', color: theme.colors.onSurface, flex: 1 },
  diffChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  diffTxt: { fontSize: 10, fontWeight: '800' },
  qNum: { fontSize: 12, fontWeight: '700', color: theme.colors.muted, marginTop: 4 },
  qText: { fontSize: 18, fontWeight: '700', color: theme.colors.onSurface, lineHeight: 26, marginTop: 8 },
  opt: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 16, backgroundColor: theme.colors.surface, borderRadius: 16, borderWidth: 2, borderColor: theme.colors.border },
  optActive: { borderColor: theme.colors.brand, backgroundColor: theme.colors.brandTertiary },
  optLetter: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
  optLetterActive: { backgroundColor: theme.colors.brand },
  optLetterTxt: { fontSize: 14, fontWeight: '800', color: theme.colors.onSurfaceSecondary },
  optTxt: { flex: 1, fontSize: 14, color: theme.colors.onSurface, lineHeight: 20 },
  bar: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
  navBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 16 },
  navPrev: { paddingHorizontal: 18, backgroundColor: theme.colors.brandTertiary },
  navPrevTxt: { color: theme.colors.brand, fontWeight: '800', fontSize: 14 },
  navNext: { flex: 1, backgroundColor: theme.colors.brand },
  navNextTxt: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  finishBtn: { marginTop: 20, height: 52, borderRadius: 16, backgroundColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center' },
  finishTxt: { color: '#FFF', fontWeight: '800', fontSize: 15 },
});

const r = StyleSheet.create({
  headBg: { paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  headContent: { paddingHorizontal: 16, paddingTop: 4, alignItems: 'center' },
  iconBtn: { position: 'absolute', left: 16, top: 4, width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  trophy: { width: 78, height: 78, borderRadius: 39, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  done: { color: '#FFF', fontSize: 20, fontWeight: '800', marginTop: 10 },
  scoreRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 18, padding: 12, marginTop: 16, width: '100%' },
  scoreCell: { flex: 1, alignItems: 'center' },
  scoreVal: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  scoreLbl: { color: 'rgba(255,255,255,0.75)', fontSize: 10, marginTop: 2 },
  reward: { color: theme.colors.gold, fontWeight: '800', fontSize: 13, marginTop: 12 },
  section: { fontSize: 17, fontWeight: '800', color: theme.colors.onSurface, marginBottom: 12, marginTop: 4 },
  reviewCard: { padding: 14, backgroundColor: theme.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 12 },
  reviewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reviewNum: { fontSize: 12, fontWeight: '800', color: theme.colors.brand },
  reviewBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reviewQ: { fontSize: 13, fontWeight: '600', color: theme.colors.onSurface, lineHeight: 19 },
  correct: { fontSize: 12, fontWeight: '800', color: theme.colors.success, marginTop: 8 },
  expl: { fontSize: 12, color: theme.colors.onSurfaceSecondary, marginTop: 6, lineHeight: 18 },
});
