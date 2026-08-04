import { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Platform,
  StatusBar as RNStatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { useCategory } from '@/src/CategoryContext';

const { width: SCREEN_W } = Dimensions.get('window');
const BANNER_PAD_X = 16;
const BANNER_W = SCREEN_W - BANNER_PAD_X * 2;

type CourseCard = {
  id: string;
  name: string;
  exam_name: string;
  exam_id: string;
  category_id?: string;
  language: string;
  batch_label?: string;
  duration: string;
  sessions_count: number;
  mock_tests_count: number;
  banner_image: string;
  gradient: [string, string];
  accent: string;
  price: number;
  offer_price: number;
  discount_pct: number;
  is_limited_offer: boolean;
  offer_valid_till?: string;
  start_date_short: string;
  start_date: string;
  eligibility?: string;
  faculty_names: string[];
};

/**
 * Category tiles shown in the "Target Exam Categories" row.
 * IDs here must match the seed `category_id` values on the backend
 * (`banking`, `ssc`, `railway`, `state-exams`, `teaching`, `upsc`, …).
 */
const CATEGORY_TILES = [
  { id: 'banking', name: 'Banking', icon: 'business', lib: 'ion' as const },
  { id: 'ssc', name: 'SSC', icon: 'school-outline', lib: 'ion' as const },
  { id: 'railway', name: 'Railway', icon: 'train', lib: 'mci' as const },
  { id: 'state-exams', name: 'State Exams', icon: 'map-outline', lib: 'ion' as const },
  { id: 'upsc', name: 'UPSC', icon: 'book-outline', lib: 'ion' as const },
  { id: 'teaching', name: 'Teaching', icon: 'pencil-outline', lib: 'ion' as const },
] as const;

const PROMO_BANNERS = [
  {
    id: 'b1',
    label: 'Course Highlights',
    title: 'Dynamic Course &\nCourse Highlights',
    cta: 'Learn More',
    tag: 'By Success Compass',
    gradient: ['#0B4DB8', '#1D4ED8'],
    image: 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=800&q=80',
  },
  {
    id: 'b2',
    label: 'Live Batches 2026',
    title: 'IBPS PO Prime\nStarts Jul 20',
    cta: 'Enroll Now',
    tag: 'Bilingual • Hi + En',
    gradient: ['#7C3AED', '#5B21B6'],
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80',
  },
  {
    id: 'b3',
    label: 'Limited Offer',
    title: 'SBI PO Booster\n50% OFF Today',
    cta: 'Grab Offer',
    tag: 'Ends this Sunday',
    gradient: ['#059669', '#064E3B'],
    image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&q=80',
  },
  {
    id: 'b4',
    label: 'Free Demo',
    title: 'Attend a Free\nDemo Class',
    cta: 'Watch Now',
    tag: 'Top Faculty',
    gradient: ['#DB2777', '#831843'],
    image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80',
  },
] as const;

export default function LiveCoursesCatalog() {
  const router = useRouter();
  const { categoryId } = useCategory();

  const [courses, setCourses] = useState<CourseCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [bannerIdx, setBannerIdx] = useState(0);

  const bannerRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    try {
      const opts: any = {};
      if (selectedCategory) opts.category = selectedCategory;
      else if (categoryId) opts.category = categoryId;
      const r = await api.liveCourses(opts);
      setCourses(r.courses || []);
    } catch (e) {
      console.warn('live-courses', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryId, selectedCategory]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const filteredCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.exam_name.toLowerCase().includes(q) ||
        (c.faculty_names || []).some((n) => n.toLowerCase().includes(q)),
    );
  }, [courses, query]);

  const onBannerScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / (BANNER_W + 12));
    if (idx !== bannerIdx) setBannerIdx(idx);
  };

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={s.topSafe}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Live Courses</Text>
          <Pressable style={s.bellBtn} onPress={() => {}} hitSlop={10} testID="lc-notifications">
            <Ionicons name="notifications-outline" size={22} color={theme.colors.onSurface} />
            <View style={s.bellDot} />
          </Pressable>
        </View>

        {/* Search bar */}
        <View style={s.searchWrap}>
          <Ionicons name="search" size={18} color={theme.colors.muted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search course, exam, category"
            placeholderTextColor={theme.colors.muted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            testID="lc-search"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={16} color={theme.colors.mutedLight} />
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={theme.colors.brand}
          />
        }
      >
        {/* Banner carousel */}
        <View style={{ paddingTop: 12 }}>
          <ScrollView
            ref={bannerRef}
            horizontal
            pagingEnabled={false}
            showsHorizontalScrollIndicator={false}
            snapToInterval={BANNER_W + 12}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: BANNER_PAD_X, gap: 12 }}
            onScroll={onBannerScroll}
            scrollEventThrottle={16}
          >
            {PROMO_BANNERS.map((b) => (
              <PromoBanner
                key={b.id}
                banner={b}
                onPress={() => {
                  if (b.id === 'b2') router.push('/live-courses/lc-banking-po-2026');
                  else if (b.id === 'b3') router.push('/live-courses/lc-sbi-po-2026');
                  else if (b.id === 'b4') router.push('/live-courses');
                }}
              />
            ))}
          </ScrollView>
          {/* Dots */}
          <View style={s.dots}>
            {PROMO_BANNERS.map((_, i) => (
              <View key={i} style={[s.dot, i === bannerIdx && s.dotActive]} />
            ))}
          </View>
        </View>

        {/* Target Exam Categories */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Target Exam Categories</Text>
          <Pressable onPress={() => setSelectedCategory(null)} hitSlop={10} testID="lc-cat-seeall">
            <Text style={s.seeAll}>See All</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
        >
          {CATEGORY_TILES.map((c) => {
            const active = selectedCategory === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => setSelectedCategory(active ? null : c.id)}
                style={[s.catTile, active && s.catTileActive]}
                testID={`lc-cat-${c.id}`}
              >
                <View style={[s.catIconBox, active && { backgroundColor: '#FFF' }]}>
                  {c.lib === 'mci' ? (
                    <MaterialCommunityIcons name={c.icon as any} size={22} color={active ? theme.colors.brand : theme.colors.brand} />
                  ) : (
                    <Ionicons name={c.icon as any} size={22} color={active ? theme.colors.brand : theme.colors.brand} />
                  )}
                </View>
                <Text style={[s.catLbl, active && { color: '#FFF' }]}>{c.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Courses */}
        <View style={{ marginTop: 18, paddingHorizontal: 16, gap: 14 }}>
          {loading ? (
            <View style={{ alignItems: 'center', paddingTop: 30 }}>
              <ActivityIndicator color={theme.colors.brand} />
            </View>
          ) : filteredCourses.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="school-outline" size={44} color={theme.colors.mutedLight} />
              <Text style={s.emptyTitle}>No courses found</Text>
              <Text style={s.emptySub}>Try a different search term or category.</Text>
              <Pressable
                style={s.clearBtn}
                onPress={() => { setQuery(''); setSelectedCategory(null); }}
              >
                <Text style={s.clearBtnTxt}>Reset filters</Text>
              </Pressable>
            </View>
          ) : (
            filteredCourses.map((c) => (
              <CourseCardView key={c.id} c={c} onPress={() => router.push(`/live-courses/${c.id}`)} />
            ))
          )}
        </View>
      </ScrollView>

      {/* Floating My Courses shortcut */}
      <Pressable
        style={s.fab}
        onPress={() => router.push('/live-courses/my-courses')}
        testID="lc-my-courses"
      >
        <Ionicons name="bookmark" size={16} color="#FFF" />
        <Text style={s.fabTxt}>My Courses</Text>
      </Pressable>
    </View>
  );
}

/* ------------------------- Sub-components ------------------------- */

function PromoBanner({ banner, onPress }: { banner: (typeof PROMO_BANNERS)[number]; onPress: () => void }) {
  return (
    <Pressable style={[s.banner, { width: BANNER_W }]} onPress={onPress} testID={`lc-banner-${banner.id}`}>
      <LinearGradient colors={banner.gradient as any} style={StyleSheet.absoluteFillObject} />
      <View style={s.bannerRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.bannerLbl}>{banner.label}</Text>
          <Text style={s.bannerTitle}>{banner.title}</Text>
          <View style={s.bannerCta}>
            <Text style={s.bannerCtaTxt}>{banner.cta}</Text>
          </View>
        </View>
        <View style={s.bannerRight}>
          <Image source={{ uri: banner.image }} style={s.bannerImg} contentFit="cover" />
          <View style={s.bannerTag}>
            <Text style={s.bannerTagTxt}>{banner.tag}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function CourseCardView({ c, onPress }: { c: CourseCard; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={s.card} testID={`lc-card-${c.id}`}>
      {/* Banner */}
      <View style={s.cardBanner}>
        <Image source={{ uri: c.banner_image }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        <LinearGradient
          colors={[c.gradient?.[0] || theme.colors.brand, c.gradient?.[1] || theme.colors.brandDark]}
          style={[StyleSheet.absoluteFillObject, { opacity: 0.9 }]}
        />
        <View style={s.chipRow}>
          <View style={s.liveBadge}>
            <View style={s.pulse} />
            <Text style={s.liveTxt}>LIVE</Text>
          </View>
          {c.discount_pct > 0 && (
            <View style={[s.discChip, { backgroundColor: c.accent || '#F59E0B' }]}>
              <Text style={s.discTxt}>{c.discount_pct}% OFF</Text>
            </View>
          )}
          {c.batch_label ? (
            <View style={s.batchLabelChip}>
              <Text style={s.batchLabelTxt}>{c.batch_label}</Text>
            </View>
          ) : null}
        </View>
        <Text style={s.courseName} numberOfLines={2}>{c.name}</Text>
        <Text style={s.examName} numberOfLines={1}>{c.exam_name}</Text>
      </View>

      {/* Body */}
      <View style={s.body}>
        <View style={s.statsRow}>
          <StatChip icon="videocam-outline" val={`${c.sessions_count}+`} lbl="Live" />
          <StatChip icon="document-text-outline" val={`${c.mock_tests_count}+`} lbl="Mocks" />
          <StatChip icon="calendar-outline" val={c.duration} lbl="Duration" />
        </View>

        {c.faculty_names?.length ? (
          <View style={s.facRow}>
            <Ionicons name="school" size={12} color={theme.colors.muted} />
            <Text style={s.facTxt} numberOfLines={1}>
              By {c.faculty_names.slice(0, 2).join(', ')}
              {c.faculty_names.length > 2 ? ` +${c.faculty_names.length - 2}` : ''}
            </Text>
          </View>
        ) : null}

        <View style={s.metaRow}>
          <View style={s.metaPill}>
            <Ionicons name="language" size={11} color={theme.colors.brand} />
            <Text style={s.metaPillTxt}>{c.language}</Text>
          </View>
          <View style={s.metaPill}>
            <Ionicons name="flash" size={11} color={theme.colors.warning} />
            <Text style={s.metaPillTxt}>Starts {c.start_date_short}</Text>
          </View>
        </View>

        <View style={s.priceRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.priceStrike}>₹{c.price.toLocaleString('en-IN')}</Text>
            <View style={s.priceLine}>
              <Text style={s.priceMain}>₹{c.offer_price.toLocaleString('en-IN')}</Text>
              {c.is_limited_offer && c.offer_valid_till ? (
                <Text style={s.offerTxt} numberOfLines={1}>• {c.offer_valid_till}</Text>
              ) : null}
            </View>
          </View>
          <View style={s.viewBtn}>
            <Text style={s.viewBtnTxt}>View</Text>
            <Ionicons name="arrow-forward" size={14} color="#FFF" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function StatChip({ icon, val, lbl }: { icon: any; val: string; lbl: string }) {
  return (
    <View style={s.statChip}>
      <Ionicons name={icon} size={12} color={theme.colors.brand} />
      <View>
        <Text style={s.statVal}>{val}</Text>
        <Text style={s.statLbl}>{lbl}</Text>
      </View>
    </View>
  );
}

/* -------------------------- Styles ---------------------------- */

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surface },
  topSafe: {
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  headerTitle: { flex: 1, fontSize: 26, fontWeight: '900', color: theme.colors.onSurface, letterSpacing: -0.4 },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.error,
    borderWidth: 1.5,
    borderColor: theme.colors.surface,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.onSurface, paddingVertical: 0 },

  // Banner
  banner: { height: 130, borderRadius: 18, overflow: 'hidden', padding: 16 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  bannerLbl: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700' },
  bannerTitle: { color: '#FFF', fontSize: 17, fontWeight: '900', marginTop: 6, lineHeight: 22, letterSpacing: -0.3 },
  bannerCta: {
    alignSelf: 'flex-start',
    backgroundColor: '#FCD34D',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    marginTop: 10,
  },
  bannerCtaTxt: { color: '#083A8E', fontSize: 12, fontWeight: '900' },
  bannerRight: { alignItems: 'center', width: 100 },
  bannerImg: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)' },
  bannerTag: {
    marginTop: -12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 }
      : { elevation: 3 }),
  },
  bannerTagTxt: { color: theme.colors.onSurface, fontSize: 9.5, fontWeight: '900' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.mutedLight },
  dotActive: { width: 18, backgroundColor: theme.colors.brand },

  // Section
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 22, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.onSurface, letterSpacing: -0.3 },
  seeAll: { fontSize: 13, fontWeight: '800', color: theme.colors.brand },
  catTile: {
    width: 88,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    gap: 8,
  },
  catTileActive: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
  catIconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.brandTertiary },
  catLbl: { fontSize: 12, fontWeight: '800', color: theme.colors.onSurface },

  // Empty
  empty: { alignItems: 'center', paddingTop: 60, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.onSurface, marginTop: 8 },
  emptySub: { fontSize: 12, color: theme.colors.muted },
  clearBtn: { marginTop: 12, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: theme.colors.brand },
  clearBtnTxt: { color: '#FFF', fontWeight: '800', fontSize: 13 },

  // Card
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...(theme.shadow.soft as object),
  },
  cardBanner: { minHeight: 130, padding: 14, justifyContent: 'flex-end', backgroundColor: '#0B4DB8', overflow: 'hidden' },
  chipRow: { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pulse: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFF' },
  liveTxt: { color: '#FFF', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.6 },
  discChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  discTxt: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  batchLabelChip: { backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  batchLabelTxt: { color: '#FCD34D', fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  courseName: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: -0.2, marginTop: 10 },
  examName: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600', marginTop: 3 },
  body: { padding: 14, gap: 10 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.brandTertiary,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  statVal: { fontSize: 12.5, fontWeight: '900', color: theme.colors.onSurface },
  statLbl: { fontSize: 9.5, color: theme.colors.muted, fontWeight: '700', marginTop: 1 },
  facRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  facTxt: { fontSize: 12, color: theme.colors.onSurfaceSecondary, fontWeight: '700', flex: 1 },
  metaRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  metaPillTxt: { fontSize: 10.5, fontWeight: '700', color: theme.colors.onSurfaceSecondary },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  priceStrike: { fontSize: 11, color: theme.colors.muted, textDecorationLine: 'line-through', fontWeight: '700' },
  priceLine: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  priceMain: { fontSize: 20, fontWeight: '900', color: theme.colors.brand, letterSpacing: -0.3 },
  offerTxt: { fontSize: 10.5, fontWeight: '700', color: theme.colors.warning, maxWidth: 120 },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.brand,
  },
  viewBtnTxt: { color: '#FFF', fontWeight: '900', fontSize: 12 },

  // FAB
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.brand,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }
      : { elevation: 6 }),
  },
  fabTxt: { color: '#FFF', fontSize: 12, fontWeight: '900' },
});
