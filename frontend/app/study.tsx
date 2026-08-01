import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Platform, StatusBar as RNStatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { useCategory } from '@/src/CategoryContext';

const HUBS = [
  { id: 'video-lectures', label: 'Video Lectures', icon: 'play-circle', color: '#0B4DB8', tint: '#DBEAFE', desc: 'Recorded HD lessons' },
  { id: 'pdf-notes', label: 'PDF Notes', icon: 'document-text', color: '#4F46E5', tint: '#E0E7FF', desc: 'Chapter-wise notes' },
  { id: 'pyq', label: 'Previous Papers', icon: 'archive', color: '#0D9488', tint: '#CCFBF1', desc: 'Solved PYQ set' },
  { id: 'batches', label: 'Live Batches', icon: 'videocam', color: '#EF4444', tint: '#FEE2E2', desc: 'Enroll in courses' },
  { id: 'planner', label: 'AI Planner', icon: 'sparkles', color: '#16A34A', tint: '#DCFCE7', desc: 'Personalized plan' },
  { id: 'ca-booklet', label: 'CA Booklet', icon: 'newspaper', color: '#EA580C', tint: '#FED7AA', desc: 'Monthly booklet' },
];

const PDF_NOTES = [
  { id: 'n1', subject: 'Quant', title: 'Number Systems – Complete Notes', pages: 42, badge: 'HOT' },
  { id: 'n2', subject: 'Reasoning', title: 'Blood Relations & Puzzles Handbook', pages: 28 },
  { id: 'n3', subject: 'English', title: 'One-word Substitutes & Idioms', pages: 60, badge: 'NEW' },
  { id: 'n4', subject: 'GS', title: 'Indian Polity – Concise Revision', pages: 88 },
];

export default function StudyScreen() {
  const router = useRouter();
  const { category, categoryId } = useCategory();
  const [courses, setCourses] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const c = await api.courses(categoryId || undefined);
      setCourses(c.courses || []);
    } catch (e) { console.warn('study', e); }
  }, [categoryId]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleHubPress = (id: string) => {
    if (id === 'video-lectures') router.push('/(tabs)/courses');
    else if (id === 'batches') router.push('/(tabs)/live-class');
    else if (id === 'planner') router.push('/planner');
    else if (id === 'ca-booklet') router.push('/(tabs)/current-affairs');
    // pdf-notes & pyq intentionally stay on this page (in-page section)
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surfaceSecondary }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Hero */}
      <LinearGradient colors={['#4F46E5', '#312E81']} style={s.hero}>
        <SafeAreaView edges={['top']}>
          <View style={s.headerRow}>
            <Pressable onPress={() => router.back()} testID="study-back" hitSlop={12} style={s.iconBtn}>
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </Pressable>
            <View style={{ flex: 1, marginLeft: 6 }}>
              <Text style={s.headerTitle}>Study Hub</Text>
              <Text style={s.headerSub}>{category?.name || 'All Categories'}</Text>
            </View>
            <MaterialCommunityIcons name="book-open-page-variant-outline" size={26} color="rgba(255,255,255,0.35)" />
          </View>
          <Text style={s.heroTag}>Everything you need to prep smarter</Text>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.brand} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Study hubs grid 3x2 */}
        <View style={s.hubGrid}>
          {HUBS.map((h) => (
            <Pressable
              key={h.id}
              testID={`study-hub-${h.id}`}
              style={s.hubCard}
              onPress={() => handleHubPress(h.id)}
            >
              <View style={[s.hubIcon, { backgroundColor: h.tint }]}>
                <Ionicons name={h.icon as any} size={22} color={h.color} />
              </View>
              <Text style={s.hubTitle}>{h.label}</Text>
              <Text style={s.hubDesc}>{h.desc}</Text>
            </Pressable>
          ))}
        </View>

        {/* Featured Courses */}
        {courses.length > 0 && (
          <>
            <SectionRow title="Featured Courses" onViewAll={() => router.push('/(tabs)/courses')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hScroll}>
              {courses.slice(0, 6).map((c: any) => (
                <Pressable
                  key={c.id}
                  testID={`study-course-${c.id}`}
                  style={s.courseCard}
                  onPress={() => router.push(`/course/${c.id}`)}
                >
                  <Image source={{ uri: c.thumbnail }} style={s.courseThumb} contentFit="cover" />
                  <View style={{ padding: 10 }}>
                    <Text style={s.courseTitle} numberOfLines={2}>{c.title}</Text>
                    <View style={s.miniRow}>
                      <Ionicons name="star" size={12} color={theme.colors.gold} />
                      <Text style={s.miniTxt}>{c.rating}</Text>
                      <Text style={s.dot}>•</Text>
                      <Text style={s.miniTxt}>{c.duration_hours}h</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        {/* PDF Notes */}
        <SectionRow title="Latest PDF Notes" />
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {PDF_NOTES.map((n) => (
            <Pressable
              key={n.id}
              testID={`study-note-${n.id}`}
              style={s.noteCard}
              onPress={() => router.push('/(tabs)/current-affairs')}
            >
              <View style={s.noteIcon}>
                <MaterialCommunityIcons name="file-pdf-box" size={26} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.noteRow}>
                  <View style={s.subjectPill}><Text style={s.subjectPillTxt}>{n.subject}</Text></View>
                  {n.badge ? (
                    <View style={[s.newBadge, n.badge === 'HOT' && { backgroundColor: '#EF4444' }]}>
                      <Text style={s.newBadgeTxt}>{n.badge}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={s.noteTitle} numberOfLines={2}>{n.title}</Text>
                <View style={s.noteMeta}>
                  <Ionicons name="document-outline" size={11} color={theme.colors.muted} />
                  <Text style={s.noteMetaTxt}>{n.pages} pages • PDF</Text>
                </View>
              </View>
              <View style={s.downloadBtn}>
                <Ionicons name="download-outline" size={16} color={theme.colors.brand} />
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function SectionRow({ title, onViewAll }: { title: string; onViewAll?: () => void }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionTitle}>{title}</Text>
      {onViewAll && (
        <Pressable onPress={onViewAll}>
          <Text style={s.viewAll}>View All →</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  hero: { paddingHorizontal: 16, paddingBottom: 24, paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 6 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2, fontWeight: '600' },
  heroTag: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600', marginTop: 8 },
  hubGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingTop: 12, gap: 10, justifyContent: 'space-between' },
  hubCard: {
    width: '31%',
    backgroundColor: theme.colors.surface,
    padding: 12, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border,
    ...(theme.shadow.soft as object),
  },
  hubIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  hubTitle: { fontSize: 12.5, fontWeight: '900', color: theme.colors.onSurface, marginTop: 8 },
  hubDesc: { fontSize: 10.5, color: theme.colors.muted, marginTop: 2, fontWeight: '600' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 22, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: theme.colors.onSurface },
  viewAll: { fontSize: 13, color: theme.colors.brand, fontWeight: '700' },
  hScroll: { paddingHorizontal: 16, gap: 12 },
  courseCard: { width: 200, borderRadius: 16, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, marginRight: 12, overflow: 'hidden', ...(theme.shadow.soft as object) },
  courseThumb: { width: '100%', height: 110 },
  courseTitle: { fontSize: 13, fontWeight: '800', color: theme.colors.onSurface, lineHeight: 17 },
  miniRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  miniTxt: { fontSize: 11, color: theme.colors.onSurfaceSecondary, fontWeight: '600' },
  dot: { color: theme.colors.mutedLight },
  noteCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: theme.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border },
  noteIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  subjectPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: theme.colors.brandTertiary },
  subjectPillTxt: { fontSize: 10, fontWeight: '800', color: theme.colors.brand, letterSpacing: 0.3 },
  newBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: theme.colors.success },
  newBadgeTxt: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  noteTitle: { fontSize: 13, fontWeight: '800', color: theme.colors.onSurface, marginTop: 4 },
  noteMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  noteMetaTxt: { fontSize: 11, color: theme.colors.muted, fontWeight: '600' },
  downloadBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
});
