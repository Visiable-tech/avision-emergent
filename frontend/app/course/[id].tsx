import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';

export default function CourseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<any>(null);
  const [tab, setTab] = useState<'Lessons' | 'Notes' | 'Discussion'>('Lessons');

  useEffect(() => { if (id) api.courseDetail(id).then(setCourse); }, [id]);
  if (!course) return <View style={{ flex: 1, backgroundColor: '#FFF' }} />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <View style={s.playerWrap}>
        <Image source={{ uri: course.thumbnail }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        <LinearGradient colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.6)']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView edges={['top']} style={s.playerTop}>
          <Pressable testID="back-btn" style={s.iconBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={s.iconBtn} testID="download-course"><Ionicons name="download-outline" size={20} color="#FFF" /></Pressable>
            <Pressable style={s.iconBtn} testID="share-course"><Ionicons name="share-outline" size={20} color="#FFF" /></Pressable>
          </View>
        </SafeAreaView>
        <View style={s.playCenter}>
          <View style={s.playBig}>
            <Ionicons name="play" size={36} color={theme.colors.brand} />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 16 }}>
          <Text style={s.title}>{course.title}</Text>
          <View style={s.metaRow}>
            <Ionicons name="star" size={14} color={theme.colors.gold} />
            <Text style={s.meta}>{course.rating}</Text>
            <Text style={s.dot}>•</Text>
            <Text style={s.meta}>{(course.students / 1000).toFixed(1)}k students</Text>
            <Text style={s.dot}>•</Text>
            <Text style={s.meta}>{course.duration_hours}h</Text>
          </View>
          <View style={s.instructorRow}>
            <View style={s.instructorAvatar}><Text style={s.iaText}>{course.instructor[0]}</Text></View>
            <View>
              <Text style={s.instructorName}>{course.instructor}</Text>
              <Text style={s.instructorRole}>Senior Faculty • {course.subject}</Text>
            </View>
          </View>
          <View style={s.progressCard}>
            <View style={s.progressHead}>
              <Text style={s.progLbl}>Course Progress</Text>
              <Text style={s.progPct}>{Math.round(course.progress * 100)}%</Text>
            </View>
            <View style={s.progBar}>
              <View style={[s.progFill, { width: `${Math.round(course.progress * 100)}%` }]} />
            </View>
          </View>
        </View>

        <View style={s.tabs}>
          {(['Lessons', 'Notes', 'Discussion'] as const).map((t) => (
            <Pressable key={t} testID={`ct-${t}`} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
              <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>{t}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'Lessons' && (
          <View style={{ paddingHorizontal: 16 }}>
            {course.chapters.map((ch: any, i: number) => (
              <View key={ch.id} style={s.lesson}>
                <View style={[s.lessonNum, ch.watched && { backgroundColor: theme.colors.success }]}>
                  {ch.watched ? <Ionicons name="checkmark" size={16} color="#FFF" /> : <Text style={s.lessonNumTxt}>{i + 1}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.lessonTitle}>{ch.title}</Text>
                  <View style={s.lessonMeta}>
                    <Ionicons name="time-outline" size={12} color={theme.colors.muted} />
                    <Text style={s.lessonDur}>{ch.duration}</Text>
                  </View>
                </View>
                <Pressable style={s.lessonPlay}>
                  <Ionicons name={ch.watched ? 'refresh' : 'play'} size={16} color={theme.colors.brand} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
        {tab === 'Notes' && (
          <View style={{ padding: 16 }}>
            {['Chapter 1 – Number System PDF', 'Formula sheet – Quant', 'Handwritten notes – Ratios'].map((n) => (
              <View key={n} style={s.noteRow}>
                <Ionicons name="document-text-outline" size={22} color={theme.colors.brand} />
                <Text style={s.noteTxt}>{n}</Text>
                <Ionicons name="download-outline" size={18} color={theme.colors.brand} />
              </View>
            ))}
          </View>
        )}
        {tab === 'Discussion' && (
          <View style={{ padding: 16 }}>
            {[
              { u: 'Priya S.', q: 'Can someone explain compound interest with a worked example?', t: '2h ago' },
              { u: 'Rahul K.', q: 'Which book is best for advanced DI?', t: '5h ago' },
              { u: 'Anjali M.', q: 'How to improve calculation speed?', t: '1d ago' },
            ].map((d, i) => (
              <View key={i} style={s.discRow}>
                <View style={s.discAvatar}><Text style={s.discAvT}>{d.u[0]}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.discUser}>{d.u} <Text style={s.discTime}>• {d.t}</Text></Text>
                  <Text style={s.discQ}>{d.q}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  playerWrap: { height: 240, backgroundColor: '#111' },
  playerTop: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 4 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  playCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  playBig: { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center', ...(theme.shadow.strong as object) },
  title: { fontSize: 20, fontWeight: '800', color: theme.colors.onSurface },
  metaRow: { flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 8 },
  meta: { fontSize: 12, color: theme.colors.onSurfaceSecondary, fontWeight: '600' },
  dot: { color: theme.colors.mutedLight, fontSize: 12 },
  instructorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  instructorAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center' },
  iaText: { color: '#FFF', fontWeight: '800' },
  instructorName: { fontSize: 14, fontWeight: '700', color: theme.colors.onSurface },
  instructorRole: { fontSize: 11, color: theme.colors.muted, marginTop: 2 },
  progressCard: { marginTop: 16, padding: 14, backgroundColor: theme.colors.brandTertiary, borderRadius: 16 },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between' },
  progLbl: { fontSize: 12, fontWeight: '700', color: theme.colors.brand },
  progPct: { fontSize: 12, fontWeight: '800', color: theme.colors.brand },
  progBar: { height: 6, backgroundColor: 'rgba(11,77,184,0.15)', borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  progFill: { height: '100%', backgroundColor: theme.colors.gold, borderRadius: 3 },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginTop: 4, marginBottom: 12 },
  tab: { height: 36, paddingHorizontal: 16, borderRadius: 999, backgroundColor: theme.colors.surfaceSecondary, justifyContent: 'center' },
  tabActive: { backgroundColor: theme.colors.brand },
  tabTxt: { fontSize: 12, fontWeight: '700', color: theme.colors.onSurfaceSecondary },
  tabTxtActive: { color: '#FFF' },
  lesson: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, backgroundColor: theme.colors.surface, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.border },
  lessonNum: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
  lessonNumTxt: { fontSize: 13, fontWeight: '800', color: theme.colors.onSurfaceSecondary },
  lessonTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.onSurface },
  lessonMeta: { flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 4 },
  lessonDur: { fontSize: 11, color: theme.colors.muted, fontWeight: '600' },
  lessonPlay: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  noteRow: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, backgroundColor: theme.colors.surfaceSecondary, borderRadius: 14, marginBottom: 10 },
  noteTxt: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.colors.onSurface },
  discRow: { flexDirection: 'row', gap: 10, padding: 12, backgroundColor: theme.colors.surfaceSecondary, borderRadius: 14, marginBottom: 10 },
  discAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.gold, alignItems: 'center', justifyContent: 'center' },
  discAvT: { color: '#FFF', fontWeight: '700' },
  discUser: { fontSize: 13, fontWeight: '700', color: theme.colors.onSurface },
  discTime: { fontSize: 11, color: theme.colors.muted, fontWeight: '500' },
  discQ: { fontSize: 13, color: theme.colors.onSurfaceSecondary, marginTop: 4, lineHeight: 18 },
});
