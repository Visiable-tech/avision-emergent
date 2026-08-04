import { useCallback, useMemo, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';

type CatChip = { id: string; name: string; icon: string; color: string; banner: string; banner_sub: string; count: number };

const SORTS = [
  { id: 'popularity', label: 'Popularity' },
  { id: 'rating', label: 'Rating' },
  { id: 'price_low', label: 'Price: Low → High' },
  { id: 'price_high', label: 'Price: High → Low' },
];

export default function VideoCoursesLanding() {
  const router = useRouter();
  const [categories, setCategories] = useState<CatChip[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>('banking');
  const [courses, setCourses] = useState<any[]>([]);
  const [continueLearning, setContinueLearning] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('popularity');
  const [showSort, setShowSort] = useState(false);

  const load = useCallback(async (cat = selectedCat) => {
    try {
      const [catRes, listRes, contRes] = await Promise.all([
        api.vcCategories(),
        api.vcList(cat, sort),
        api.vcContinue().catch(() => ({ enrollment: null })),
      ]);
      setCategories(catRes.categories || []);
      setCourses(listRes.courses || []);
      setContinueLearning(contRes.enrollment ? contRes : null);
    } catch (e) { console.warn('vc', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [selectedCat, sort]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) => c.name.toLowerCase().includes(q) || c.exam_name.toLowerCase().includes(q));
  }, [courses, query]);

  const activeCat = categories.find((c) => c.id === selectedCat);

  return (
    <View style={s.root}>
      <SafeAreaView edges={['top']} style={s.topSafe}>
        <View style={s.header}>
          <Text style={s.title}>Video Courses</Text>
          <Pressable style={s.bellBtn} hitSlop={10} testID="vc-notifications">
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
            testID="vc-search"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={16} color={theme.colors.mutedLight} />
            </Pressable>
          ) : null}
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }}
        >
          {categories.map((c) => {
            const active = selectedCat === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => { setSelectedCat(c.id); load(c.id); }}
                style={[s.catChip, active && { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand }]}
                testID={`vc-cat-${c.id}`}
              >
                <Ionicons name={c.icon as any} size={14} color={active ? '#FFF' : theme.colors.brand} />
                <Text style={[s.catTxt, active && { color: '#FFF' }]}>{c.name}</Text>
                {c.count > 0 ? (
                  <View style={[s.catCount, active && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                    <Text style={[s.catCountTxt, active && { color: '#FFF' }]}>{c.count}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.colors.brand} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.brand} />}
        >
          {/* Category banner */}
          {activeCat ? (
            <LinearGradient colors={[activeCat.color, activeCat.color + 'CC']} style={s.hero}>
              <View style={{ flex: 1 }}>
                <Text style={s.heroTitle}>{activeCat.banner}</Text>
                <Text style={s.heroSub}>{activeCat.banner_sub}</Text>
                <View style={s.heroCta}>
                  <Ionicons name="play-circle" size={14} color={activeCat.color} />
                  <Text style={[s.heroCtaTxt, { color: activeCat.color }]}>{activeCat.count} courses</Text>
                </View>
              </View>
              <View style={s.heroIcon}>
                <Ionicons name={activeCat.icon as any} size={44} color="rgba(255,255,255,0.7)" />
              </View>
            </LinearGradient>
          ) : null}

          {/* Continue Learning */}
          {continueLearning?.enrollment ? (
            <Pressable
              style={s.continueCard}
              onPress={() => router.push(`/video-courses/dashboard/${continueLearning.enrollment.course_id}`)}
              testID="vc-continue"
            >
              <Image source={{ uri: continueLearning.course?.banner_image }} style={s.continueThumb} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={s.continueLbl}>CONTINUE LEARNING</Text>
                <Text style={s.continueName} numberOfLines={1}>{continueLearning.course?.name}</Text>
                <View style={s.continueBar}>
                  <View style={[s.continueFill, { width: `${continueLearning.enrollment.progress_pct || 0}%` }]} />
                </View>
                <Text style={s.continueMeta}>{continueLearning.enrollment.progress_pct || 0}% complete</Text>
              </View>
              <Ionicons name="play-circle" size={30} color={theme.colors.brand} />
            </Pressable>
          ) : null}

          {/* Section header */}
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>
              Popular {activeCat?.name || ''} Courses
            </Text>
            <Pressable onPress={() => setShowSort((v) => !v)} style={s.sortBtn} testID="vc-sort">
              <Ionicons name="swap-vertical" size={13} color={theme.colors.brand} />
              <Text style={s.sortBtnTxt}>Sort</Text>
            </Pressable>
          </View>

          {showSort && (
            <View style={s.sortMenu}>
              {SORTS.map((so) => (
                <Pressable
                  key={so.id}
                  onPress={() => { setSort(so.id); setShowSort(false); load(); }}
                  style={[s.sortItem, sort === so.id && s.sortItemActive]}
                  testID={`vc-sort-${so.id}`}
                >
                  <Ionicons name={sort === so.id ? 'radio-button-on' : 'radio-button-off'} size={16} color={sort === so.id ? theme.colors.brand : theme.colors.muted} />
                  <Text style={[s.sortItemTxt, sort === so.id && { color: theme.colors.brand, fontWeight: '800' }]}>{so.label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Courses list */}
          <View style={{ paddingHorizontal: 16, gap: 14, marginTop: 10 }}>
            {filtered.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="videocam-outline" size={44} color={theme.colors.mutedLight} />
                <Text style={s.emptyTxt}>No courses found</Text>
              </View>
            ) : (
              filtered.map((c) => (
                <VideoCourseCard key={c.id} c={c} onPress={() => router.push(`/video-courses/${c.id}`)} />
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* FAB */}
      <Pressable style={s.fab} onPress={() => router.push('/video-courses/my')} testID="vc-my">
        <Ionicons name="library" size={16} color="#FFF" />
        <Text style={s.fabTxt}>My Courses</Text>
      </Pressable>
    </View>
  );
}

function VideoCourseCard({ c, onPress }: { c: any; onPress: () => void }) {
  return (
    <Pressable style={s.card} onPress={onPress} testID={`vc-card-${c.id}`}>
      <View style={s.cardBanner}>
        <Image source={{ uri: c.banner_image }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        <LinearGradient colors={['rgba(8,58,142,0.85)', 'rgba(11,77,184,0.85)']} style={StyleSheet.absoluteFillObject} />
        <View style={s.cardChips}>
          {c.discount_pct > 0 && (
            <View style={s.discChip}>
              <Text style={s.discTxt}>{c.discount_pct}% OFF</Text>
            </View>
          )}
          <View style={s.langChip}>
            <Ionicons name="language" size={9} color="#FFF" />
            <Text style={s.langTxt}>{c.language}</Text>
          </View>
        </View>
        <Text style={s.cardName} numberOfLines={2}>{c.name}</Text>
        <Text style={s.cardExam} numberOfLines={1}>{c.exam_name}</Text>
        {/* Faculty avatars overlap */}
        <View style={s.facRow}>
          {(c.faculty_images || []).slice(0, 3).map((url: string, i: number) => (
            <Image key={i} source={{ uri: url }} style={[s.facAv, { marginLeft: i === 0 ? 0 : -10 }]} contentFit="cover" />
          ))}
          {c.faculty_images?.length > 3 ? (
            <View style={[s.facAv, s.facAvMore, { marginLeft: -10 }]}>
              <Text style={s.facAvMoreTxt}>+{c.faculty_images.length - 3}</Text>
            </View>
          ) : null}
          <View style={s.ratingPill}>
            <Ionicons name="star" size={10} color="#FCD34D" />
            <Text style={s.ratingTxt}>{c.rating} • {c.students / 1000 >= 1 ? `${(c.students / 1000).toFixed(1)}k` : c.students}</Text>
          </View>
        </View>
      </View>
      <View style={s.cardBody}>
        <View style={s.statsRow}>
          <StatBadge icon="play-circle" val={`${c.video_count}+`} lbl="HD Videos" />
          <StatBadge icon="help-circle" val={`${(c.practice_qs_count / 1000).toFixed(0)}k+`} lbl="Practice" />
          <StatBadge icon="library" val={`${c.subject_count}`} lbl="Subjects" />
        </View>
        <View style={s.priceRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.priceStrike}>₹{c.price.toLocaleString('en-IN')}</Text>
            <View style={s.priceLine}>
              <Text style={s.priceMain}>₹{c.offer_price.toLocaleString('en-IN')}</Text>
              <Text style={s.validityTxt}>• {c.validity_months} months</Text>
            </View>
          </View>
          <View style={s.viewBtn}>
            <Text style={s.viewBtnTxt}>VIEW COURSE</Text>
            <Ionicons name="arrow-forward" size={13} color="#FFF" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function StatBadge({ icon, val, lbl }: { icon: any; val: string; lbl: string }) {
  return (
    <View style={s.statBadge}>
      <Ionicons name={icon} size={13} color={theme.colors.brand} />
      <View>
        <Text style={s.statVal}>{val}</Text>
        <Text style={s.statLbl}>{lbl}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surfaceSecondary },
  topSafe: { paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0, backgroundColor: theme.colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  title: { flex: 1, fontSize: 26, fontWeight: '900', color: theme.colors.onSurface, letterSpacing: -0.4 },
  bellBtn: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 10, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.error, borderWidth: 1.5, borderColor: theme.colors.surface },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 14, height: 44, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.onSurface },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  catTxt: { fontSize: 12, fontWeight: '800', color: theme.colors.brand },
  catCount: { backgroundColor: theme.colors.brandTertiary, minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  catCountTxt: { fontSize: 10, fontWeight: '900', color: theme.colors.brand },

  hero: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 14, padding: 16, borderRadius: 18, gap: 12 },
  heroTitle: { color: '#FFF', fontSize: 17, fontWeight: '900', letterSpacing: -0.2 },
  heroSub: { color: 'rgba(255,255,255,0.9)', fontSize: 11.5, fontWeight: '600', marginTop: 6, lineHeight: 16 },
  heroCta: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, marginTop: 10 },
  heroCtaTxt: { fontSize: 11, fontWeight: '900' },
  heroIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  continueCard: { marginHorizontal: 16, marginTop: 12, padding: 12, backgroundColor: theme.colors.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  continueThumb: { width: 54, height: 54, borderRadius: 10 },
  continueLbl: { fontSize: 9.5, fontWeight: '900', color: theme.colors.brand, letterSpacing: 1 },
  continueName: { fontSize: 13, fontWeight: '900', color: theme.colors.onSurface, marginTop: 2 },
  continueBar: { height: 5, backgroundColor: theme.colors.surfaceSecondary, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  continueFill: { height: '100%', backgroundColor: theme.colors.gold },
  continueMeta: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '700', marginTop: 4 },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 20, marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: theme.colors.onSurface },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: theme.colors.brandTertiary },
  sortBtnTxt: { fontSize: 12, fontWeight: '900', color: theme.colors.brand },
  sortMenu: { backgroundColor: theme.colors.surface, marginHorizontal: 16, marginTop: 6, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: theme.colors.border },
  sortItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  sortItemActive: { backgroundColor: theme.colors.brandTertiary },
  sortItemTxt: { fontSize: 13, fontWeight: '600', color: theme.colors.onSurface },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTxt: { fontSize: 13, color: theme.colors.muted, fontWeight: '700' },

  card: { backgroundColor: theme.colors.surface, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  cardBanner: { padding: 14, paddingTop: 14, minHeight: 160, justifyContent: 'flex-end' },
  cardChips: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', gap: 6 },
  discChip: { backgroundColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  discTxt: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  langChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  langTxt: { color: '#FFF', fontSize: 9.5, fontWeight: '800' },
  cardName: { color: '#FFF', fontSize: 17, fontWeight: '900', letterSpacing: -0.2 },
  cardExam: { color: 'rgba(255,255,255,0.9)', fontSize: 11.5, fontWeight: '600', marginTop: 3 },
  facRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  facAv: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
  facAvMore: { backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  facAvMoreTxt: { color: theme.colors.brand, fontSize: 9, fontWeight: '900' },
  ratingPill: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  ratingTxt: { color: '#FFF', fontSize: 10, fontWeight: '900' },

  cardBody: { padding: 14, gap: 12 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statBadge: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.brandTertiary, paddingHorizontal: 8, paddingVertical: 8, borderRadius: 10 },
  statVal: { fontSize: 12, fontWeight: '900', color: theme.colors.onSurface },
  statLbl: { fontSize: 9, color: theme.colors.muted, fontWeight: '700' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priceStrike: { fontSize: 11, color: theme.colors.muted, textDecorationLine: 'line-through', fontWeight: '700' },
  priceLine: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
  priceMain: { fontSize: 20, fontWeight: '900', color: theme.colors.brand, letterSpacing: -0.3 },
  validityTxt: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '700' },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.brand, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12 },
  viewBtnTxt: { color: '#FFF', fontSize: 11.5, fontWeight: '900' },

  fab: { position: 'absolute', right: 16, bottom: 84, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: theme.colors.brand, ...(Platform.OS === 'ios' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 } : { elevation: 6 }) },
  fabTxt: { color: '#FFF', fontSize: 12, fontWeight: '900' },
});
