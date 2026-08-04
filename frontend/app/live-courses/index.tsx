import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { useCategory } from '@/src/CategoryContext';

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

type ExamChip = { id: string; name: string; category_id?: string; count: number };

const SORTS: { id: string; label: string }[] = [
  { id: 'popular', label: 'Popular' },
  { id: 'price_low', label: 'Price: Low → High' },
  { id: 'price_high', label: 'Price: High → Low' },
  { id: 'start_date', label: 'Starting Soon' },
];

export default function LiveCoursesCatalog() {
  const router = useRouter();
  const { categoryId } = useCategory();

  const [courses, setCourses] = useState<CourseCard[]>([]);
  const [exams, setExams] = useState<ExamChip[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('popular');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSort, setShowSort] = useState(false);

  const loadFilters = useCallback(async () => {
    try {
      const f = await api.liveCourseFilters();
      setExams(f.exams || []);
      setLanguages(f.languages || []);
    } catch (e) {
      console.warn('filters', e);
    }
  }, []);

  const loadCourses = useCallback(async () => {
    try {
      const opts: any = { sort: sortBy };
      if (categoryId) opts.category = categoryId;
      if (selectedExam) opts.exam = selectedExam;
      if (selectedLang) opts.language = selectedLang;
      const r = await api.liveCourses(opts);
      setCourses(r.courses || []);
    } catch (e) {
      console.warn('live-courses', e);
    }
  }, [categoryId, selectedExam, selectedLang, sortBy]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadFilters(), loadCourses()]);
      setLoading(false);
    })();
  }, [loadFilters, loadCourses]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadFilters(), loadCourses()]);
    setRefreshing(false);
  }, [loadFilters, loadCourses]);

  const filteredExams = useMemo(() => {
    if (!categoryId) return exams;
    return exams.filter((e) => !e.category_id || e.category_id === categoryId);
  }, [exams, categoryId]);

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header */}
      <LinearGradient colors={[theme.colors.brand, theme.colors.brandDark]} style={s.header}>
        <SafeAreaView edges={['top']}>
          <View style={s.headerRow}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={s.iconBtn} testID="lc-back">
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>Live Courses</Text>
              <Text style={s.headerSub}>{`Learn from India's top faculty • Live + Recordings`}</Text>
            </View>
            <Pressable
              onPress={() => router.push('/live-courses/my-courses')}
              style={s.myBtn}
              testID="lc-my-courses"
            >
              <Ionicons name="bookmark" size={14} color="#FFF" />
              <Text style={s.myBtnTxt}>My Courses</Text>
            </Pressable>
          </View>

          {/* Filters row */}
          <View style={s.filterRow}>
            <Pressable
              style={[s.filterChip, !selectedExam && s.filterChipActive]}
              onPress={() => setSelectedExam(null)}
              testID="lc-exam-all"
            >
              <Text style={[s.filterChipTxt, !selectedExam && s.filterChipTxtActive]}>All Exams</Text>
            </Pressable>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingRight: 16 }}
              style={{ flex: 1 }}
            >
              {filteredExams.map((e) => (
                <Pressable
                  key={e.id}
                  style={[s.filterChip, selectedExam === e.id && s.filterChipActive]}
                  onPress={() => setSelectedExam(selectedExam === e.id ? null : e.id)}
                  testID={`lc-exam-${e.id}`}
                >
                  <Text style={[s.filterChipTxt, selectedExam === e.id && s.filterChipTxtActive]}>
                    {e.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Sub-toolbar */}
      <View style={s.subBar}>
        <Text style={s.resultTxt}>
          <Text style={s.resultCount}>{courses.length}</Text> {courses.length === 1 ? 'course' : 'courses'}
        </Text>
        <View style={{ flex: 1 }} />
        {languages.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {languages.map((lg) => (
              <Pressable
                key={lg}
                onPress={() => setSelectedLang(selectedLang === lg ? null : lg)}
                style={[s.langChip, selectedLang === lg && s.langChipActive]}
                testID={`lc-lang-${lg}`}
              >
                <Text style={[s.langChipTxt, selectedLang === lg && { color: '#FFF' }]}>{lg}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
        <Pressable onPress={() => setShowSort((v) => !v)} style={s.sortBtn} testID="lc-sort">
          <Ionicons name="swap-vertical" size={14} color={theme.colors.brand} />
          <Text style={s.sortBtnTxt} numberOfLines={1}>
            {SORTS.find((x) => x.id === sortBy)?.label}
          </Text>
        </Pressable>
      </View>

      {showSort && (
        <View style={s.sortMenu}>
          {SORTS.map((so) => (
            <Pressable
              key={so.id}
              onPress={() => {
                setSortBy(so.id);
                setShowSort(false);
              }}
              style={[s.sortItem, sortBy === so.id && s.sortItemActive]}
              testID={`lc-sort-${so.id}`}
            >
              <Ionicons
                name={sortBy === so.id ? 'radio-button-on' : 'radio-button-off'}
                size={16}
                color={sortBy === so.id ? theme.colors.brand : theme.colors.muted}
              />
              <Text style={[s.sortItemTxt, sortBy === so.id && { color: theme.colors.brand, fontWeight: '800' }]}>
                {so.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator color={theme.colors.brand} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 14 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.brand} />
          }
          showsVerticalScrollIndicator={false}
        >
          {courses.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="school-outline" size={44} color={theme.colors.mutedLight} />
              <Text style={s.emptyTitle}>No courses found</Text>
              <Text style={s.emptySub}>Try clearing filters or a different exam.</Text>
              <Pressable
                onPress={() => {
                  setSelectedExam(null);
                  setSelectedLang(null);
                }}
                style={s.clearBtn}
              >
                <Text style={s.clearBtnTxt}>Clear Filters</Text>
              </Pressable>
            </View>
          ) : (
            courses.map((c) => <CourseCardView key={c.id} c={c} onPress={() => router.push(`/live-courses/${c.id}`)} />)
          )}
        </ScrollView>
      )}
    </View>
  );
}

function CourseCardView({ c, onPress }: { c: CourseCard; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={s.card} testID={`lc-card-${c.id}`}>
      {/* Banner */}
      <View style={s.banner}>
        <Image source={{ uri: c.banner_image }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        <LinearGradient
          colors={[c.gradient?.[0] || theme.colors.brand, c.gradient?.[1] || theme.colors.brandDark]}
          style={[StyleSheet.absoluteFillObject, { opacity: 0.85 }]}
        />
        <View style={s.bannerBody}>
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
          <Text style={s.courseName} numberOfLines={2}>
            {c.name}
          </Text>
          <Text style={s.examName} numberOfLines={1}>
            {c.exam_name}
          </Text>
        </View>
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

        {/* Price + CTA */}
        <View style={s.priceRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.priceStrike}>₹{c.price.toLocaleString('en-IN')}</Text>
            <View style={s.priceLine}>
              <Text style={s.priceMain}>₹{c.offer_price.toLocaleString('en-IN')}</Text>
              {c.is_limited_offer && c.offer_valid_till ? (
                <Text style={s.offerTxt} numberOfLines={1}>
                  • {c.offer_valid_till}
                </Text>
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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surfaceSecondary },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 6, paddingBottom: 12 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11.5, fontWeight: '600', marginTop: 2 },
  myBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  myBtnTxt: { color: '#FFF', fontSize: 11.5, fontWeight: '800' },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  filterChipActive: { backgroundColor: '#FFF', borderColor: '#FFF' },
  filterChipTxt: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  filterChipTxtActive: { color: theme.colors.brand },
  subBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  resultTxt: { fontSize: 12, color: theme.colors.muted, fontWeight: '700' },
  resultCount: { color: theme.colors.brand, fontWeight: '900' },
  langChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  langChipActive: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
  langChipTxt: { fontSize: 11, fontWeight: '700', color: theme.colors.onSurfaceSecondary },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: theme.colors.brandTertiary,
    maxWidth: 160,
  },
  sortBtnTxt: { fontSize: 11.5, fontWeight: '800', color: theme.colors.brand },
  sortMenu: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginTop: 6,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...(theme.shadow.soft as object),
  },
  sortItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  sortItemActive: { backgroundColor: theme.colors.brandTertiary },
  sortItemTxt: { fontSize: 13, fontWeight: '600', color: theme.colors.onSurface },
  empty: { alignItems: 'center', paddingTop: 60, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.onSurface, marginTop: 8 },
  emptySub: { fontSize: 12, color: theme.colors.muted },
  clearBtn: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.brand,
  },
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
  banner: { height: 140, backgroundColor: '#0B4DB8', overflow: 'hidden' },
  bannerBody: { flex: 1, padding: 14, justifyContent: 'flex-end' },
  chipRow: { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pulse: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFF' },
  liveTxt: { color: '#FFF', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.6 },
  discChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  discTxt: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  batchLabelChip: { backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  batchLabelTxt: { color: '#FCD34D', fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  courseName: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: -0.2, marginTop: 10 },
  examName: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600', marginTop: 3 },
  // Body
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.brand,
  },
  viewBtnTxt: { color: '#FFF', fontWeight: '900', fontSize: 12 },
});
