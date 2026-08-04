import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function VideoCourseDashboard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openSubjectIdx, setOpenSubjectIdx] = useState<number | null>(0);
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [p, a] = await Promise.all([
        api.vcProgress(id),
        api.vcAnalytics(id).catch(() => null),
      ]);
      setData(p);
      setAnalytics(a);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleSubject = (idx: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenSubjectIdx(openSubjectIdx === idx ? null : idx);
  };
  const toggleChapter = (cid: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenChapters((p) => ({ ...p, [cid]: !p[cid] }));
  };

  const resume = data?.resume;
  const enrollment = data?.enrollment || {};
  const course = data?.course;
  const progressMap: Record<string, any> = data?.progress || {};
  const totals = analytics?.totals || {
    total_lectures: data?.total_lectures || 0,
    completed_lectures: data?.completed_lectures || 0,
    completion_pct: enrollment.progress_pct || 0,
    total_watch_hours: enrollment.watch_time_hours || 0,
    streak_days: 0,
  };

  const week = useMemo(() => analytics?.week || [], [analytics]);
  const maxWeekSec = useMemo(() => Math.max(1, ...week.map((w: any) => w.seconds || 0)), [week]);

  if (loading) {
    return (
      <View style={s.loading}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }
  if (!course) return null;

  const gradient = course.gradient || [theme.colors.brand, theme.colors.brandDark];

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.brand} />}
      >
        {/* HERO */}
        <LinearGradient colors={gradient} style={s.hero}>
          <Image source={{ uri: course.banner_image }} style={[StyleSheet.absoluteFillObject, { opacity: 0.18 }]} contentFit="cover" />
          <SafeAreaView edges={['top']}>
            <View style={s.topRow}>
              <Pressable onPress={() => router.back()} hitSlop={10} style={s.iconBtn}>
                <Ionicons name="chevron-back" size={24} color="#FFF" />
              </Pressable>
              <Text style={s.crumb}>My Learning</Text>
              <View style={{ flex: 1 }} />
              <Pressable style={s.iconBtn} onPress={() => router.push('/video-courses/my')}>
                <Ionicons name="library-outline" size={20} color="#FFF" />
              </Pressable>
            </View>
            <Text style={s.courseName}>{course.name}</Text>
            <Text style={s.examName}>{course.exam_name}</Text>

            {/* Progress ring row */}
            <View style={s.progressBlock}>
              <ProgressRing pct={totals.completion_pct} />
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={s.progLbl}>YOUR PROGRESS</Text>
                <Text style={s.progPct}>{totals.completion_pct}%</Text>
                <Text style={s.progSub}>
                  {totals.completed_lectures} of {totals.total_lectures} lectures • {totals.total_watch_hours}h watched
                </Text>
                <View style={s.streakPill}>
                  <Ionicons name="flame" size={12} color="#FCD34D" />
                  <Text style={s.streakTxt}>{totals.streak_days || 0} day streak</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* CONTINUE CARD */}
        {resume ? (
          <Pressable
            style={s.resumeCard}
            onPress={() => router.push(`/video-courses/watch/${id}?lec=${encodeURIComponent(resume.lecture_id)}`)}
            testID="vc-resume"
          >
            <Image source={{ uri: resume.poster }} style={s.resumePoster} contentFit="cover" />
            <View style={s.resumePlay}>
              <Ionicons name="play" size={22} color="#FFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.resumeLbl}>{resume.completed ? 'REWATCH' : (resume.watched_pct > 0 ? 'CONTINUE WATCHING' : 'START LEARNING')}</Text>
              <Text style={s.resumeTitle} numberOfLines={1}>{resume.title}</Text>
              <Text style={s.resumeMeta} numberOfLines={1}>{resume.subject} • {resume.duration}</Text>
              {resume.watched_pct > 0 && !resume.completed ? (
                <View style={s.resumeBar}>
                  <View style={[s.resumeFill, { width: `${resume.watched_pct}%` }]} />
                </View>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={22} color={theme.colors.brand} />
          </Pressable>
        ) : null}

        {/* WEEKLY CHART */}
        {week.length > 0 ? (
          <View style={s.card}>
            <View style={s.cardHead}>
              <Text style={s.cardTitle}>This Week</Text>
              <Text style={s.cardSub}>Watch time • last 7 days</Text>
            </View>
            <View style={s.weekRow}>
              {week.map((w: any) => {
                const h = Math.max(4, Math.round((w.seconds / maxWeekSec) * 60));
                const day = new Date(w.date).toLocaleDateString('en-IN', { weekday: 'short' });
                return (
                  <View key={w.date} style={s.weekCell}>
                    <View style={s.weekBarWrap}>
                      <View style={[s.weekBar, { height: h }]} />
                    </View>
                    <Text style={s.weekDay}>{day}</Text>
                    <Text style={s.weekMin}>{w.minutes}m</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* SUBJECT PROGRESS */}
        {data.subject_stats?.length ? (
          <View style={s.card}>
            <View style={s.cardHead}>
              <Text style={s.cardTitle}>Subject-wise Progress</Text>
              <Text style={s.cardSub}>Track completion across topics</Text>
            </View>
            <View style={{ paddingHorizontal: 14, paddingBottom: 4 }}>
              {data.subject_stats.map((sub: any) => (
                <View key={sub.subject_key} style={s.subjRow}>
                  <View style={{ flex: 1 }}>
                    <View style={s.subjLine}>
                      <Text style={s.subjName}>{sub.subject}</Text>
                      <Text style={s.subjPct}>{sub.pct}%</Text>
                    </View>
                    <View style={s.subjBar}>
                      <View style={[s.subjFill, { width: `${sub.pct}%` }]} />
                    </View>
                    <Text style={s.subjMeta}>{sub.completed} / {sub.total} lectures • {sub.watched_hours}h watched</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* CURRICULUM WITH PROGRESS TICKS */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Curriculum</Text>
            <Text style={s.cardSub}>Watch lectures at your pace</Text>
          </View>
          {(data.curriculum || []).map((sub: any, si: number) => {
            const open = openSubjectIdx === si;
            return (
              <View key={sub.key || si} style={s.subject}>
                <Pressable onPress={() => toggleSubject(si)} style={s.subjectHead}>
                  <View style={s.subjectIcon}>
                    <Ionicons name="book" size={16} color={theme.colors.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.subjectName}>{sub.subject}</Text>
                    <Text style={s.subjectMeta}>{sub.total_chapters} chapters • {sub.total_videos} videos</Text>
                  </View>
                  <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.muted} />
                </Pressable>
                {open && (
                  <View style={{ paddingHorizontal: 14, paddingBottom: 6 }}>
                    {(sub.chapters || []).map((ch: any) => {
                      const chOpen = !!openChapters[ch.id];
                      const doneInCh = (ch.lectures || []).filter((l: any) => {
                        const p = progressMap[l.id];
                        return p && (p.completed || (p.watched_pct || 0) >= 90);
                      }).length;
                      const totalCh = ch.lectures?.length || 0;
                      return (
                        <View key={ch.id} style={s.chapter}>
                          <Pressable onPress={() => toggleChapter(ch.id)} style={s.chapterHead} disabled={!totalCh}>
                            <View style={s.chapterDot} />
                            <View style={{ flex: 1 }}>
                              <Text style={s.chapterName}>{ch.name}</Text>
                              <Text style={s.chapterMeta}>
                                {totalCh > 0 ? `${doneInCh}/${totalCh} lectures` : `${ch.video_count} videos`}
                              </Text>
                            </View>
                            {totalCh > 0 ? (
                              <Ionicons name={chOpen ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.mutedLight} />
                            ) : null}
                          </Pressable>
                          {chOpen && ch.lectures?.length ? (
                            <View style={s.lectures}>
                              {ch.lectures.map((lec: any, li: number) => {
                                const prog = progressMap[lec.id];
                                const done = prog?.completed || (prog?.watched_pct || 0) >= 90;
                                const inProgress = !done && (prog?.watched_pct || 0) > 0;
                                return (
                                  <Pressable
                                    key={lec.id}
                                    style={s.lecture}
                                    onPress={() => router.push(`/video-courses/watch/${id}?lec=${encodeURIComponent(lec.id)}`)}
                                    testID={`vc-lec-${lec.id}`}
                                  >
                                    <View style={s.lecIcon}>
                                      {done ? (
                                        <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
                                      ) : inProgress ? (
                                        <View style={s.lecInProg}>
                                          <View style={[s.lecInProgFill, { transform: [{ rotate: `${((prog?.watched_pct || 0) / 100) * 360}deg` }] }]} />
                                          <Ionicons name="play" size={11} color={theme.colors.brand} />
                                        </View>
                                      ) : (
                                        <Ionicons name="play-circle-outline" size={22} color={theme.colors.mutedLight} />
                                      )}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                      <Text style={s.lecTitle} numberOfLines={1}>{li + 1}. {lec.title}</Text>
                                      <Text style={s.lecMeta}>
                                        {lec.duration}{inProgress ? ` • ${prog?.watched_pct || 0}% watched` : ''}
                                      </Text>
                                    </View>
                                    {lec.is_free && !done && !inProgress ? (
                                      <View style={s.freePill}><Text style={s.freePillTxt}>FREE</Text></View>
                                    ) : null}
                                    <Ionicons name="chevron-forward" size={16} color={theme.colors.mutedLight} />
                                  </Pressable>
                                );
                              })}
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const clean = Math.max(0, Math.min(100, pct || 0));
  return (
    <View style={s.ringOuter}>
      <View style={s.ringBg}>
        <View style={[s.ringFill, { width: `${clean}%` }]} />
      </View>
      <Text style={s.ringTxt}>{clean}%</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surfaceSecondary },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceSecondary },

  // HERO
  hero: { paddingHorizontal: 16, paddingBottom: 32 },
  topRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 4, gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  crumb: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '800', marginLeft: 4 },
  courseName: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: -0.3, marginTop: 18, lineHeight: 28 },
  examName: { color: 'rgba(255,255,255,0.8)', fontSize: 12.5, fontWeight: '700', marginTop: 4 },

  progressBlock: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  progLbl: { color: 'rgba(255,255,255,0.75)', fontSize: 10.5, fontWeight: '900', letterSpacing: 1 },
  progPct: { color: '#FFF', fontSize: 32, fontWeight: '900', letterSpacing: -1, marginTop: 2 },
  progSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11.5, fontWeight: '700', marginTop: 4 },
  streakPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, marginTop: 8 },
  streakTxt: { color: '#FCD34D', fontSize: 11, fontWeight: '900' },

  // Ring
  ringOuter: { width: 90, height: 90, alignItems: 'center', justifyContent: 'center', borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 3, borderColor: 'rgba(255,255,255,0.35)' },
  ringBg: { position: 'absolute', bottom: 6, width: 60, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  ringFill: { height: '100%', backgroundColor: theme.colors.gold },
  ringTxt: { color: '#FFF', fontSize: 22, fontWeight: '900' },

  // Resume card (overlaps hero)
  resumeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, marginHorizontal: 16, marginTop: -18, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, ...(Platform.OS === 'ios' ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 } : { elevation: 4 }) },
  resumePoster: { width: 76, height: 76, borderRadius: 12 },
  resumePlay: { position: 'absolute', left: 40, top: 40 - 18, width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  resumeLbl: { fontSize: 10, fontWeight: '900', color: theme.colors.brand, letterSpacing: 1 },
  resumeTitle: { fontSize: 14, fontWeight: '900', color: theme.colors.onSurface, marginTop: 3 },
  resumeMeta: { fontSize: 11, color: theme.colors.muted, fontWeight: '700', marginTop: 2 },
  resumeBar: { height: 4, borderRadius: 2, backgroundColor: theme.colors.surfaceSecondary, marginTop: 6, overflow: 'hidden' },
  resumeFill: { height: '100%', backgroundColor: theme.colors.brand },

  // Cards
  card: { backgroundColor: theme.colors.surface, marginHorizontal: 16, marginTop: 14, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, paddingBottom: 12 },
  cardHead: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '900', color: theme.colors.onSurface, letterSpacing: -0.2 },
  cardSub: { fontSize: 11.5, color: theme.colors.muted, fontWeight: '700', marginTop: 2 },

  // Week
  weekRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 8, alignItems: 'flex-end', gap: 6 },
  weekCell: { flex: 1, alignItems: 'center', gap: 4 },
  weekBarWrap: { height: 64, justifyContent: 'flex-end', width: '80%' },
  weekBar: { width: '100%', backgroundColor: theme.colors.brand, borderRadius: 6, minHeight: 4 },
  weekDay: { fontSize: 10, color: theme.colors.muted, fontWeight: '800' },
  weekMin: { fontSize: 9, color: theme.colors.mutedLight, fontWeight: '700' },

  // Subject stats
  subjRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  subjLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subjName: { fontSize: 13.5, fontWeight: '900', color: theme.colors.onSurface },
  subjPct: { fontSize: 13, fontWeight: '900', color: theme.colors.brand },
  subjBar: { height: 6, backgroundColor: theme.colors.surfaceSecondary, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  subjFill: { height: '100%', backgroundColor: theme.colors.brand },
  subjMeta: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '700', marginTop: 4 },

  // Curriculum
  subject: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
  subjectHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  subjectIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  subjectName: { fontSize: 14, fontWeight: '900', color: theme.colors.onSurface },
  subjectMeta: { fontSize: 11, color: theme.colors.muted, fontWeight: '700', marginTop: 2 },
  chapter: { paddingLeft: 46 },
  chapterHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  chapterDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.brand },
  chapterName: { fontSize: 13, fontWeight: '700', color: theme.colors.onSurface },
  chapterMeta: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '700', marginTop: 1 },
  lectures: { paddingLeft: 16, paddingBottom: 6, gap: 2 },
  lecture: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingRight: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.divider },
  lecIcon: { width: 28, alignItems: 'center' },
  lecInProg: { width: 22, height: 22, borderRadius: 11, backgroundColor: theme.colors.brandTertiary, borderWidth: 2, borderColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  lecInProgFill: { position: 'absolute', top: '50%', left: '50%', width: '150%', height: '150%' },
  lecTitle: { fontSize: 12.5, fontWeight: '700', color: theme.colors.onSurface },
  lecMeta: { fontSize: 10, color: theme.colors.muted, fontWeight: '700', marginTop: 1 },
  freePill: { backgroundColor: theme.colors.success, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  freePillTxt: { color: '#FFF', fontSize: 9, fontWeight: '900' },
});
