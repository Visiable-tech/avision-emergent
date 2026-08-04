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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';

export default function CourseDashboard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [realSessions, setRealSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [d, ss] = await Promise.all([
        api.liveCourseDashboard(id),
        api.lcSessions(id).catch(() => ({ sessions: [] })),
      ]);
      setData(d);
      setRealSessions(ss.sessions || []);
    } catch (e: any) {
      console.warn('dashboard', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading || !data) {
    return (
      <View style={s.loading}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }

  const { course, enrollment, next_action, today_target, today_schedule, upcoming_sessions, subject_progress, recent_recordings, stats, faculties } = data;

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Hero header */}
      <LinearGradient colors={course.gradient || [theme.colors.brand, theme.colors.brandDark]} style={s.hero}>
        <Image source={{ uri: course.banner_image }} style={[StyleSheet.absoluteFillObject, { opacity: 0.18 }]} contentFit="cover" />
        <SafeAreaView edges={['top']}>
          <View style={s.topRow}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={s.iconBtn} testID="dash-back">
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={s.batchLabel}>{course.batch_label}</Text>
              <Text style={s.courseName} numberOfLines={2}>{course.name}</Text>
            </View>
            <Pressable style={s.iconBtn} onPress={() => router.push(`/live-courses/${course.id}`)} testID="dash-info">
              <Ionicons name="information-circle-outline" size={22} color="#FFF" />
            </Pressable>
          </View>

          {/* Progress bar */}
          <View style={s.progWrap}>
            <View style={s.progHead}>
              <Text style={s.progLbl}>Overall Progress</Text>
              <Text style={s.progPct}>{enrollment.progress_pct}%</Text>
            </View>
            <View style={s.progBar}>
              <View style={[s.progFill, { width: `${enrollment.progress_pct}%` }]} />
            </View>
            <View style={s.progMetaRow}>
              <View style={s.progMeta}>
                <Ionicons name="calendar-outline" size={11} color="rgba(255,255,255,0.75)" />
                <Text style={s.progMetaTxt}>{enrollment.days_remaining} days left</Text>
              </View>
              <View style={s.progMeta}>
                <Ionicons name="flame" size={11} color="#FCD34D" />
                <Text style={s.progMetaTxt}>{today_target.streak_days} day streak</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
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
        {/* Next Action card — overlaps hero */}
        <View style={s.nextWrap}>
          {(() => {
            const liveNow = realSessions.find((r) => r.status === 'live');
            const nextUp = realSessions.find((r) => r.status === 'upcoming');
            const action = liveNow
              ? {
                  type: 'live_now',
                  title: `🔴 LIVE: ${liveNow.subject}`,
                  subtitle: `${liveNow.faculty_name} • ${liveNow.topic}`,
                  cta_label: 'Join Live',
                  cta_route: `/live-classroom/${liveNow.session_id}`,
                  accent: '#EF4444',
                  meta: `Live now • Don't miss it`,
                }
              : nextUp
              ? {
                  type: 'live_upcoming',
                  title: `Next: ${nextUp.subject}`,
                  subtitle: `${nextUp.faculty_name} • ${nextUp.topic}`,
                  cta_label: 'Enter Room',
                  cta_route: `/live-classroom/${nextUp.session_id}`,
                  accent: theme.colors.brand,
                  meta:
                    typeof nextUp.starts_in_min === 'number'
                      ? nextUp.starts_in_min < 60
                        ? `Starts in ${nextUp.starts_in_min} min`
                        : `Starts in ${Math.floor(nextUp.starts_in_min / 60)}h ${nextUp.starts_in_min % 60}m`
                      : 'Upcoming',
                }
              : next_action;
            return (
              <NextActionCard action={action} onPress={() => action?.cta_route && router.push(action.cta_route)} />
            );
          })()}
        </View>

        {/* Today's Target */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Today&apos;s Target</Text>
            <View style={s.completionChip}>
              <Text style={s.completionTxt}>{today_target.completion_pct}% done</Text>
            </View>
          </View>
          <View style={s.targetRow}>
            {today_target.targets.map((t: any) => (
              <TargetTile key={t.key} t={t} />
            ))}
          </View>
        </View>

        {/* Quick tiles */}
        <View style={s.quickWrap}>
          <QuickTile
            icon="videocam"
            color="#EF4444"
            label="Live"
            onPress={() => {
              const live = realSessions.find((r) => r.status === 'live');
              const target = live || realSessions.find((r) => r.status === 'upcoming');
              if (target) router.push(`/live-classroom/${target.session_id}`);
            }}
            testID="quick-live"
          />
          <QuickTile
            icon="play-circle"
            color="#0B4DB8"
            label="Recordings"
            onPress={() => {
              const rec = realSessions.find((r) => r.status === 'recorded' || r.type === 'recorded');
              if (rec) router.push(`/live-classroom/${rec.session_id}`);
            }}
            testID="quick-recordings"
          />
          <QuickTile icon="document-text" color="#7C3AED" label="Notes" onPress={() => {}} testID="quick-notes" />
          <QuickTile icon="clipboard" color="#059669" label="Tests" onPress={() => router.push('/test-prime')} testID="quick-tests" />
          <QuickTile icon="help-circle" color="#F59E0B" label="Doubts" onPress={() => {}} testID="quick-doubts" />
          <QuickTile icon="stats-chart" color="#0891B2" label="Progress" onPress={() => {}} testID="quick-progress" />
        </View>

        {/* Today's Schedule — uses real sessions when available */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Today&apos;s Schedule</Text>
            <Text style={s.cardSub}>
              {(realSessions.length > 0 ? realSessions : today_schedule).length} sessions
            </Text>
          </View>
          <View style={{ marginTop: 10, gap: 10 }}>
            {(realSessions.length > 0
              ? realSessions.map((r) => ({
                  id: r.session_id,
                  subject: r.subject,
                  topic: r.topic,
                  faculty_name: r.faculty_name,
                  status: r.status,
                  time_short: `${new Date(r.starts_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} • ${r.duration_min}m`,
                  is_real: true,
                }))
              : today_schedule
            ).map((sess: any) => (
              <SessionRow
                key={sess.id}
                sess={sess}
                onPress={() =>
                  sess.is_real
                    ? router.push(`/live-classroom/${sess.id}`)
                    : router.push(`/live-courses/session/${sess.id}`)
                }
              />
            ))}
          </View>
        </View>

        {/* Subject Progress */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Subject Progress</Text>
          <View style={{ marginTop: 10, gap: 10 }}>
            {subject_progress.map((sp: any, i: number) => (
              <SubjectRow key={i} sp={sp} />
            ))}
          </View>
        </View>

        {/* Recent Recordings */}
        {recent_recordings?.length ? (
          <View style={s.card}>
            <View style={s.cardHead}>
              <Text style={s.cardTitle}>Recent Recordings</Text>
              <Pressable>
                <Text style={s.viewAll}>View all</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingTop: 10, paddingRight: 4 }}
            >
              {recent_recordings.map((r: any) => (
                <RecordingCard key={r.id} r={r} onPress={() => {}} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Upcoming Sessions */}
        {upcoming_sessions?.length ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>Upcoming Sessions</Text>
            <View style={{ marginTop: 10, gap: 8 }}>
              {upcoming_sessions.map((sess: any) => (
                <UpcomingRow key={sess.id} sess={sess} />
              ))}
            </View>
          </View>
        ) : null}

        {/* Stats */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Your Stats</Text>
          <View style={s.statsGrid}>
            <StatTile
              icon="videocam"
              val={`${stats.classes_attended}`}
              lbl={`of ${stats.total_classes} classes`}
              color="#EF4444"
            />
            <StatTile
              icon="clipboard"
              val={`${stats.mocks_attempted}`}
              lbl={`of ${stats.total_mocks} mocks`}
              color="#7C3AED"
            />
            <StatTile icon="play" val={`${stats.videos_watched}`} lbl="videos watched" color="#0B4DB8" />
            <StatTile
              icon="target"
              val={`${stats.avg_accuracy_pct}%`}
              lbl="avg accuracy"
              color="#059669"
              iconLib="mci"
            />
          </View>
        </View>

        {/* Faculty */}
        {faculties?.length ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>Your Faculty</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingTop: 10, paddingRight: 4 }}
            >
              {faculties.map((f: any) => (
                <Pressable
                  key={f.id}
                  onPress={() => router.push(`/live-courses/faculty/${f.id}`)}
                  style={s.facCard}
                  testID={`dash-faculty-${f.id}`}
                >
                  <Image source={{ uri: f.avatar }} style={s.facAvatar} contentFit="cover" />
                  <Text style={s.facName} numberOfLines={1}>{f.name}</Text>
                  <Text style={s.facTitle} numberOfLines={2}>{f.title}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

/* ---------- Sub-components ---------- */

function NextActionCard({ action, onPress }: { action: any; onPress: () => void }) {
  const isLive = action?.type === 'live_now';
  const accent = action?.accent || theme.colors.brand;
  return (
    <Pressable onPress={onPress} style={[s.nextCard]} testID="next-action-card">
      <LinearGradient
        colors={isLive ? ['#EF4444', '#B91C1C'] : [accent, accent + 'CC']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={s.nextInner}>
        <View style={{ flex: 1 }}>
          <View style={s.nextLabelRow}>
            <View style={s.nextLbl}>
              <Text style={s.nextLblTxt}>{isLive ? 'LIVE NOW' : 'NEXT ACTION'}</Text>
            </View>
            {isLive ? <View style={s.livePulse} /> : null}
          </View>
          <Text style={s.nextTitle} numberOfLines={2}>{action.title}</Text>
          <Text style={s.nextSub} numberOfLines={2}>{action.subtitle}</Text>
          <Text style={s.nextMeta}>{action.meta}</Text>
        </View>
        <View style={s.nextCta}>
          <Text style={s.nextCtaTxt}>{action.cta_label}</Text>
          <Ionicons name="arrow-forward" size={16} color={accent} />
        </View>
      </View>
    </Pressable>
  );
}

function TargetTile({ t }: { t: any }) {
  const pct = Math.min(100, (t.done / Math.max(1, t.total)) * 100);
  const done = t.done >= t.total;
  return (
    <View style={s.targetTile}>
      <View style={[s.targetIcon, done && { backgroundColor: theme.colors.success }]}>
        <Ionicons name={t.icon} size={16} color={done ? '#FFF' : theme.colors.brand} />
      </View>
      <Text style={s.targetVal}>
        {t.done}/{t.total}
      </Text>
      <Text style={s.targetLbl} numberOfLines={1}>{t.label}</Text>
      <View style={s.targetBar}>
        <View style={[s.targetFill, { width: `${pct}%`, backgroundColor: done ? theme.colors.success : theme.colors.brand }]} />
      </View>
    </View>
  );
}

function QuickTile({ icon, color, label, onPress, testID }: any) {
  return (
    <Pressable style={s.quickTile} onPress={onPress} testID={testID}>
      <View style={[s.quickIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={s.quickLbl}>{label}</Text>
    </Pressable>
  );
}

function SessionRow({ sess, onPress }: { sess: any; onPress: () => void }) {
  const isLive = sess.status === 'live';
  const isUpcoming = sess.status === 'upcoming';
  return (
    <Pressable onPress={onPress} style={s.sessRow} testID={`session-${sess.id}`}>
      <View style={[s.sessDot, isLive ? { backgroundColor: '#EF4444' } : isUpcoming ? { backgroundColor: theme.colors.brand } : { backgroundColor: theme.colors.muted }]} />
      <View style={{ flex: 1 }}>
        <View style={s.sessHead}>
          <Text style={s.sessSubject} numberOfLines={1}>{sess.subject}</Text>
          {isLive ? (
            <View style={s.liveBadge}>
              <View style={s.livePulseSmall} />
              <Text style={s.liveBadgeTxt}>LIVE</Text>
            </View>
          ) : null}
        </View>
        <Text style={s.sessTopic} numberOfLines={1}>{sess.topic}</Text>
        <View style={s.sessMetaRow}>
          <Ionicons name="person-outline" size={11} color={theme.colors.muted} />
          <Text style={s.sessMeta}>{sess.faculty_name}</Text>
          <Text style={s.sessDotSep}>•</Text>
          <Ionicons name="time-outline" size={11} color={theme.colors.muted} />
          <Text style={s.sessMeta}>{sess.time_short}</Text>
        </View>
      </View>
      <View style={[s.sessCta, isLive && { backgroundColor: '#EF4444' }]}>
        <Ionicons name={isLive ? 'radio' : 'play'} size={14} color="#FFF" />
        <Text style={s.sessCtaTxt}>{isLive ? 'Join' : isUpcoming ? 'Remind' : 'Watch'}</Text>
      </View>
    </Pressable>
  );
}

function UpcomingRow({ sess }: { sess: any }) {
  return (
    <View style={s.upRow}>
      <View style={s.upDate}>
        <Text style={s.upDay}>{sess.day_short}</Text>
        <Text style={s.upDateNum}>{sess.date_short.split(' ')[0]}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.upSubject} numberOfLines={1}>{sess.subject}</Text>
        <Text style={s.upTopic} numberOfLines={1}>
          {sess.topic} • {sess.faculty_name}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />
    </View>
  );
}

function SubjectRow({ sp }: { sp: any }) {
  return (
    <View style={s.subjRow}>
      <View style={s.subjIcon}>
        <MaterialCommunityIcons name="book-open-page-variant" size={16} color={theme.colors.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={s.subjHead}>
          <Text style={s.subjName} numberOfLines={1}>{sp.subject}</Text>
          <Text style={s.subjPct}>{sp.pct}%</Text>
        </View>
        <View style={s.subjBar}>
          <View style={[s.subjFill, { width: `${sp.pct}%` }]} />
        </View>
        <Text style={s.subjMeta}>
          {sp.done_topics}/{sp.total_topics} topics • {sp.hours}h
        </Text>
      </View>
    </View>
  );
}

function RecordingCard({ r, onPress }: { r: any; onPress: () => void }) {
  return (
    <Pressable style={s.recCard} onPress={onPress} testID={`rec-${r.id}`}>
      <View style={s.recThumb}>
        <Image source={{ uri: r.thumbnail }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFillObject} />
        <View style={s.recPlay}>
          <Ionicons name="play" size={16} color={theme.colors.brand} />
        </View>
        <View style={s.recDur}>
          <Text style={s.recDurTxt}>{r.duration}</Text>
        </View>
        {r.watched_pct > 0 ? (
          <View style={s.recProgWrap}>
            <View style={[s.recProgFill, { width: `${r.watched_pct}%` }]} />
          </View>
        ) : null}
      </View>
      <Text style={s.recTitle} numberOfLines={2}>{r.title}</Text>
      <Text style={s.recSub} numberOfLines={1}>
        {r.subject} • {r.date_short}
      </Text>
    </Pressable>
  );
}

function StatTile({ icon, val, lbl, color, iconLib }: any) {
  const I = iconLib === 'mci' ? MaterialCommunityIcons : Ionicons;
  return (
    <View style={s.statTile}>
      <View style={[s.statIcon, { backgroundColor: color + '18' }]}>
        <I name={icon} size={16} color={color} />
      </View>
      <Text style={s.statVal}>{val}</Text>
      <Text style={s.statLbl} numberOfLines={1}>{lbl}</Text>
    </View>
  );
}

/* ---------- Styles ---------- */

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surfaceSecondary },
  loading: { flex: 1, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },

  hero: {
    paddingHorizontal: 16,
    paddingBottom: 42,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0,
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 6, gap: 10 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  batchLabel: { color: '#FCD34D', fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  courseName: { color: '#FFF', fontSize: 18, fontWeight: '900', marginTop: 4, letterSpacing: -0.2 },
  progWrap: { marginTop: 16 },
  progHead: { flexDirection: 'row', justifyContent: 'space-between' },
  progLbl: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  progPct: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  progBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  progFill: { height: '100%', backgroundColor: '#FCD34D', borderRadius: 3 },
  progMetaRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  progMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  progMetaTxt: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700' },

  // Next Action
  nextWrap: { paddingHorizontal: 16, marginTop: -30 },
  nextCard: {
    borderRadius: 18,
    overflow: 'hidden',
    ...(theme.shadow.strong as object),
  },
  nextInner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  nextLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nextLbl: { backgroundColor: 'rgba(255,255,255,0.24)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  nextLblTxt: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  livePulse: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#FFF' },
  nextTitle: { color: '#FFF', fontSize: 15, fontWeight: '900', marginTop: 8, letterSpacing: -0.2 },
  nextSub: { color: 'rgba(255,255,255,0.9)', fontSize: 11.5, fontWeight: '600', marginTop: 3 },
  nextMeta: { color: 'rgba(255,255,255,0.75)', fontSize: 10.5, fontWeight: '700', marginTop: 8 },
  nextCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  nextCtaTxt: { color: theme.colors.brand, fontSize: 12, fontWeight: '900' },

  // Cards
  card: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 15.5, fontWeight: '900', color: theme.colors.onSurface },
  cardSub: { fontSize: 11, color: theme.colors.muted, fontWeight: '700' },
  viewAll: { fontSize: 12, color: theme.colors.brand, fontWeight: '800' },
  completionChip: { backgroundColor: theme.colors.brandTertiary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  completionTxt: { color: theme.colors.brand, fontSize: 10.5, fontWeight: '900' },

  // Target
  targetRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  targetTile: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  targetIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: theme.colors.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetVal: { fontSize: 15, fontWeight: '900', color: theme.colors.onSurface, marginTop: 8 },
  targetLbl: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '700', marginTop: 2 },
  targetBar: { height: 4, backgroundColor: theme.colors.border, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  targetFill: { height: '100%', backgroundColor: theme.colors.brand, borderRadius: 2 },

  // Quick tiles
  quickWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginTop: 12 },
  quickTile: {
    width: '31.5%',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  quickIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickLbl: { fontSize: 11, fontWeight: '800', color: theme.colors.onSurface, marginTop: 6 },

  // Session
  sessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.surfaceSecondary,
    padding: 10,
    borderRadius: 12,
  },
  sessDot: { width: 8, height: 8, borderRadius: 4 },
  sessHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sessSubject: { fontSize: 13, fontWeight: '900', color: theme.colors.onSurface, flex: 1 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  livePulseSmall: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFF' },
  liveBadgeTxt: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  sessTopic: { fontSize: 12, color: theme.colors.onSurfaceSecondary, fontWeight: '600', marginTop: 2 },
  sessMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  sessMeta: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '700' },
  sessDotSep: { color: theme.colors.mutedLight, fontSize: 10 },
  sessCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.brand,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  sessCtaTxt: { color: '#FFF', fontSize: 11, fontWeight: '900' },

  // Upcoming
  upRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  upDate: {
    width: 44,
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: theme.colors.brandTertiary,
    borderRadius: 10,
  },
  upDay: { fontSize: 9.5, fontWeight: '900', color: theme.colors.brand, letterSpacing: 0.5 },
  upDateNum: { fontSize: 15, fontWeight: '900', color: theme.colors.onSurface, marginTop: 1 },
  upSubject: { fontSize: 13, fontWeight: '900', color: theme.colors.onSurface },
  upTopic: { fontSize: 11.5, color: theme.colors.muted, fontWeight: '700', marginTop: 2 },

  // Subject row
  subjRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subjIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: theme.colors.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  subjName: { fontSize: 13, fontWeight: '800', color: theme.colors.onSurface, flex: 1 },
  subjPct: { fontSize: 12, fontWeight: '900', color: theme.colors.brand },
  subjBar: { height: 5, backgroundColor: theme.colors.surfaceSecondary, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  subjFill: { height: '100%', backgroundColor: theme.colors.brand, borderRadius: 3 },
  subjMeta: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '700', marginTop: 4 },

  // Recording
  recCard: { width: 180 },
  recThumb: { height: 100, borderRadius: 12, overflow: 'hidden', backgroundColor: '#111' },
  recPlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -16,
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recDur: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recDurTxt: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  recProgWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.25)' },
  recProgFill: { height: '100%', backgroundColor: theme.colors.gold },
  recTitle: { fontSize: 12.5, fontWeight: '900', color: theme.colors.onSurface, marginTop: 8 },
  recSub: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '700', marginTop: 2 },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  statTile: {
    width: '48%',
    padding: 10,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statVal: { fontSize: 18, fontWeight: '900', color: theme.colors.onSurface, marginTop: 8 },
  statLbl: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '700', marginTop: 2 },

  // Faculty
  facCard: {
    width: 110,
    padding: 10,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  facAvatar: { width: 56, height: 56, borderRadius: 28 },
  facName: { fontSize: 12, fontWeight: '900', color: theme.colors.onSurface, marginTop: 6, textAlign: 'center' },
  facTitle: { fontSize: 9.5, fontWeight: '600', color: theme.colors.muted, textAlign: 'center', marginTop: 2, height: 24 },
});
