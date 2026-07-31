import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Platform, Dimensions, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { useI18n } from '@/src/i18n';
import { useCategory } from '@/src/CategoryContext';
import { useAuth } from '@/src/AuthContext';
import { HeaderDropdowns } from '@/src/components/HeaderDropdowns';

const W = Dimensions.get('window').width;
const BANNER_W = W - 32;

export default function Home() {
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useAuth();
  const { categoryId, category } = useCategory();
  const [greeting, setGreeting] = useState<any>(null);
  const [quick, setQuick] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [latestCA, setLatestCA] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [live, setLive] = useState<any[]>([]);
  const [mocks, setMocks] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const bannerRef = useRef<FlatList<any>>(null);

  const load = useCallback(async () => {
    try {
      const [g, q, b, la, co, lv, mt, dc, jb] = await Promise.all([
        api.greeting(),
        api.quickAccess(),
        api.banners(categoryId || undefined),
        api.currentAffairsLatest(categoryId || undefined).catch(() => null),
        api.courses(categoryId || undefined),
        api.liveClasses(categoryId || undefined),
        api.mockTests(categoryId || undefined),
        api.dailyChallenges(categoryId || undefined, user?.user_id),
        api.jobAlerts(categoryId || undefined, 5),
      ]);
      setGreeting(g); setQuick(q.items); setBanners(b.banners); setLatestCA(la);
      setCourses(co.courses); setLive(lv.classes); setMocks(mt.tests);
      setChallenges(dc.challenges); setJobs(jb.jobs);
    } catch (e) { console.warn('home load', e); }
  }, [categoryId, user?.user_id]);

  useEffect(() => { load(); }, [load]);

  // Auto-slide banners
  useEffect(() => {
    if (banners.length < 2) return;
    const id = setInterval(() => {
      setBannerIdx((i) => {
        const next = (i + 1) % banners.length;
        bannerRef.current?.scrollToOffset({ offset: next * BANNER_W, animated: true });
        return next;
      });
    }, 4500);
    return () => clearInterval(id);
  }, [banners.length]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openAITutor = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/ai-tutor');
  };

  const greetingLabel = greeting?.greeting_key === 'morning' ? t('goodMorning')
    : greeting?.greeting_key === 'afternoon' ? t('goodAfternoon')
    : greeting?.greeting_key === 'evening' ? t('goodEvening') : t('goodMorning');

  const continueCourse = courses[0];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <SafeAreaView edges={['top']} style={s.header}>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting} testID="home-greeting">{greetingLabel}</Text>
            <Text style={s.welcome}>{t('welcome')}, {greeting?.name || 'Student'}</Text>
            <HeaderDropdowns />
          </View>
          <Pressable testID="header-streak" style={s.streakChip} onPress={() => router.push('/(tabs)/profile')}>
            <Ionicons name="flame" size={16} color={theme.colors.gold} />
            <Text style={s.streakText}>{greeting?.streak ?? 0}</Text>
          </Pressable>
          <Pressable testID="header-coins" style={s.coinsChip} onPress={() => router.push('/(tabs)/profile')}>
            <Ionicons name="ellipse" size={14} color={theme.colors.gold} />
            <Text style={s.streakText}>{greeting?.coins ?? 0}</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.brand} />}
      >
        {/* 1. Banner Slider */}
        {banners.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <FlatList
              ref={bannerRef}
              testID="banner-slider"
              data={banners}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(i) => i.id}
              onMomentumScrollEnd={(e) => setBannerIdx(Math.round(e.nativeEvent.contentOffset.x / BANNER_W))}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              renderItem={({ item }) => (
                <Pressable testID={`banner-${item.id}`} style={[s.banner, { width: BANNER_W }]} onPress={() => item.route && router.push(item.route)}>
                  <Image source={{ uri: item.image }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={200} />
                  <LinearGradient colors={['rgba(11,77,184,0.4)', 'rgba(11,77,184,0.85)']} style={StyleSheet.absoluteFillObject} />
                  <View style={s.bannerContent}>
                    <Text style={s.bannerTitle}>{item.title}</Text>
                    <Text style={s.bannerSubtitle}>{item.subtitle}</Text>
                    <View style={s.bannerCta}>
                      <Text style={s.bannerCtaTxt}>{item.cta}</Text>
                      <Ionicons name="arrow-forward" size={14} color={theme.colors.brand} />
                    </View>
                  </View>
                </Pressable>
              )}
            />
            <View style={s.bannerDots}>
              {banners.map((_, i) => (
                <View key={i} style={[s.dot, i === bannerIdx && s.dotActive]} />
              ))}
            </View>
          </View>
        )}

        {/* 2. Quick Access */}
        <SectionTitle title={t('quickAccess')} />
        <View style={s.quickGrid}>
          {quick.map((q: any) => (
            <Pressable
              key={q.id}
              testID={`quick-${q.id}`}
              style={s.quickTile}
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
              <View style={s.quickIconWrap}>
                <Ionicons name={q.icon as any} size={22} color={theme.colors.brand} />
              </View>
              <Text style={s.quickLabel} numberOfLines={1}>{q.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* 3. Exam Category (selected only) */}
        {category && (
          <>
            <SectionTitle title={t('yourCategory')} />
            <Pressable testID="cat-header-card" style={s.catCard} onPress={() => router.push('/(tabs)/profile')}>
              <View style={s.catIconWrap}>
                <Ionicons name={(category.icon as any) || 'apps-outline'} size={26} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.catName}>{category.name}</Text>
                <Text style={s.catExams} numberOfLines={2}>
                  {(category.exams || []).slice(0, 4).map((e: any) => e.name).join(' • ')}
                </Text>
              </View>
              <View style={s.catChangeBtn}>
                <Text style={s.catChangeTxt}>{t('change')}</Text>
                <Ionicons name="chevron-forward" size={14} color={theme.colors.brand} />
              </View>
            </Pressable>
          </>
        )}

        {/* 4. Daily Current Affairs */}
        {latestCA && (
          <>
            <SectionRow
              title={t('dailyCurrentAffairs')}
              onViewAll={() => router.push('/(tabs)/current-affairs')}
            />
            <Pressable testID="ca-latest-card" style={s.caCard} onPress={() => router.push('/(tabs)/current-affairs')}>
              <Image source={{ uri: latestCA.image }} style={s.caImg} contentFit="cover" transition={200} />
              <View style={s.caBody}>
                <View style={s.caTag}><Text style={s.caTagTxt}>{latestCA.category}</Text></View>
                <Text style={s.caTitle} numberOfLines={2}>{latestCA.title}</Text>
                <Text style={s.caSummary} numberOfLines={3}>{latestCA.summary}</Text>
                <View style={s.caFoot}>
                  <Text style={s.caDate}>{latestCA.date}</Text>
                  <View style={s.readMore}>
                    <Text style={s.readMoreTxt}>{t('readMore')}</Text>
                    <Ionicons name="arrow-forward" size={12} color={theme.colors.brand} />
                  </View>
                </View>
              </View>
            </Pressable>
          </>
        )}

        {/* 5. Continue Learning */}
        {continueCourse && continueCourse.progress > 0 && (
          <Pressable
            testID="continue-learning-card"
            style={[s.heroCard, { marginTop: 20 }]}
            onPress={() => router.push(`/course/${continueCourse.id}`)}
          >
            <Image source={{ uri: continueCourse.thumbnail }} style={s.heroImage} contentFit="cover" />
            <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(11,77,184,0.85)']} style={s.heroScrim} />
            <View style={s.heroContent}>
              <View style={s.heroBadge}><Text style={s.heroBadgeText}>{t('continueLearning')}</Text></View>
              <Text style={s.heroTitle} numberOfLines={2}>{continueCourse.title}</Text>
              <Text style={s.heroInstructor}>{continueCourse.instructor} • {continueCourse.duration_hours}h</Text>
              <View style={s.progressBar}>
                <View style={[s.progressFill, { width: `${Math.round(continueCourse.progress * 100)}%` }]} />
              </View>
              <View style={s.heroBottomRow}>
                <Text style={s.progressText}>{Math.round(continueCourse.progress * 100)}% {t('complete')}</Text>
                <View style={s.playBtn}>
                  <Ionicons name="play" size={16} color={theme.colors.brand} />
                  <Text style={s.playText}>{t('resume')}</Text>
                </View>
              </View>
            </View>
          </Pressable>
        )}

        {/* 6. Featured Courses */}
        {courses.length > 0 && (
          <>
            <SectionRow title={t('featuredCourses')} onViewAll={() => router.push('/(tabs)/courses')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hScroll}>
              {courses.slice(0, 6).map((c: any) => (
                <Pressable key={c.id} testID={`course-${c.id}`} style={s.courseCard} onPress={() => router.push(`/course/${c.id}`)}>
                  <Image source={{ uri: c.thumbnail }} style={s.courseThumb} contentFit="cover" />
                  <View style={{ padding: 10 }}>
                    <Text style={s.courseTitle} numberOfLines={2}>{c.title}</Text>
                    <View style={s.rowMini}>
                      <Ionicons name="star" size={12} color={theme.colors.gold} />
                      <Text style={s.miniTxt}>{c.rating}</Text>
                      <Text style={s.dotSep}>•</Text>
                      <Text style={s.miniTxt}>{c.duration_hours}h</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        {/* 7. Live Classes */}
        {live.length > 0 && (
          <>
            <SectionRow title={t('liveClasses')} onViewAll={() => router.push('/(tabs)/courses')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hScroll}>
              {live.map((l: any) => (
                <Pressable key={l.id} testID={`live-${l.id}`} style={s.liveCard} onPress={() => router.push(`/live/${l.id}`)}>
                  <Image source={{ uri: l.thumbnail }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={StyleSheet.absoluteFillObject} />
                  {l.status === 'live' && (
                    <View style={s.liveBadge}><View style={s.liveDot} /><Text style={s.liveBadgeText}>LIVE</Text></View>
                  )}
                  <View style={{ position: 'absolute', bottom: 10, left: 12, right: 12 }}>
                    <Text style={s.liveTitle} numberOfLines={2}>{l.title}</Text>
                    <Text style={s.liveMeta}>{l.instructor} • {l.time}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        {/* 8. Mock Tests */}
        {mocks.length > 0 && (
          <>
            <SectionRow title={t('mockTests')} onViewAll={() => router.push('/(tabs)/tests')} />
            <View style={{ paddingHorizontal: 16, gap: 10 }}>
              {mocks.slice(0, 3).map((m: any) => (
                <Pressable key={m.id} testID={`mock-${m.id}`} style={s.mockCard} onPress={() => router.push('/(tabs)/tests')}>
                  <View style={s.mockIcon}><Ionicons name="document-text" size={22} color={theme.colors.brand} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.mockTitle} numberOfLines={2}>{m.title}</Text>
                    <Text style={s.mockMeta}>{m.questions} Qs • {m.duration} min • {m.difficulty}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.mutedLight} />
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* 9. Daily Challenge */}
        {challenges.length > 0 && (
          <>
            <SectionTitle title={t('dailyChallenge')} />
            <View style={s.dcGrid}>
              {challenges.map((c: any) => (
                <Pressable
                  key={c.id}
                  testID={`dc-${c.id}`}
                  style={[s.dcCard, c.attempted && s.dcCardDone]}
                  onPress={() => {
                    if (c.attempted) return;
                    router.push({ pathname: '/daily-challenge/[subject]', params: { subject: c.id } });
                  }}
                >
                  <View style={[s.dcIconWrap, { backgroundColor: c.attempted ? theme.colors.success : theme.colors.brandTertiary }]}>
                    <Ionicons name={c.icon as any} size={22} color={c.attempted ? '#FFF' : theme.colors.brand} />
                  </View>
                  <Text style={s.dcName} numberOfLines={1}>{c.name}</Text>
                  <View style={s.dcMetaRow}>
                    <Text style={s.dcMeta}>{c.questions_count} Q</Text>
                    <Text style={s.dot}>•</Text>
                    <Text style={s.dcMeta}>{c.duration_min}m</Text>
                  </View>
                  <View style={[s.dcDiff, { backgroundColor: c.difficulty === 'Hard' ? '#FEE2E2' : c.difficulty === 'Medium' ? '#FEF3C7' : '#DCFCE7' }]}>
                    <Text style={[s.dcDiffTxt, { color: c.difficulty === 'Hard' ? theme.colors.error : c.difficulty === 'Medium' ? theme.colors.warning : theme.colors.success }]}>{c.difficulty}</Text>
                  </View>
                  <View style={[s.dcCta, c.attempted && { backgroundColor: theme.colors.success }]}>
                    {c.attempted ? (
                      <>
                        <Ionicons name="checkmark-circle" size={14} color="#FFF" />
                        <Text style={s.dcCtaTxt}>{c.attempt?.accuracy?.toFixed(0)}% • {t('attempted')}</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="play" size={12} color="#FFF" />
                        <Text style={s.dcCtaTxt}>{t('startQuiz')}</Text>
                      </>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* 10. Latest Job Alerts */}
        {jobs.length > 0 && (
          <>
            <SectionRow title={t('latestJobs')} onViewAll={() => router.push('/job-alerts')} />
            <View style={{ paddingHorizontal: 16, gap: 12 }}>
              {jobs.slice(0, 2).map((j: any) => (
                <Pressable key={j.id} testID={`job-${j.id}`} style={s.jobCard}>
                  <View style={s.jobLogo}>
                    <Text style={s.jobLogoTxt}>{j.org_logo}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.jobTitle} numberOfLines={2}>{j.title}</Text>
                    <Text style={s.jobOrg}>{j.organization}</Text>
                    <View style={s.jobMetaRow}>
                      <Ionicons name="time-outline" size={12} color={theme.colors.muted} />
                      <Text style={s.jobMeta}>{t('lastDate')}: <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>{j.last_date}</Text></Text>
                    </View>
                  </View>
                  <View style={s.applyBtn}>
                    <Text style={s.applyTxt}>{t('applyNow')}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Floating AI Tutor */}
      <Pressable testID="fab-ai-tutor" style={s.fabWrap} onPress={openAITutor}>
        <LinearGradient colors={[theme.colors.brand, theme.colors.brandDark]} style={s.fabInner}>
          <Ionicons name="sparkles" size={22} color="#FFF" />
          <Text style={s.fabLabel}>{t('aiTutor')}</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={s.sectionTitle}>{title}</Text>;
}
function SectionRow({ title, onViewAll }: { title: string; onViewAll?: () => void }) {
  const { t } = useI18n();
  return (
    <View style={s.sectionRowWrap}>
      <Text style={s.sectionTitleInline}>{title}</Text>
      {onViewAll && (
        <Pressable testID={`view-all-${title.replace(/\s+/g, '-').toLowerCase()}`} onPress={onViewAll}>
          <Text style={s.viewAll}>{t('viewAll')} →</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.sm, gap: 8 },
  greeting: { fontSize: 14, color: theme.colors.muted, fontWeight: '500' },
  welcome: { fontSize: 22, color: theme.colors.onSurface, fontWeight: '800', marginTop: 2 },
  streakChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.goldTint, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  coinsChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.goldTint, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  streakText: { fontSize: 12, fontWeight: '700', color: theme.colors.gold },
  // Banner
  banner: { height: 150, borderRadius: 22, overflow: 'hidden', marginRight: 0, ...(theme.shadow.card as object) },
  bannerContent: { flex: 1, padding: 20, justifyContent: 'flex-end' },
  bannerTitle: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  bannerSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 4 },
  bannerCta: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginTop: 10 },
  bannerCtaTxt: { color: theme.colors.brand, fontSize: 12, fontWeight: '800' },
  bannerDots: { flexDirection: 'row', gap: 4, justifyContent: 'center', marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.border },
  dotActive: { width: 18, backgroundColor: theme.colors.brand },
  // Sections
  sectionTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.onSurface, marginTop: 22, marginBottom: 12, marginHorizontal: theme.spacing.lg },
  sectionTitleInline: { fontSize: 18, fontWeight: '800', color: theme.colors.onSurface },
  sectionRowWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.lg, marginTop: 22, marginBottom: 12 },
  viewAll: { fontSize: 13, color: theme.colors.brand, fontWeight: '700' },
  hScroll: { paddingHorizontal: theme.spacing.lg, gap: 12 },
  // Quick access
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: theme.spacing.md },
  quickTile: { width: '25%', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6 },
  quickIconWrap: { width: 52, height: 52, borderRadius: 16, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  quickLabel: { fontSize: 11, color: theme.colors.onSurfaceSecondary, fontWeight: '600', textAlign: 'center' },
  // Category card
  catCard: { flexDirection: 'row', gap: 12, alignItems: 'center', marginHorizontal: 16, padding: 14, borderRadius: 20, backgroundColor: theme.colors.brandTertiary, borderWidth: 1, borderColor: 'rgba(11,77,184,0.15)' },
  catIconWrap: { width: 52, height: 52, borderRadius: 16, backgroundColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 16, fontWeight: '800', color: theme.colors.brand },
  catExams: { fontSize: 12, color: theme.colors.onSurfaceSecondary, marginTop: 4, lineHeight: 17 },
  catChangeBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  catChangeTxt: { fontSize: 12, fontWeight: '800', color: theme.colors.brand },
  // Current affairs
  caCard: { marginHorizontal: 16, borderRadius: 20, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden', ...(theme.shadow.soft as object) },
  caImg: { width: '100%', height: 150 },
  caBody: { padding: 14 },
  caTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: theme.colors.brandTertiary, marginBottom: 6 },
  caTagTxt: { fontSize: 10, fontWeight: '800', color: theme.colors.brand, letterSpacing: 0.3 },
  caTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.onSurface, lineHeight: 21 },
  caSummary: { fontSize: 13, color: theme.colors.onSurfaceSecondary, marginTop: 6, lineHeight: 19 },
  caFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  caDate: { fontSize: 11, color: theme.colors.muted, fontWeight: '600' },
  readMore: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  readMoreTxt: { fontSize: 12, fontWeight: '800', color: theme.colors.brand },
  // Continue Learning hero
  heroCard: { marginHorizontal: 16, height: 200, borderRadius: 24, overflow: 'hidden', backgroundColor: theme.colors.brand, ...(theme.shadow.card as object) },
  heroImage: { ...StyleSheet.absoluteFillObject },
  heroScrim: { ...StyleSheet.absoluteFillObject },
  heroContent: { flex: 1, padding: 16, justifyContent: 'flex-end' },
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
  // Featured courses (horizontal)
  courseCard: { width: 200, borderRadius: 16, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, marginRight: 12, overflow: 'hidden', ...(theme.shadow.soft as object) },
  courseThumb: { width: '100%', height: 110 },
  courseTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.onSurface, lineHeight: 17 },
  rowMini: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  miniTxt: { fontSize: 11, color: theme.colors.onSurfaceSecondary, fontWeight: '600' },
  dotSep: { color: theme.colors.mutedLight },
  // Live
  liveCard: { width: 240, height: 140, borderRadius: 20, overflow: 'hidden', marginRight: 12, backgroundColor: '#000' },
  liveBadge: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.live, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  liveBadgeText: { fontSize: 9, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  liveTitle: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  liveMeta: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },
  // Mock tests
  mockCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: theme.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, ...(theme.shadow.soft as object) },
  mockIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  mockTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.onSurface },
  mockMeta: { fontSize: 11, color: theme.colors.muted, marginTop: 4 },
  // Daily Challenge
  dcGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16 },
  dcCard: { width: '47.5%', padding: 14, borderRadius: 20, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, ...(theme.shadow.soft as object) },
  dcCardDone: { backgroundColor: theme.colors.surfaceSecondary, opacity: 0.9 },
  dcIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dcName: { fontSize: 14, fontWeight: '800', color: theme.colors.onSurface, marginTop: 10 },
  dcMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  dcMeta: { fontSize: 11, color: theme.colors.muted, fontWeight: '600' },
  dot: { color: theme.colors.mutedLight },
  dcDiff: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 6 },
  dcDiffTxt: { fontSize: 10, fontWeight: '800' },
  dcCta: { flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.brand, paddingVertical: 8, borderRadius: 10, marginTop: 10 },
  dcCtaTxt: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  // Jobs
  jobCard: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, backgroundColor: theme.colors.surface, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, ...(theme.shadow.soft as object) },
  jobLogo: { width: 48, height: 48, borderRadius: 12, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  jobLogoTxt: { fontSize: 11, fontWeight: '800', color: theme.colors.brand },
  jobTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.onSurface },
  jobOrg: { fontSize: 11, color: theme.colors.muted, marginTop: 2 },
  jobMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  jobMeta: { fontSize: 11, color: theme.colors.muted },
  applyBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: theme.colors.brand },
  applyTxt: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  // FAB
  fabWrap: { position: 'absolute', right: 16, bottom: 96, borderRadius: 999, overflow: 'hidden', ...(theme.shadow.strong as object) },
  fabInner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12 },
  fabLabel: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});
