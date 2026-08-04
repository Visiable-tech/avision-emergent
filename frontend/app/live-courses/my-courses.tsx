import { useCallback, useState } from 'react';
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
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';

type Enrollment = {
  id: string;
  course_id: string;
  course_name: string;
  enrolled_at: string;
  expires_at: string;
  progress_pct: number;
  status: string;
  course: any;
};

export default function MyLiveCourses() {
  const router = useRouter();
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const r = await api.liveCourseMyEnrollments();
      setEnrollments(r.enrollments || []);
    } catch (e) {
      console.warn('enrollments', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={[theme.colors.brand, theme.colors.brandDark]} style={s.header}>
        <SafeAreaView edges={['top']}>
          <View style={s.headerRow}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={s.iconBtn} testID="my-back">
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>My Live Courses</Text>
              <Text style={s.sub}>
                {enrollments.length} {enrollments.length === 1 ? 'enrolled course' : 'enrolled courses'}
              </Text>
            </View>
            <Pressable style={s.browseBtn} onPress={() => router.push('/live-courses')} testID="my-browse">
              <Ionicons name="add" size={14} color="#FFF" />
              <Text style={s.browseTxt}>Browse</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {!user ? (
        <View style={s.empty}>
          <Ionicons name="lock-closed-outline" size={44} color={theme.colors.mutedLight} />
          <Text style={s.emptyTitle}>Login to view your courses</Text>
          <Pressable style={s.ctaBtn} onPress={() => router.push('/auth/login')}>
            <Text style={s.ctaBtnTxt}>Login</Text>
          </Pressable>
        </View>
      ) : loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.colors.brand} />
        </View>
      ) : enrollments.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="school-outline" size={44} color={theme.colors.mutedLight} />
          <Text style={s.emptyTitle}>No enrolled courses yet</Text>
          <Text style={s.emptySub}>Explore our catalog and enroll in a live batch to get started.</Text>
          <Pressable style={s.ctaBtn} onPress={() => router.push('/live-courses')}>
            <Ionicons name="rocket-outline" size={16} color="#FFF" />
            <Text style={s.ctaBtnTxt}>Explore Live Courses</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={theme.colors.brand}
            />
          }
        >
          {enrollments.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => router.push(`/live-courses/${e.course_id}`)}
              style={s.card}
              testID={`my-course-${e.course_id}`}
            >
              <View style={s.cardBanner}>
                <Image
                  source={{ uri: e.course?.banner_image }}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="cover"
                />
                <LinearGradient
                  colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.65)']}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={s.progOverlay}>
                  <Text style={s.progVal}>{Math.round(e.progress_pct || 0)}%</Text>
                  <Text style={s.progLbl}>Complete</Text>
                </View>
                <View style={s.enrolledPill}>
                  <Ionicons name="checkmark-circle" size={11} color="#FFF" />
                  <Text style={s.enrolledTxt}>ENROLLED</Text>
                </View>
                <View style={s.bannerTitleBox}>
                  <Text style={s.bannerTitle} numberOfLines={2}>{e.course_name}</Text>
                  <Text style={s.bannerExam} numberOfLines={1}>{e.course?.exam_name}</Text>
                </View>
              </View>
              <View style={s.cardBody}>
                <View style={s.progBar}>
                  <View style={[s.progFill, { width: `${Math.round(e.progress_pct || 0)}%` }]} />
                </View>
                <View style={s.metaRow}>
                  <View style={s.metaItem}>
                    <Ionicons name="calendar-outline" size={12} color={theme.colors.muted} />
                    <Text style={s.metaTxt}>Valid till {new Date(e.expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                  </View>
                  <View style={s.metaItem}>
                    <Ionicons name="time-outline" size={12} color={theme.colors.success} />
                    <Text style={[s.metaTxt, { color: theme.colors.success }]}>{e.status || 'active'}</Text>
                  </View>
                </View>
                <View style={s.actionsRow}>
                  <Pressable style={s.actionBtn} onPress={() => router.push(`/live-courses/${e.course_id}`)}>
                    <Ionicons name="play-circle" size={14} color={theme.colors.brand} />
                    <Text style={s.actionTxt}>View Course</Text>
                  </Pressable>
                  <Pressable style={[s.actionBtn, { backgroundColor: theme.colors.brand, flex: 0 }]}>
                    <Ionicons name="rocket-outline" size={14} color="#FFF" />
                    <Text style={[s.actionTxt, { color: '#FFF' }]}>Start Learning</Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          ))}
          <View style={s.tipCard}>
            <Ionicons name="information-circle" size={16} color={theme.colors.brand} />
            <Text style={s.tipTxt}>
              Phase 2 (coming soon): full learning dashboard, live classroom, WebSocket chat, and progress tracking.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surfaceSecondary },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 6, paddingBottom: 10 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  title: { color: '#FFF', fontSize: 19, fontWeight: '900' },
  sub: { color: 'rgba(255,255,255,0.8)', fontSize: 11.5, fontWeight: '600', marginTop: 2 },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  browseTxt: { color: '#FFF', fontSize: 11.5, fontWeight: '800' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.onSurface, marginTop: 12 },
  emptySub: { fontSize: 12.5, color: theme.colors.muted, textAlign: 'center', lineHeight: 18 },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.brand,
    marginTop: 12,
  },
  ctaBtnTxt: { color: '#FFF', fontWeight: '900', fontSize: 13 },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardBanner: { height: 140, backgroundColor: '#0B4DB8' },
  progOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  progVal: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  progLbl: { color: 'rgba(255,255,255,0.8)', fontSize: 9.5, fontWeight: '700' },
  enrolledPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.success,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  enrolledTxt: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  bannerTitleBox: { position: 'absolute', bottom: 12, left: 12, right: 12 },
  bannerTitle: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  bannerExam: { color: 'rgba(255,255,255,0.9)', fontSize: 11.5, fontWeight: '600', marginTop: 3 },

  cardBody: { padding: 14, gap: 10 },
  progBar: { height: 6, backgroundColor: theme.colors.surfaceSecondary, borderRadius: 3, overflow: 'hidden' },
  progFill: { height: '100%', backgroundColor: theme.colors.gold },
  metaRow: { flexDirection: 'row', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaTxt: { fontSize: 11, color: theme.colors.muted, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.brandTertiary,
  },
  actionTxt: { fontSize: 12, fontWeight: '900', color: theme.colors.brand },

  tipCard: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.brandTertiary,
    borderWidth: 1,
    borderColor: theme.colors.brand + '22',
    marginTop: 6,
  },
  tipTxt: { flex: 1, fontSize: 11.5, color: theme.colors.brand, fontWeight: '700', lineHeight: 16 },
});
