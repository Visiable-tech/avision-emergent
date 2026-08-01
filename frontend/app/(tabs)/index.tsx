import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Platform, Dimensions, FlatList, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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

// Quick access grid – pastel tiles, 4x2 (8 tiles)
const QUICK_ITEMS: {
  id: string; icon: any; iconSet?: 'ion' | 'mci'; label: string; tint: string; iconColor: string;
}[] = [
  { id: 'current-affairs', icon: 'newspaper',           iconSet: 'ion', label: 'Current Affairs', tint: '#DBEAFE', iconColor: '#2563EB' },
  { id: 'daily-quiz',      icon: 'brain',               iconSet: 'mci', label: 'Daily Quiz',      tint: '#FCE7F3', iconColor: '#DB2777' },
  { id: 'pyq',             icon: 'file-document-multiple', iconSet: 'mci', label: 'PYQ',           tint: '#CCFBF1', iconColor: '#0D9488' },
  { id: 'feed',            icon: 'text-box-multiple',   iconSet: 'mci', label: 'Feed',            tint: '#FAE8FF', iconColor: '#A855F7' },
  { id: 'magazine',        icon: 'book-open-page-variant', iconSet: 'mci', label: 'Magazine',     tint: '#FED7AA', iconColor: '#EA580C' },
  { id: 'booster',         icon: 'rocket-launch',       iconSet: 'mci', label: 'Booster',         tint: '#DBEAFE', iconColor: '#2563EB' },
  { id: 'ca-booklet',      icon: 'book-open-variant',   iconSet: 'mci', label: 'CA/GA Booklet',   tint: '#E0E7FF', iconColor: '#4F46E5' },
  { id: 'planner',         icon: 'star-four-points',    iconSet: 'mci', label: 'AI Planner',      tint: '#DCFCE7', iconColor: '#16A34A' },
];

export default function Home() {
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useAuth();
  const { categoryId } = useCategory();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 16);
  const TAB_BAR_HEIGHT = 60 + bottomInset;
  const [greeting, setGreeting] = useState<any>(null);
  const [banners, setBanners] = useState<any[]>([]);
  const [latestCA, setLatestCA] = useState<any>(null);
  const [mocks, setMocks] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const bannerRef = useRef<FlatList<any>>(null);

  const load = useCallback(async () => {
    try {
      const [g, b, la, mt, dc, jb, rl] = await Promise.all([
        api.greeting(),
        api.banners(categoryId || undefined),
        api.currentAffairsLatest(categoryId || undefined).catch(() => null),
        api.mockTests(categoryId || undefined),
        api.dailyChallenges(categoryId || undefined, user?.user_id),
        api.jobAlerts(categoryId || undefined, 10),
        api.reels(categoryId || undefined, 10).catch(() => ({ reels: [] })),
      ]);
      setGreeting(g);
      setBanners(b.banners || []);
      setLatestCA(la);
      setMocks(mt.tests || []);
      setChallenges(dc.challenges || []);
      setJobs(jb.jobs || []);
      setReels(rl.reels || []);
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

  const handleQuickPress = (qid: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    switch (qid) {
      case 'current-affairs': router.push('/(tabs)/current-affairs'); break;
      case 'daily-quiz': router.push('/quiz'); break;
      case 'pyq': router.push('/(tabs)/tests'); break;
      case 'feed': router.push('/feed'); break;
      case 'ca-booklet': router.push('/(tabs)/current-affairs'); break;
      case 'planner': router.push('/planner'); break;
      case 'magazine':
      case 'booster':
        Alert.alert('Coming Soon', 'This section is being crafted for you. Stay tuned!');
        break;
      default: router.push('/(tabs)/profile');
    }
  };

  const greetingLabel = greeting?.greeting_key === 'morning' ? t('goodMorning')
    : greeting?.greeting_key === 'afternoon' ? t('goodAfternoon')
    : greeting?.greeting_key === 'evening' ? t('goodEvening') : t('goodMorning');

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
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + 40 }}
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
                  <LinearGradient colors={['rgba(11,77,184,0.35)', 'rgba(11,77,184,0.9)']} style={StyleSheet.absoluteFillObject} />
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

        {/* 2. Quick Access grid – pastel tiles */}
        <SectionTitle title={t('quickAccess')} />
        <View style={s.quickGrid}>
          {QUICK_ITEMS.map((q) => (
            <Pressable
              key={q.id}
              testID={`quick-${q.id}`}
              style={s.quickTile}
              onPress={() => handleQuickPress(q.id)}
            >
              <View style={[s.quickTileBox, { backgroundColor: q.tint }]}>
                {q.iconSet === 'mci' ? (
                  <MaterialCommunityIcons name={q.icon as any} size={36} color={q.iconColor} />
                ) : (
                  <Ionicons name={q.icon as any} size={34} color={q.iconColor} />
                )}
              </View>
              <Text style={s.quickLabel} numberOfLines={1}>{q.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* 3. Trending Tests (horizontal slider) */}
        {mocks.length > 0 && (
          <>
            <SectionRow title={t('trendingTests')} onViewAll={() => router.push('/(tabs)/tests')} />
            <FlatList
              data={mocks.slice(0, 8)}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(i: any) => i.id}
              contentContainerStyle={s.hScroll}
              renderItem={({ item, index }: any) => (
                <Pressable
                  key={item.id}
                  testID={`trending-${item.id}`}
                  style={s.trendCard}
                  onPress={() => router.push('/(tabs)/tests')}
                >
                  <LinearGradient
                    colors={index % 2 === 0 ? ['#0B4DB8', '#083A8E'] : ['#C68A2D', '#9C6D22']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View style={s.trendTopRow}>
                    <View style={s.trendTag}>
                      <Ionicons name="flame" size={11} color="#FFF" />
                      <Text style={s.trendTagTxt}>TRENDING</Text>
                    </View>
                    <View style={s.trendDiff}>
                      <Text style={s.trendDiffTxt}>{item.difficulty}</Text>
                    </View>
                  </View>
                  <Text style={s.trendTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={s.trendMetaRow}>
                    <View style={s.trendMetaChip}>
                      <Ionicons name="help-circle-outline" size={12} color="#FFF" />
                      <Text style={s.trendMetaTxt}>{item.questions} Qs</Text>
                    </View>
                    <View style={s.trendMetaChip}>
                      <Ionicons name="time-outline" size={12} color="#FFF" />
                      <Text style={s.trendMetaTxt}>{item.duration}m</Text>
                    </View>
                  </View>
                  <View style={s.trendCta}>
                    <Text style={s.trendCtaTxt}>Attempt Now</Text>
                    <Ionicons name="arrow-forward" size={14} color={theme.colors.brand} />
                  </View>
                </Pressable>
              )}
            />
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

        {/* 5. Daily Challenge horizontal slider */}
        {challenges.length > 0 && (
          <>
            <SectionRow title={t('dailyChallenge')} onViewAll={() => router.push('/(tabs)/tests')} />
            <FlatList
              data={challenges}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(c: any) => c.id}
              contentContainerStyle={s.hScroll}
              renderItem={({ item: c }: any) => (
                <Pressable
                  key={c.id}
                  testID={`dc-${c.id}`}
                  style={[s.dcCard, c.attempted && s.dcCardDone]}
                  onPress={() => {
                    if (c.attempted) return;
                    router.push({ pathname: '/daily-challenge/[subject]', params: { subject: c.id } });
                  }}
                >
                  <View style={[s.dcIconWrap, { backgroundColor: c.attempted ? theme.colors.success : `${c.color || theme.colors.brand}15` }]}>
                    <Ionicons name={c.icon as any} size={24} color={c.attempted ? '#FFF' : (c.color || theme.colors.brand)} />
                  </View>
                  <Text style={s.dcName} numberOfLines={1}>{c.name}</Text>
                  <View style={s.dcMetaRow}>
                    <Text style={s.dcMeta}>{c.questions_count} Q</Text>
                    <Text style={s.dotSep}>•</Text>
                    <Text style={s.dcMeta}>{c.duration_min}m</Text>
                    <Text style={s.dotSep}>•</Text>
                    <Text style={s.dcMeta}>{c.difficulty}</Text>
                  </View>
                  <View style={s.dcRewardRow}>
                    <Ionicons name="ellipse" size={11} color={theme.colors.gold} />
                    <Text style={s.dcReward}>+{c.reward_coins} coins</Text>
                  </View>
                  <View style={[s.dcCta, c.attempted && { backgroundColor: theme.colors.success }]}>
                    {c.attempted ? (
                      <>
                        <Ionicons name="checkmark-circle" size={13} color="#FFF" />
                        <Text style={s.dcCtaTxt}>{c.attempt?.accuracy?.toFixed(0)}% • Done</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="play" size={12} color="#FFF" />
                        <Text style={s.dcCtaTxt}>{t('startQuiz')}</Text>
                      </>
                    )}
                  </View>
                </Pressable>
              )}
            />
          </>
        )}

        {/* 6. Latest Job Alerts – redesigned */}
        {jobs.length > 0 && (
          <>
            <SectionRow title={t('latestJobs')} onViewAll={() => router.push('/job-alerts')} />
            <View style={{ paddingHorizontal: 16, gap: 12 }}>
              {jobs.slice(0, 4).map((j: any) => (
                <Pressable
                  key={j.id}
                  testID={`job-${j.id}`}
                  style={s.jobCard}
                  onPress={() => router.push(`/job-alert/${j.id}`)}
                >
                  <View style={s.jobHeaderRow}>
                    <View style={s.jobLogo}>
                      <Text style={s.jobLogoTxt}>{j.org_logo}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.jobTitle} numberOfLines={2}>{j.title}</Text>
                      <Text style={s.jobOrg}>{j.organization}</Text>
                    </View>
                    <View style={s.postsBadge}>
                      <Text style={s.postsBadgeTxt}>{j.posts_count || j.posts || 0}</Text>
                      <Text style={s.postsBadgeSub}>posts</Text>
                    </View>
                  </View>
                  <View style={s.jobDivider} />
                  <View style={s.jobBottom}>
                    <View style={s.jobMetaCol}>
                      <View style={s.jobMetaRow}>
                        <Ionicons name="calendar-outline" size={12} color={theme.colors.muted} />
                        <Text style={s.jobMeta}>{t('posted')}: <Text style={s.jobMetaStrong}>{j.publish_date}</Text></Text>
                      </View>
                      <View style={[s.jobMetaRow, { marginTop: 4 }]}>
                        <Ionicons name="alarm-outline" size={12} color={theme.colors.error} />
                        <Text style={s.jobMeta}>{t('lastDate')}: <Text style={[s.jobMetaStrong, { color: theme.colors.error }]}>{j.last_date}</Text></Text>
                      </View>
                    </View>
                    <View style={s.viewBtn}>
                      <Text style={s.viewBtnTxt}>{t('viewDetails')}</Text>
                      <Ionicons name="arrow-forward" size={13} color="#FFF" />
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* 7. Videos & Reels */}
        {reels.length > 0 && (
          <>
            <SectionRow title="Videos & Reels" onViewAll={() => router.push('/reels/r1')} />
            <FlatList
              data={reels}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(r: any) => r.id}
              contentContainerStyle={s.hScroll}
              renderItem={({ item: r }: any) => (
                <Pressable
                  testID={`reel-${r.id}`}
                  style={s.reelCard}
                  onPress={() => router.push(`/reels/${r.id}`)}
                >
                  <Image source={{ uri: r.thumbnail }} style={StyleSheet.absoluteFillObject} contentFit="cover" transition={200} />
                  <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.65)']} style={StyleSheet.absoluteFillObject} />
                  {/* Play chip */}
                  <View style={s.reelPlay}>
                    <Ionicons name="play" size={16} color="#0F172A" />
                  </View>
                  {/* Duration / Views badge */}
                  <View style={s.reelTop}>
                    <View style={s.reelViews}>
                      <Ionicons name="eye" size={11} color="#FFF" />
                      <Text style={s.reelViewsTxt}>{formatViews(r.views)}</Text>
                    </View>
                    <View style={s.reelDur}>
                      <Text style={s.reelDurTxt}>{Math.floor((r.duration_sec || 0) / 60)}:{String((r.duration_sec || 0) % 60).padStart(2, '0')}</Text>
                    </View>
                  </View>
                  {/* Brand watermark + title */}
                  <View style={s.reelBottom}>
                    <View style={s.reelBrand}>
                      <Ionicons name="videocam" size={10} color="#FFF" />
                      <Text style={s.reelBrandTxt} numberOfLines={1}>{r.brand}</Text>
                    </View>
                    <Text style={s.reelTitle} numberOfLines={2}>{r.title}</Text>
                  </View>
                </Pressable>
              )}
            />
          </>
        )}
      </ScrollView>

      {/* Floating AI Tutor */}
      <Pressable testID="fab-ai-tutor" style={[s.fabWrap, { bottom: TAB_BAR_HEIGHT + 12 }]} onPress={openAITutor}>
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

function formatViews(n: number): string {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
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
  banner: { height: 160, borderRadius: 22, overflow: 'hidden', marginRight: 0, ...(theme.shadow.card as object) },
  bannerContent: { flex: 1, padding: 20, justifyContent: 'flex-end' },
  bannerTitle: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  bannerSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 4 },
  bannerCta: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginTop: 12 },
  bannerCtaTxt: { color: theme.colors.brand, fontSize: 12, fontWeight: '800' },
  bannerDots: { flexDirection: 'row', gap: 4, justifyContent: 'center', marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.border },
  dotActive: { width: 18, backgroundColor: theme.colors.brand },
  dotSep: { color: theme.colors.mutedLight },
  // Sections
  sectionTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.onSurface, marginTop: 22, marginBottom: 12, marginHorizontal: theme.spacing.lg },
  sectionTitleInline: { fontSize: 18, fontWeight: '800', color: theme.colors.onSurface },
  sectionRowWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.lg, marginTop: 22, marginBottom: 12 },
  viewAll: { fontSize: 13, color: theme.colors.brand, fontWeight: '700' },
  hScroll: { paddingHorizontal: theme.spacing.lg, gap: 12 },
  // Quick access – pastel tiles
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: theme.spacing.md, rowGap: 4 },
  quickTile: { width: '25%', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6 },
  quickTileBox: {
    width: 68, height: 68, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#0B4DB8', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8 }
      : { elevation: 2 }),
  },
  quickLabel: { fontSize: 11.5, color: theme.colors.onSurface, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  // Trending tests
  trendCard: { width: 240, height: 190, borderRadius: 20, overflow: 'hidden', padding: 14, marginRight: 12, ...(theme.shadow.card as object) },
  trendTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trendTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  trendTagTxt: { color: '#FFF', fontSize: 9.5, fontWeight: '800', letterSpacing: 0.4 },
  trendDiff: { backgroundColor: 'rgba(0,0,0,0.18)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  trendDiffTxt: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  trendTitle: { color: '#FFF', fontSize: 15, fontWeight: '800', marginTop: 12, lineHeight: 20 },
  trendMetaRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  trendMetaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  trendMetaTxt: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  trendCta: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, marginTop: 'auto' },
  trendCtaTxt: { color: theme.colors.brand, fontSize: 12, fontWeight: '800' },
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
  // Daily Challenge (horizontal cards)
  dcCard: { width: 170, padding: 14, borderRadius: 20, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, ...(theme.shadow.soft as object) },
  dcCardDone: { backgroundColor: theme.colors.surfaceSecondary, opacity: 0.92 },
  dcIconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dcName: { fontSize: 14, fontWeight: '800', color: theme.colors.onSurface, marginTop: 10 },
  dcMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  dcMeta: { fontSize: 11, color: theme.colors.muted, fontWeight: '600' },
  dcRewardRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  dcReward: { fontSize: 11, color: theme.colors.gold, fontWeight: '800' },
  dcCta: { flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.brand, paddingVertical: 8, borderRadius: 10, marginTop: 10 },
  dcCtaTxt: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  // Jobs redesigned
  jobCard: { padding: 14, backgroundColor: theme.colors.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, ...(theme.shadow.soft as object) },
  jobHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  jobLogo: { width: 52, height: 52, borderRadius: 14, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  jobLogoTxt: { fontSize: 12, fontWeight: '900', color: theme.colors.brand },
  jobTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.onSurface, lineHeight: 20 },
  jobOrg: { fontSize: 12, color: theme.colors.muted, marginTop: 3, fontWeight: '600' },
  postsBadge: { alignItems: 'center', backgroundColor: theme.colors.goldTint, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  postsBadgeTxt: { fontSize: 15, fontWeight: '900', color: theme.colors.gold },
  postsBadgeSub: { fontSize: 9, fontWeight: '700', color: theme.colors.gold, letterSpacing: 0.3 },
  jobDivider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border, marginVertical: 12 },
  jobBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobMetaCol: { flex: 1 },
  jobMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  jobMeta: { fontSize: 12, color: theme.colors.muted },
  jobMetaStrong: { fontWeight: '800', color: theme.colors.onSurface },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.brand, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  viewBtnTxt: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  // Reels
  reelCard: {
    width: 150, height: 240, borderRadius: 22, overflow: 'hidden', marginRight: 12, backgroundColor: '#111',
    ...(theme.shadow.card as object),
  },
  reelPlay: {
    position: 'absolute', top: '50%', left: '50%', marginTop: -18, marginLeft: -18,
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  reelTop: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between' },
  reelViews: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999 },
  reelViewsTxt: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  reelDur: { backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  reelDurTxt: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  reelBottom: { position: 'absolute', bottom: 10, left: 10, right: 10 },
  reelBrand: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, marginBottom: 6 },
  reelBrandTxt: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  reelTitle: { color: '#FFF', fontSize: 12, fontWeight: '700', lineHeight: 16 },
  // FAB
  fabWrap: { position: 'absolute', right: 16, borderRadius: 999, overflow: 'hidden', ...(theme.shadow.strong as object) },
  fabInner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12 },
  fabLabel: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});
