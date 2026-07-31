import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { useCategory } from '@/src/CategoryContext';

const FILTERS = ['All', 'SSC', 'Banking', 'UPSC', 'Law', 'Railway'];

export default function Courses() {
  const router = useRouter();
  const { categoryId } = useCategory();
  const [courses, setCourses] = useState<any[]>([]);
  const [live, setLive] = useState<any[]>([]);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    (async () => {
      const [c, l] = await Promise.all([api.courses(categoryId || undefined), api.liveClasses(categoryId || undefined)]);
      setCourses(c.courses); setLive(l.classes);
    })();
  }, [categoryId]);

  const filtered = filter === 'All' ? courses : courses.filter((c) => c.subject === filter);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <SafeAreaView edges={['top']} style={s.header}>
        <Text style={s.title}>Video Courses</Text>
        <Text style={s.subtitle}>Netflix-style learning, anytime, anywhere</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
          {FILTERS.map((f) => (
            <Pressable
              key={f}
              testID={`courses-filter-${f}`}
              style={[s.chip, filter === f && s.chipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[s.chipText, filter === f && s.chipTextActive]}>{f}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 140, paddingTop: 8 }}
        ListHeaderComponent={
          live.length > 0 ? (
            <View style={{ marginBottom: 20 }}>
              <Text style={s.section}>Live Now & Upcoming</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {live.map((l) => (
                  <Pressable key={l.id} style={s.liveMini} onPress={() => router.push(`/live/${l.id}`)} testID={`live-mini-${l.id}`}>
                    <Image source={{ uri: l.thumbnail }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFillObject} />
                    {l.status === 'live' && (
                      <View style={s.liveTag}><View style={s.liveDot} /><Text style={s.liveTagText}>LIVE</Text></View>
                    )}
                    <View style={{ position: 'absolute', bottom: 10, left: 10, right: 10 }}>
                      <Text style={s.liveMiniTitle} numberOfLines={2}>{l.title}</Text>
                      <Text style={s.liveMiniMeta}>{l.time}</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={[s.section, { marginTop: 20 }]}>All Courses</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable testID={`course-${item.id}`} style={s.courseCard} onPress={() => router.push(`/course/${item.id}`)}>
            <Image source={{ uri: item.thumbnail }} style={s.courseThumb} contentFit="cover" />
            <View style={s.courseBody}>
              <Text style={s.courseTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={s.courseInstructor}>{item.instructor}</Text>
              <View style={s.courseRow}>
                <Ionicons name="star" size={13} color={theme.colors.gold} />
                <Text style={s.courseMeta}>{item.rating}</Text>
                <Text style={s.dot}>•</Text>
                <Text style={s.courseMeta}>{(item.students / 1000).toFixed(1)}k students</Text>
              </View>
              <View style={s.progressBar}>
                <View style={[s.progressFill, { width: `${Math.round(item.progress * 100)}%` }]} />
              </View>
              <Text style={s.progressLabel}>{item.progress > 0 ? `${Math.round(item.progress * 100)}% complete` : 'Not started'}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: theme.spacing.lg, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: theme.colors.onSurface, marginTop: 8 },
  subtitle: { fontSize: 13, color: theme.colors.muted, marginTop: 4 },
  chipsRow: { paddingVertical: 12, gap: 8 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: theme.colors.surfaceSecondary, borderWidth: 1, borderColor: theme.colors.border, justifyContent: 'center', flexShrink: 0 },
  chipActive: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
  chipText: { fontSize: 13, color: theme.colors.onSurfaceSecondary, fontWeight: '600' },
  chipTextActive: { color: '#FFF' },
  section: { fontSize: 18, fontWeight: '800', color: theme.colors.onSurface, marginBottom: 12 },
  liveMini: { width: 220, height: 130, borderRadius: 18, overflow: 'hidden', backgroundColor: '#111' },
  liveTag: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.live, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  liveTagText: { fontSize: 9, fontWeight: '800', color: '#FFF' },
  liveMiniTitle: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  liveMiniMeta: { color: 'rgba(255,255,255,0.85)', fontSize: 11 },
  courseCard: { backgroundColor: theme.colors.surface, borderRadius: 20, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border, ...(theme.shadow.soft as object) },
  courseThumb: { width: '100%', height: 180 },
  courseBody: { padding: 14 },
  courseTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.onSurface },
  courseInstructor: { fontSize: 12, color: theme.colors.muted, marginTop: 4 },
  courseRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  courseMeta: { fontSize: 12, color: theme.colors.onSurfaceSecondary, fontWeight: '600' },
  dot: { color: theme.colors.mutedLight, fontSize: 12 },
  progressBar: { height: 5, backgroundColor: theme.colors.surfaceTertiary, borderRadius: 3, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.colors.gold },
  progressLabel: { fontSize: 11, color: theme.colors.muted, marginTop: 4, fontWeight: '600' },
});
