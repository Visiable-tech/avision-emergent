import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';

const EXAMS = ['SSC CGL', 'Banking PO', 'UPSC', 'CLAT', 'CUET', 'IPMAT', 'RRB NTPC'];
const SUBJECTS = ['Quant', 'Reasoning', 'English', 'GK / CA', 'Polity', 'History', 'Legal Reasoning'];

export default function Planner() {
  const router = useRouter();
  const [exam, setExam] = useState('SSC CGL');
  const [hours, setHours] = useState('4');
  const [weak, setWeak] = useState<string[]>(['Quant']);
  const [target, setTarget] = useState('Dec 2026');
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = (s: string) => setWeak((w) => (w.includes(s) ? w.filter((x) => x !== s) : [...w, s]));

  const generate = async () => {
    setLoading(true); setPlan(null);
    try {
      const res: any = await api.studyPlanner(exam, parseInt(hours) || 4, weak, target);
      setPlan(res.plan);
    } catch (e) {
      setPlan('Sorry, unable to generate a plan right now. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <SafeAreaView edges={['top']} style={s.head}>
        <LinearGradient colors={[theme.colors.brand, theme.colors.brandDark]} style={StyleSheet.absoluteFill} />
        <View style={s.headRow}>
          <Pressable testID="close-planner" style={s.iconBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={22} color="#FFF" />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.title}>AI Study Planner</Text>
            <Text style={s.subtitle}>Personalized weekly plan in seconds</Text>
          </View>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={s.label}>Target Exam</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
            {EXAMS.map((e) => (
              <Pressable key={e} testID={`planner-exam-${e}`} style={[s.chip, exam === e && s.chipActive]} onPress={() => setExam(e)}>
                <Text style={[s.chipTxt, exam === e && s.chipTxtActive]}>{e}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={s.label}>Available Hours / Day</Text>
          <View style={s.hoursRow}>
            {['2', '3', '4', '6', '8'].map((h) => (
              <Pressable key={h} testID={`planner-hours-${h}`} style={[s.hourBtn, hours === h && s.hourBtnActive]} onPress={() => setHours(h)}>
                <Text style={[s.hourTxt, hours === h && s.hourTxtActive]}>{h}h</Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.label}>Weak Subjects (multi-select)</Text>
          <View style={s.weakRow}>
            {SUBJECTS.map((sub) => (
              <Pressable key={sub} testID={`planner-weak-${sub}`} style={[s.chip, weak.includes(sub) && s.chipActive]} onPress={() => toggle(sub)}>
                <Text style={[s.chipTxt, weak.includes(sub) && s.chipTxtActive]}>{sub}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={s.label}>Target Date</Text>
          <TextInput
            testID="planner-target"
            value={target}
            onChangeText={setTarget}
            style={s.input}
            placeholder="Dec 2026"
            placeholderTextColor={theme.colors.mutedLight}
          />

          <Pressable testID="planner-generate" style={s.cta} onPress={generate} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Ionicons name="sparkles" size={18} color="#FFF" />
                <Text style={s.ctaTxt}>Generate My Plan</Text>
              </>
            )}
          </Pressable>

          {plan && (
            <View style={s.planCard} testID="planner-result">
              <View style={s.planHead}>
                <View style={s.planBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} />
                  <Text style={s.planBadgeTxt}>YOUR PLAN</Text>
                </View>
                <Text style={s.planExam}>{exam} • {target}</Text>
              </View>
              <Text style={s.planBody}>{plan}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  head: { paddingBottom: 14 },
  headRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 4 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 1 },
  label: { fontSize: 13, fontWeight: '800', color: theme.colors.onSurface, marginTop: 18, marginBottom: 8 },
  chipsRow: { gap: 8, paddingRight: 8 },
  weakRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: theme.colors.surfaceSecondary, borderWidth: 1, borderColor: theme.colors.border, justifyContent: 'center', flexShrink: 0 },
  chipActive: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
  chipTxt: { fontSize: 13, fontWeight: '600', color: theme.colors.onSurfaceSecondary },
  chipTxtActive: { color: '#FFF' },
  hoursRow: { flexDirection: 'row', gap: 8 },
  hourBtn: { flex: 1, height: 48, borderRadius: 14, backgroundColor: theme.colors.surfaceSecondary, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  hourBtnActive: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
  hourTxt: { fontSize: 15, fontWeight: '800', color: theme.colors.onSurfaceSecondary },
  hourTxtActive: { color: '#FFF' },
  input: { height: 48, borderRadius: 14, backgroundColor: theme.colors.surfaceSecondary, paddingHorizontal: 14, fontSize: 14, color: theme.colors.onSurface, borderWidth: 1, borderColor: theme.colors.border },
  cta: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', height: 54, borderRadius: 16, backgroundColor: theme.colors.brand, marginTop: 24 },
  ctaTxt: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  planCard: { marginTop: 20, padding: 16, borderRadius: 20, backgroundColor: theme.colors.brandTertiary, borderWidth: 1, borderColor: 'rgba(11,77,184,0.15)' },
  planHead: { marginBottom: 10 },
  planBadge: { flexDirection: 'row', gap: 4, alignItems: 'center', alignSelf: 'flex-start' },
  planBadgeTxt: { fontSize: 10, fontWeight: '800', color: theme.colors.success, letterSpacing: 0.5 },
  planExam: { fontSize: 15, fontWeight: '800', color: theme.colors.brand, marginTop: 4 },
  planBody: { fontSize: 13, color: theme.colors.onSurface, lineHeight: 20 },
});
