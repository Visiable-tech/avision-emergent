import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';

export default function Quiz() {
  const router = useRouter();
  const [quiz, setQuiz] = useState<any>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { api.dailyQuiz().then((q) => { setQuiz(q); setAnswers(new Array(q.questions.length).fill(-1)); }); }, []);

  if (!quiz) return <View style={{ flex: 1, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={theme.colors.brand} /></View>;

  const q = quiz.questions[idx];
  const total = quiz.questions.length;
  const isLast = idx === total - 1;

  const next = () => {
    const newAns = [...answers]; newAns[idx] = selected ?? -1; setAnswers(newAns);
    setSelected(newAns[idx + 1] === -1 ? null : newAns[idx + 1] ?? null);
    setIdx(idx + 1);
  };
  const prev = () => {
    const newAns = [...answers]; if (selected !== null) newAns[idx] = selected; setAnswers(newAns);
    setIdx(idx - 1);
    setSelected(newAns[idx - 1] === -1 ? null : newAns[idx - 1] ?? null);
  };
  const submit = async () => {
    const newAns = [...answers]; newAns[idx] = selected ?? -1;
    setSubmitting(true);
    try {
      const r: any = await api.submitQuiz(quiz.id, newAns);
      setResult(r);
    } finally { setSubmitting(false); }
  };

  if (result) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
        <SafeAreaView edges={['top']} style={r.headBg}>
          <LinearGradient colors={[theme.colors.brand, theme.colors.brandDark]} style={StyleSheet.absoluteFill} />
          <View style={r.headContent}>
            <Pressable testID="close-result" style={r.iconBtn} onPress={() => router.back()}><Ionicons name="close" size={22} color="#FFF" /></Pressable>
            <View style={r.trophy}><Ionicons name="trophy" size={40} color={theme.colors.gold} /></View>
            <Text style={r.done}>Quiz Complete!</Text>
            <View style={r.scoreRow}>
              <View style={r.scoreCell}><Text style={r.scoreVal}>{result.correct}/{result.total}</Text><Text style={r.scoreLbl}>Correct</Text></View>
              <View style={r.scoreCell}><Text style={r.scoreVal}>{result.accuracy}%</Text><Text style={r.scoreLbl}>Accuracy</Text></View>
              <View style={r.scoreCell}><Text style={[r.scoreVal, { color: theme.colors.gold }]}>+{result.coins_earned}</Text><Text style={r.scoreLbl}>Coins</Text></View>
              <View style={r.scoreCell}><Text style={[r.scoreVal, { color: theme.colors.gold }]}>+{result.xp_earned}</Text><Text style={r.scoreLbl}>XP</Text></View>
            </View>
          </View>
        </SafeAreaView>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <Text style={r.section}>Review</Text>
          {result.questions.map((qq: any, i: number) => (
            <View key={qq.id} style={r.reviewCard}>
              <View style={r.reviewHead}>
                <Text style={r.reviewNum}>Q{i + 1}</Text>
                <View style={[r.reviewBadge, { backgroundColor: qq.is_correct ? theme.colors.success : theme.colors.error }]}>
                  <Ionicons name={qq.is_correct ? 'checkmark' : 'close'} size={14} color="#FFF" />
                  <Text style={r.reviewBadgeTxt}>{qq.is_correct ? 'Correct' : 'Wrong'}</Text>
                </View>
              </View>
              <Text style={r.reviewQ}>{qq.text}</Text>
              <Text style={r.reviewCorrect}>✓ Correct: Option {qq.correct_answer + 1}</Text>
              <Text style={r.reviewExpl}>{qq.explanation}</Text>
            </View>
          ))}
          <Pressable testID="finish-quiz" style={r.finishBtn} onPress={() => router.replace('/(tabs)')}>
            <Text style={r.finishTxt}>Back to Home</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  const progress = ((idx + 1) / total) * 100;
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <SafeAreaView edges={['top']} style={{ paddingHorizontal: 16 }}>
        <View style={qs.head}>
          <Pressable testID="quiz-close" style={qs.iconBtn} onPress={() => router.back()}><Ionicons name="close" size={22} color={theme.colors.onSurface} /></Pressable>
          <View style={qs.progWrap}><View style={[qs.progFill, { width: `${progress}%` }]} /></View>
          <View style={qs.timer}><Ionicons name="time-outline" size={13} color={theme.colors.brand} /><Text style={qs.timerTxt}>{quiz.duration_min}:00</Text></View>
        </View>
        <Text style={qs.qNum}>Question {idx + 1} of {total}</Text>
      </SafeAreaView>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 20 }}>
        <Text style={qs.qText}>{q.text}</Text>
        <View style={{ marginTop: 20, gap: 10 }}>
          {q.options.map((opt: string, i: number) => (
            <Pressable
              key={i}
              testID={`quiz-opt-${i}`}
              style={[qs.opt, selected === i && qs.optActive]}
              onPress={() => setSelected(i)}
            >
              <View style={[qs.optLetter, selected === i && qs.optLetterActive]}>
                <Text style={[qs.optLetterTxt, selected === i && { color: '#FFF' }]}>{String.fromCharCode(65 + i)}</Text>
              </View>
              <Text style={[qs.optTxt, selected === i && { color: theme.colors.brand, fontWeight: '700' }]}>{opt}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <View style={qs.bar}>
        {idx > 0 && (
          <Pressable testID="quiz-prev" style={[qs.navBtn, qs.navPrev]} onPress={prev}>
            <Ionicons name="arrow-back" size={18} color={theme.colors.brand} />
            <Text style={qs.navPrevTxt}>Previous</Text>
          </Pressable>
        )}
        {isLast ? (
          <Pressable testID="quiz-submit" style={[qs.navBtn, qs.navNext, submitting && { opacity: 0.6 }]} onPress={submit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#FFF" /> : <>
              <Text style={qs.navNextTxt}>Submit</Text>
              <Ionicons name="checkmark" size={18} color="#FFF" />
            </>}
          </Pressable>
        ) : (
          <Pressable testID="quiz-next" style={[qs.navBtn, qs.navNext, selected === null && { opacity: 0.4 }]} disabled={selected === null} onPress={next}>
            <Text style={qs.navNextTxt}>Next</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const qs = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: theme.colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
  progWrap: { flex: 1, height: 8, backgroundColor: theme.colors.surfaceSecondary, borderRadius: 4, overflow: 'hidden' },
  progFill: { height: '100%', backgroundColor: theme.colors.gold, borderRadius: 4 },
  timer: { flexDirection: 'row', gap: 4, alignItems: 'center', backgroundColor: theme.colors.brandTertiary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  timerTxt: { fontSize: 12, fontWeight: '800', color: theme.colors.brand },
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
});

const r = StyleSheet.create({
  headBg: { paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  headContent: { paddingHorizontal: 16, paddingTop: 4, alignItems: 'center' },
  iconBtn: { position: 'absolute', left: 16, top: 4, width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  trophy: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  done: { color: '#FFF', fontSize: 22, fontWeight: '800', marginTop: 12 },
  scoreRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 18, padding: 12, marginTop: 18, width: '100%' },
  scoreCell: { flex: 1, alignItems: 'center' },
  scoreVal: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  scoreLbl: { color: 'rgba(255,255,255,0.75)', fontSize: 10, marginTop: 2 },
  section: { fontSize: 17, fontWeight: '800', color: theme.colors.onSurface, marginBottom: 12, marginTop: 8 },
  reviewCard: { padding: 14, backgroundColor: theme.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 12 },
  reviewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reviewNum: { fontSize: 12, fontWeight: '800', color: theme.colors.brand },
  reviewBadge: { flexDirection: 'row', gap: 4, alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  reviewBadgeTxt: { fontSize: 10, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  reviewQ: { fontSize: 13, fontWeight: '600', color: theme.colors.onSurface, lineHeight: 19 },
  reviewCorrect: { fontSize: 12, fontWeight: '800', color: theme.colors.success, marginTop: 8 },
  reviewExpl: { fontSize: 12, color: theme.colors.onSurfaceSecondary, marginTop: 6, lineHeight: 18 },
  finishBtn: { marginTop: 12, height: 52, borderRadius: 16, backgroundColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center' },
  finishTxt: { color: '#FFF', fontWeight: '800', fontSize: 15 },
});
