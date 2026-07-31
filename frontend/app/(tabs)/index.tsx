import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { useI18n } from '@/src/i18n';
import { useCategory } from '@/src/CategoryContext';
import { HeaderDropdowns } from '@/src/components/HeaderDropdowns';

const SEARCH_ROTATE = ['SSC CGL', 'Banking', 'CLAT', 'CUET', 'IPMAT', 'UPSC'];

export default function Home() {
  const router = useRouter();
  const { t } = useI18n();
  const { categoryId, category } = useCategory();
  const [greeting, setGreeting] = useState<any>(null);
  const [quick, setQuick] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [live, setLive] = useState<any[]>([]);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [g, q, c, co, lv] = await Promise.all([
        api.greeting(),
        api.quickAccess(),
        api.examCategories(),
        api.courses(categoryId || undefined),
        api.liveClasses(categoryId || undefined),
      ]);
      setGreeting(g); setQuick(q.items); setCats(c.categories); setCourses(co.courses); setLive(lv.classes);
    } catch (e) { console.warn(e); }
  };

  useEffect(() => { load(); /* re-run when category changes */ }, [categoryId]);
  useEffect(() => {
    const t = setInterval(() => setPlaceholderIdx((i) => (i + 1) % SEARCH_ROTATE.length), 2000);
    return () => clearInterval(t);
  }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openAITutor = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/ai-tutor');
  };

  // Localized greeting label
  const greetingLabel = greeting?.greeting_key === 'morning' ? t('goodMorning')
    : greeting?.greeting_key === 'afternoon' ? t('goodAfternoon')
    : greeting?.greeting_key === 'evening' ? t('goodEvening')
    : greeting?.greeting || t('goodMorning');

  const continueCourse = courses[0];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting} testID="home-greeting">
              {greetingLabel}
            </Text>
            <Text style={styles.welcome}>{t('welcome')}, {greeting?.name || 'Student'}</Text>
            <HeaderDropdowns />
          </View>
          <Pressable testID="header-streak" style={styles.streakChip} onPress={() => router.push('/(tabs)/profile')}>
            <Ionicons name="flame" size={16} color={theme.colors.gold} />
            <Text style={styles.streakText}>{greeting?.streak ?? 0}</Text>
          </Pressable>
          <Pressable testID="header-coins" style={styles.coinsChip} onPress={() => router.push('/(tabs)/profile')}>
            <Ionicons name="ellipse" size={14} color={theme.colors.gold} />
            <Text style={styles.streakText}>{greeting?.coins ?? 0}</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.brand} />}
      >
        <Pressable
          testID="home-search-bar"
          style={styles.searchBar}
          onPress={() => router.push('/(tabs)/courses')}
        >
          <Ionicons name="search" size={20} color={theme.colors.muted} />
          <Text style={styles.searchPlaceholder}>Search "{SEARCH_ROTATE[placeholderIdx]}"</Text>
          <View style={styles.searchAI}>
            <Ionicons name="sparkles" size={14} color={theme.colors.brand} />
          </View>
        </Pressable>

        {continueCourse && (
          <Pressable
            testID="continue-learning-card"
            style={styles.heroCard}
            onPress={() => router.push(`/course/${continueCourse.id}`)}
          >
            <Image source={{ uri: continueCourse.thumbnail }} style={styles.heroImage} contentFit="cover" />
            <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(11,77,184,0.85)']} style={styles.heroScrim} />
            <View style={styles.heroContent}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>CONTINUE LEARNING</Text>
              </View>
              <Text style={styles.heroTitle} numberOfLines={2}>{continueCourse.title}</Text>
              <Text style={styles.heroInstructor}>{continueCourse.instructor} • {continueCourse.duration_hours}h</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.round(continueCourse.progress * 100)}%` }]} />
              </View>
              <View style={styles.heroBottomRow}>
                <Text style={styles.progressText}>{Math.round(continueCourse.progress * 100)}% complete</Text>
                <View style={styles.playBtn}>
                  <Ionicons name="play" size={16} color={theme.colors.brand} />
                  <Text style={styles.playText}>Resume</Text>
                </View>
              </View>
            </View>
          </Pressable>
        )}

        {/* Quick Access Grid */}
        <Text style={styles.sectionTitle}>{t('quickAccess')}</Text>
        <View style={styles.quickGrid}>
          {quick.map((q: any) => (
            <Pressable
              key={q.id}
              testID={`quick-${q.id}`}
              style={styles.quickTile}
              onPress={() => {
                if (q.id === 'daily-quiz') router.push('/quiz');
                else if (q.id === 'planner') router.push('/planner');
                else if (q.id === 'video-courses') router.push('/(tabs)/courses');
                else if (q.id === 'mock-tests') router.push('/(tabs)/tests');
                else if (q.id === 'current-affairs') router.push('/(tabs)/current-affairs');
                else if (q.id === 'live-classes') router.push('/(tabs)/courses');
                else if (q.id === 'performance') router.push('/(tabs)/profile');
                else router.push('/(tabs)/profile');
              }}
            >
              <View style={styles.quickIconWrap}>
                <Ionicons name={q.icon as any} size={22} color={theme.colors.brand} />
              </View>
              <Text style={styles.quickLabel} numberOfLines={1}>{q.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Live Now */}
        {live.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>{t('liveClasses')}</Text>
              <Text style={styles.seeAll}>{t('seeAll')}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollPad}>
              {live.map((l: any) => (
                <Pressable key={l.id} testID={`live-${l.id}`} style={styles.liveCard} onPress={() => router.push(`/live/${l.id}`)}>
                  <Image source={{ uri: l.thumbnail }} style={styles.liveImage} contentFit="cover" />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.liveScrim} />
                  {l.status === 'live' && (
                    <View style={styles.liveBadge}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveBadgeText}>LIVE</Text>
                    </View>
                  )}
                  <View style={styles.liveContent}>
                    <Text style={styles.liveTitle} numberOfLines={2}>{l.title}</Text>
                    <Text style={styles.liveMeta}>{l.instructor} • {l.time}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        {/* Complete Exam Categories */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Complete Exam Categories</Text>
        </View>
        {cats.map((cat: any) => (
          <View key={cat.id} style={{ marginBottom: theme.spacing.lg }}>
            <View style={styles.catHeader}>
              <View style={[styles.catIcon, { backgroundColor: cat.color === '#0B4DB8' ? theme.colors.brandTertiary : theme.colors.goldTint }]}>
                <Ionicons name={cat.icon} size={18} color={cat.color} />
              </View>
              <Text style={styles.catName}>{cat.name}</Text>
              <Text style={styles.catCount}>{cat.exams.length} exams</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScrollPad}>
              {cat.exams.map((e: any) => (
                <Pressable
                  key={e.id}
                  testID={`exam-${e.id}`}
                  style={styles.examCard}
                  onPress={() => router.push(`/exam/${e.id}`)}
                >
                  <View style={[styles.examCardBadge, { backgroundColor: cat.color === '#0B4DB8' ? theme.colors.brandTertiary : theme.colors.goldTint }]}>
                    <Text style={[styles.examCardShort, { color: cat.color }]}>{e.short}</Text>
                  </View>
                  <Text style={styles.examCardName} numberOfLines={2}>{e.name}</Text>
                  <View style={styles.examCardArrow}>
                    <Ionicons name="arrow-forward" size={14} color={theme.colors.brand} />
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ))}
      </ScrollView>

      {/* Floating AI Tutor */}
      <Pressable testID="fab-ai-tutor" style={styles.fabWrap} onPress={openAITutor}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={40} tint="light" style={styles.fabBlur}>
            <FabInner />
          </BlurView>
        ) : (
          <View style={[styles.fabBlur, { backgroundColor: theme.colors.brand }]}>
            <FabInner white />
          </View>
        )}
      </Pressable>
    </View>
  );
}

function FabInner({ white }: { white?: boolean }) {
  return (
    <LinearGradient colors={[theme.colors.brand, theme.colors.brandDark]} style={styles.fabInner}>
      <Ionicons name="sparkles" size={22} color="#FFF" />
      <Text style={styles.fabLabel}>AI Tutor</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.sm, gap: 8 },
  greeting: { fontSize: 14, color: theme.colors.muted, fontWeight: '500' },
  welcome: { fontSize: 22, color: theme.colors.onSurface, fontWeight: '800', marginTop: 2 },
  streakChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.goldTint, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  coinsChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.goldTint, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  streakText: { fontSize: 12, fontWeight: '700', color: theme.colors.gold },
  searchBar: {
    marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.md,
    height: 52, borderRadius: 16, backgroundColor: theme.colors.surfaceSecondary,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  searchPlaceholder: { color: theme.colors.muted, fontSize: 14, flex: 1 },
  searchAI: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  heroCard: {
    marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.lg,
    height: 200, borderRadius: 24, overflow: 'hidden', backgroundColor: theme.colors.brand,
    ...(theme.shadow.card as object),
  },
  heroImage: { ...StyleSheet.absoluteFillObject },
  heroScrim: { ...StyleSheet.absoluteFillObject },
  heroContent: { flex: 1, padding: theme.spacing.lg, justifyContent: 'flex-end' },
  heroBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginBottom: 8 },
  heroBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  heroTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  heroInstructor: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  progressBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 4, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.colors.gold },
  heroBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  progressText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  playBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  playText: { color: theme.colors.brand, fontSize: 12, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.onSurface, marginTop: theme.spacing.xl, marginBottom: theme.spacing.md, marginHorizontal: theme.spacing.lg },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: theme.spacing.lg },
  seeAll: { fontSize: 13, color: theme.colors.brand, fontWeight: '600', marginTop: theme.spacing.xl, marginBottom: theme.spacing.md },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: theme.spacing.md, gap: 0 },
  quickTile: { width: '25%', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6 },
  quickIconWrap: { width: 52, height: 52, borderRadius: 16, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  quickLabel: { fontSize: 11, color: theme.colors.onSurfaceSecondary, fontWeight: '600', textAlign: 'center' },
  hScrollPad: { paddingHorizontal: theme.spacing.lg, gap: 12 },
  liveCard: { width: 240, height: 140, borderRadius: 20, overflow: 'hidden', marginRight: 12, backgroundColor: '#000' },
  liveImage: { ...StyleSheet.absoluteFillObject },
  liveScrim: { ...StyleSheet.absoluteFillObject },
  liveBadge: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.live, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  liveBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  liveContent: { position: 'absolute', bottom: 10, left: 12, right: 12 },
  liveTitle: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  liveMeta: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },
  catHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.lg, marginBottom: 8, gap: 10 },
  catIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 16, fontWeight: '700', color: theme.colors.onSurface, flex: 1 },
  catCount: { fontSize: 12, color: theme.colors.muted, fontWeight: '600' },
  examCard: {
    width: 140, height: 130, borderRadius: 20, backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.border,
    padding: 12, marginRight: 12, justifyContent: 'space-between',
    ...(theme.shadow.soft as object),
  },
  examCardBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  examCardShort: { fontSize: 11, fontWeight: '800' },
  examCardName: { fontSize: 14, fontWeight: '700', color: theme.colors.onSurface },
  examCardArrow: { position: 'absolute', right: 12, bottom: 12, width: 26, height: 26, borderRadius: 13, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  fabWrap: { position: 'absolute', right: 16, bottom: 96, borderRadius: 999, overflow: 'hidden', ...(theme.shadow.strong as object) },
  fabBlur: { borderRadius: 999, overflow: 'hidden' },
  fabInner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999 },
  fabLabel: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});
