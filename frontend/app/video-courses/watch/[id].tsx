import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';

// Native-only component wraps expo-video. Kept in its own module so hooks stay
// unconditional on native, and the file isn't imported at all on web.
import NativeVideo from '@/src/NativeVideo';

const PROGRESS_SAVE_INTERVAL_MS = 15000;
const PROGRESS_MIN_DELTA_PCT = 2;

export default function VideoCourseWatch() {
  const { id, lec } = useLocalSearchParams<{ id: string; lec?: string }>();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [pos, setPos] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);

  const lastSavedRef = useRef({ ts: 0, pct: 0, sec: 0 });
  const routerRef = useRef(router);
  routerRef.current = router;

  const load = useCallback(async () => {
    if (!id || !lec) return;
    setLoading(true);
    try {
      const d = await api.vcLecture(id, lec);
      setData(d);
      const priorSec = d?.progress?.last_pos_seconds || 0;
      setPos(priorSec);
      lastSavedRef.current = { ts: Date.now(), pct: d?.progress?.watched_pct || 0, sec: priorSec };
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load lecture');
      routerRef.current.back();
    } finally {
      setLoading(false);
    }
  }, [id, lec]);

  useEffect(() => { load(); }, [load]);

  const saveProgress = useCallback(async (opts?: { completed?: boolean; force?: boolean }) => {
    if (!data?.lecture || !id) return;
    const now = Date.now();
    const lecId = data.lecture.lecture_id;
    const durSec = duration || data.lecture.duration_sec || 0;
    const watched_pct = durSec > 0
      ? Math.min(100, Math.round((pos / durSec) * 100))
      : lastSavedRef.current.pct;

    const dtMs = now - lastSavedRef.current.ts;
    const dpct = Math.abs(watched_pct - lastSavedRef.current.pct);
    if (!opts?.force && !opts?.completed && dtMs < PROGRESS_SAVE_INTERVAL_MS && dpct < PROGRESS_MIN_DELTA_PCT) {
      return;
    }
    const watch_seconds_delta = playing ? Math.min(Math.floor(dtMs / 1000), 60) : 0;

    try {
      await api.vcSaveProgress(id, {
        lecture_id: lecId,
        watched_pct,
        last_pos_seconds: Math.floor(pos),
        watch_seconds_delta,
        completed: !!opts?.completed || watched_pct >= 95,
      });
      lastSavedRef.current = { ts: now, pct: watched_pct, sec: pos };
    } catch {/* silent */}
  }, [data, id, pos, duration, playing]);

  useEffect(() => {
    const t = setInterval(() => { saveProgress(); }, PROGRESS_SAVE_INTERVAL_MS);
    return () => clearInterval(t);
  }, [saveProgress]);

  useEffect(() => {
    return () => { saveProgress({ force: true }); };
  }, [saveProgress]);

  // ------------- Web <video> wiring -------------
  const webVideoRef = useRef<any>(null);
  const onWebTimeUpdate = () => {
    const v = webVideoRef.current;
    if (!v) return;
    setPos(v.currentTime || 0);
    if (v.duration && v.duration !== duration) setDuration(v.duration);
  };
  const onWebPlay = () => setPlaying(true);
  const onWebPause = () => setPlaying(false);
  const onWebEnded = () => { setPlaying(false); saveProgress({ completed: true, force: true }); };
  const onWebLoaded = () => {
    const v = webVideoRef.current;
    if (v && data?.progress?.last_pos_seconds) {
      try { v.currentTime = data.progress.last_pos_seconds; } catch { /* ignore */ }
    }
  };

  const goto = (target: any) => {
    if (!target) return;
    saveProgress({ force: true }).finally(() => {
      router.replace(`/video-courses/watch/${id}?lec=${encodeURIComponent(target.lecture_id)}`);
    });
  };

  const markComplete = async () => {
    await saveProgress({ completed: true, force: true });
    Alert.alert('Marked as Complete', `${data?.lecture?.title} ✓`);
  };

  if (loading || !data) {
    return (
      <View style={s.loading}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }

  const lecture = data.lecture;
  const cur = data.progress || {};

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={s.topbar}>
        <Pressable onPress={() => { saveProgress({ force: true }); router.back(); }} hitSlop={10} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.crumb} numberOfLines={1}>{data.course?.name}</Text>
          <Text style={s.crumbSub}>Lecture {data.index} of {data.total}</Text>
        </View>
      </SafeAreaView>

      <View style={s.playerWrap}>
        {Platform.OS === 'web' ? (
          /* @ts-ignore — RN Web renders inline HTML video */
          <video
            ref={webVideoRef}
            src={lecture.video_url}
            poster={lecture.poster}
            controls
            playsInline
            onTimeUpdate={onWebTimeUpdate}
            onPlay={onWebPlay}
            onPause={onWebPause}
            onEnded={onWebEnded}
            onLoadedMetadata={onWebLoaded}
            style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
          />
        ) : (
          <NativeVideo
            uri={lecture.video_url}
            startSeconds={data.progress?.last_pos_seconds || 0}
            onTime={(t, d) => { setPos(t); if (d && d !== duration) setDuration(d); }}
            onPlayingChange={setPlaying}
            onEnded={() => { setPlaying(false); saveProgress({ completed: true, force: true }); }}
          />
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={s.metaCard}>
          <Text style={s.lecSubject}>{lecture.subject} • {lecture.chapter_name}</Text>
          <Text style={s.lecTitle}>{lecture.title}</Text>

          <View style={s.progRow}>
            <View style={s.progBar}>
              <View style={[s.progFill, {
                width: `${Math.max(cur.watched_pct || 0, duration > 0 ? Math.min(100, Math.round((pos / duration) * 100)) : 0)}%`,
              }]} />
            </View>
            <Text style={s.progLbl}>
              {duration > 0 ? `${fmt(pos)} / ${fmt(duration)}` : lecture.duration}
            </Text>
          </View>

          <View style={s.actionRow}>
            <Pressable onPress={() => goto(data.prev)} style={[s.navBtn, !data.prev && s.navBtnDisabled]} disabled={!data.prev}>
              <Ionicons name="play-skip-back" size={16} color={data.prev ? theme.colors.brand : theme.colors.mutedLight} />
              <Text style={[s.navBtnTxt, !data.prev && { color: theme.colors.mutedLight }]}>Prev</Text>
            </Pressable>
            <Pressable onPress={markComplete} style={s.completeBtn} testID="vc-mark-complete">
              <Ionicons name="checkmark-circle" size={16} color="#FFF" />
              <Text style={s.completeBtnTxt}>Mark Complete</Text>
            </Pressable>
            <Pressable onPress={() => goto(data.next)} style={[s.navBtn, !data.next && s.navBtnDisabled]} disabled={!data.next}>
              <Text style={[s.navBtnTxt, !data.next && { color: theme.colors.mutedLight }]}>Next</Text>
              <Ionicons name="play-skip-forward" size={16} color={data.next ? theme.colors.brand : theme.colors.mutedLight} />
            </Pressable>
          </View>
        </View>

        {data.next ? (
          <Pressable style={s.nextCard} onPress={() => goto(data.next)}>
            <Image source={{ uri: data.next.poster }} style={s.nextPoster} contentFit="cover" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.nextLbl}>UP NEXT</Text>
              <Text style={s.nextTitle} numberOfLines={2}>{data.next.title}</Text>
              <Text style={s.nextMeta}>{data.next.subject} • {data.next.duration}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.brand} />
          </Pressable>
        ) : (
          <View style={s.doneCard}>
            <Ionicons name="trophy" size={22} color={theme.colors.gold} />
            <Text style={s.doneTxt}>You&apos;ve reached the last lecture in this course! 🎉</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function fmt(sec: number): string {
  if (!sec || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const ss = Math.floor(sec % 60);
  return `${m}:${ss.toString().padStart(2, '0')}`;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surfaceSecondary },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceSecondary },
  topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8, backgroundColor: theme.colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  crumb: { fontSize: 13, fontWeight: '900', color: theme.colors.onSurface },
  crumbSub: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '700', marginTop: 1 },

  playerWrap: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },

  metaCard: { backgroundColor: theme.colors.surface, marginHorizontal: 12, marginTop: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border },
  lecSubject: { fontSize: 11, color: theme.colors.brand, fontWeight: '900', letterSpacing: 1 },
  lecTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.onSurface, marginTop: 4, letterSpacing: -0.2 },
  progRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  progBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: theme.colors.surfaceSecondary, overflow: 'hidden' },
  progFill: { height: '100%', backgroundColor: theme.colors.brand },
  progLbl: { fontSize: 11, fontWeight: '900', color: theme.colors.muted, minWidth: 74, textAlign: 'right' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: theme.colors.brandTertiary },
  navBtnDisabled: { backgroundColor: theme.colors.surfaceSecondary },
  navBtnTxt: { fontSize: 12, fontWeight: '900', color: theme.colors.brand },
  completeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: theme.colors.success },
  completeBtnTxt: { color: '#FFF', fontSize: 12.5, fontWeight: '900' },

  nextCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, marginHorizontal: 12, marginTop: 12, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border },
  nextPoster: { width: 76, height: 54, borderRadius: 10 },
  nextLbl: { fontSize: 10, color: theme.colors.brand, fontWeight: '900', letterSpacing: 1 },
  nextTitle: { fontSize: 13, fontWeight: '900', color: theme.colors.onSurface, marginTop: 2 },
  nextMeta: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '700', marginTop: 2 },
  doneCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FDF7EC', marginHorizontal: 12, marginTop: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#F5E1B7' },
  doneTxt: { flex: 1, fontSize: 12.5, fontWeight: '800', color: theme.colors.onSurface },
});
