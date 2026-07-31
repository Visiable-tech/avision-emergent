import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';

export default function CourseSelect() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.activeCourses()
      .then((r) => setCourses(r.courses))
      .catch((e) => setErr(e.message || 'Could not load courses'))
      .finally(() => setLoading(false));
  }, []);

  const goNext = () => {
    if (!selected) return;
    router.push({ pathname: '/auth/register', params: { course_id: selected } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <SafeAreaView edges={['top']} style={s.head}>
        <View style={s.headRow}>
          <Pressable testID="cs-back" style={s.iconBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={theme.colors.onSurface} />
          </Pressable>
          <View style={s.stepper}>
            <View style={[s.stepDot, s.stepDotActive]}><Text style={s.stepTxtActive}>1</Text></View>
            <View style={s.stepLine} />
            <View style={s.stepDot}><Text style={s.stepTxt}>2</Text></View>
          </View>
          <View style={{ width: 38 }} />
        </View>
        <Text style={s.title}>Which course are you{'\n'}interested in?</Text>
        <Text style={s.subtitle}>Pick one to personalize your experience.{'\n'}You can change this later.</Text>
      </SafeAreaView>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.colors.brand} />
        </View>
      ) : err ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: theme.colors.error }}>{err}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          {courses.map((c) => {
            const isSel = selected === c.id;
            return (
              <Pressable
                key={c.id}
                testID={`course-card-${c.id}`}
                style={[s.card, isSel && s.cardActive]}
                onPress={() => setSelected(c.id)}
              >
                <View style={s.imgWrap}>
                  <Image source={{ uri: c.thumbnail }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={StyleSheet.absoluteFillObject} />
                  {isSel && (
                    <View style={s.checkBadge}>
                      <Ionicons name="checkmark" size={18} color="#FFF" />
                    </View>
                  )}
                  <View style={s.subjectTag}>
                    <Text style={s.subjectTxt}>{c.subject}</Text>
                  </View>
                </View>
                <View style={s.info}>
                  <Text style={s.cardTitle} numberOfLines={2}>{c.title}</Text>
                  <Text style={s.cardInstructor}>{c.instructor}</Text>
                  <View style={s.metaRow}>
                    <View style={s.metaItem}>
                      <Ionicons name="star" size={13} color={theme.colors.gold} />
                      <Text style={s.metaTxt}>{c.rating}</Text>
                    </View>
                    <Text style={s.dot}>•</Text>
                    <Text style={s.metaTxt}>{(c.students / 1000).toFixed(1)}k</Text>
                    <Text style={s.dot}>•</Text>
                    <Text style={s.metaTxt}>{c.duration_hours}h</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View style={s.bar}>
        <Pressable
          testID="cs-continue"
          style={[s.cta, !selected && s.ctaDisabled]}
          disabled={!selected}
          onPress={goNext}
        >
          <Text style={s.ctaTxt}>{selected ? 'Continue' : 'Please select a course'}</Text>
          {selected && <Ionicons name="arrow-forward" size={18} color="#FFF" />}
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  head: { paddingHorizontal: 20, paddingBottom: 16 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: theme.colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.surfaceTertiary, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: theme.colors.brand },
  stepTxt: { fontSize: 12, fontWeight: '800', color: theme.colors.muted },
  stepTxtActive: { fontSize: 12, fontWeight: '800', color: '#FFF' },
  stepLine: { width: 24, height: 2, backgroundColor: theme.colors.border },
  title: { fontSize: 24, fontWeight: '800', color: theme.colors.onSurface, marginTop: 18, lineHeight: 30 },
  subtitle: { fontSize: 13, color: theme.colors.muted, marginTop: 8, lineHeight: 19 },
  card: { marginBottom: 14, borderRadius: 22, backgroundColor: theme.colors.surface, borderWidth: 2, borderColor: theme.colors.border, overflow: 'hidden', ...(theme.shadow.soft as object) },
  cardActive: { borderColor: theme.colors.brand, ...(theme.shadow.card as object) },
  imgWrap: { height: 140, width: '100%', backgroundColor: '#111' },
  checkBadge: { position: 'absolute', top: 12, right: 12, width: 34, height: 34, borderRadius: 17, backgroundColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center', ...(theme.shadow.strong as object) },
  subjectTag: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(255,255,255,0.94)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  subjectTxt: { fontSize: 11, fontWeight: '800', color: theme.colors.brand, letterSpacing: 0.3 },
  info: { padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.onSurface, lineHeight: 20 },
  cardInstructor: { fontSize: 12, color: theme.colors.muted, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaTxt: { fontSize: 12, color: theme.colors.onSurfaceSecondary, fontWeight: '600' },
  dot: { color: theme.colors.mutedLight },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: '#FFF', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
  cta: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', height: 54, borderRadius: 16, backgroundColor: theme.colors.brand },
  ctaDisabled: { backgroundColor: theme.colors.mutedLight },
  ctaTxt: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
