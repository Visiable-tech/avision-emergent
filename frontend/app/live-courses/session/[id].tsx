import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';

/**
 * Phase-2 stub for a session player.
 * Phase 3 will replace this with real WebSocket chat/polls + live video.
 */
export default function SessionPlayer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [play, setPlay] = useState(false);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const d = await api.liveCourseSession(id);
      setData(d);
    } catch (e) {
      console.warn('session', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !data) {
    return (
      <View style={s.loading}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }

  const { session, course } = data;
  const isLive = session.status === 'live';
  const url = session.video_url ? `${session.video_url}?autoplay=1&rel=0` : '';

  const markAttended = async () => {
    setMarking(true);
    try {
      await api.liveCourseUpdateProgress(course.id, {
        live_attended: isLive ? 1 : 0,
        lessons_watched: !isLive ? 1 : 0,
      });
    } catch (e) { console.warn(e); }
    finally { setMarking(false); }
  };

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Player */}
      <View style={s.player}>
        {play && url ? (
          Platform.OS === 'web' ? (
            <View style={StyleSheet.absoluteFillObject}>
              {/* @ts-ignore */}
              <iframe src={url} width="100%" height="100%" frameBorder={0} allow="autoplay; encrypted-media" allowFullScreen style={{ border: 0 }} />
            </View>
          ) : (
            <WebView source={{ uri: url }} style={{ flex: 1, backgroundColor: '#000' }} allowsFullscreenVideo javaScriptEnabled />
          )
        ) : (
          <>
            <Image source={{ uri: course.banner_image }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
            <LinearGradient colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.75)']} style={StyleSheet.absoluteFillObject} />
            <SafeAreaView edges={['top']} style={s.playerTop}>
              <Pressable onPress={() => router.back()} hitSlop={10} style={s.iconBtn} testID="sess-back">
                <Ionicons name="chevron-back" size={22} color="#FFF" />
              </Pressable>
              {isLive ? (
                <View style={s.liveBadge}>
                  <View style={s.livePulse} />
                  <Text style={s.liveTxt}>LIVE</Text>
                </View>
              ) : null}
              <View style={{ flex: 1 }} />
            </SafeAreaView>
            <View style={s.playCenter}>
              <Pressable onPress={() => { setPlay(true); markAttended(); }} style={s.playBig} testID="sess-play">
                <Ionicons name={isLive ? 'radio' : 'play'} size={30} color={theme.colors.brand} />
              </Pressable>
              <Text style={s.playTitle} numberOfLines={2}>{session.subject}</Text>
              <Text style={s.playSub} numberOfLines={1}>{session.topic}</Text>
            </View>
          </>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={s.head}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{session.subject}</Text>
            <Text style={s.topic}>{session.topic}</Text>
          </View>
          {isLive ? (
            <View style={s.liveBadgeInline}>
              <View style={s.livePulse} />
              <Text style={s.liveTxt}>LIVE</Text>
            </View>
          ) : (
            <View style={s.chip}>
              <Ionicons name="time-outline" size={11} color={theme.colors.brand} />
              <Text style={s.chipTxt}>{session.status.toUpperCase()}</Text>
            </View>
          )}
        </View>

        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Ionicons name="person-outline" size={12} color={theme.colors.muted} />
            <Text style={s.metaTxt}>{session.faculty_name}</Text>
          </View>
          <View style={s.metaItem}>
            <Ionicons name="calendar-outline" size={12} color={theme.colors.muted} />
            <Text style={s.metaTxt}>{session.day_short}, {session.date_short}</Text>
          </View>
          <View style={s.metaItem}>
            <Ionicons name="time-outline" size={12} color={theme.colors.muted} />
            <Text style={s.metaTxt}>{session.time_short}</Text>
          </View>
        </View>

        {/* Phase 3 preview card */}
        <View style={s.phaseCard}>
          <View style={s.phaseIcon}>
            <Ionicons name="chatbubbles" size={16} color={theme.colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.phaseTitle}>Live Chat & Polls — coming in Phase 3</Text>
            <Text style={s.phaseSub}>
              Real-time WebSocket chat, hand-raise and instructor polls will be enabled here.
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={s.actions}>
          <Pressable
            style={s.action}
            testID="sess-notes"
          >
            <View style={[s.actionIcon, { backgroundColor: '#7C3AED18' }]}>
              <Ionicons name="document-text" size={16} color="#7C3AED" />
            </View>
            <Text style={s.actionLbl}>Notes</Text>
          </Pressable>
          <Pressable style={s.action} testID="sess-doubt">
            <View style={[s.actionIcon, { backgroundColor: '#F59E0B18' }]}>
              <Ionicons name="help-circle" size={16} color="#F59E0B" />
            </View>
            <Text style={s.actionLbl}>Ask Doubt</Text>
          </Pressable>
          <Pressable style={s.action} testID="sess-save">
            <View style={[s.actionIcon, { backgroundColor: '#0B4DB818' }]}>
              <Ionicons name="bookmark" size={16} color={theme.colors.brand} />
            </View>
            <Text style={s.actionLbl}>Save</Text>
          </Pressable>
          <Pressable style={s.action} testID="sess-share">
            <View style={[s.actionIcon, { backgroundColor: '#05966918' }]}>
              <Ionicons name="share-social" size={16} color="#059669" />
            </View>
            <Text style={s.actionLbl}>Share</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={markAttended}
          disabled={marking}
          style={[s.markBtn, marking && { opacity: 0.5 }]}
          testID="sess-mark"
        >
          {marking ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-done" size={16} color="#FFF" />
              <Text style={s.markTxt}>{isLive ? 'Mark Attended' : 'Mark Watched'}</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surfaceSecondary },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface },
  player: { height: 260, backgroundColor: '#111' },
  playerTop: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 6, position: 'absolute', top: 0, left: 0, right: 0 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  liveBadgeInline: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  livePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  liveTxt: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  playCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  playBig: { width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center' },
  playTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', marginTop: 12, textAlign: 'center' },
  playSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600', marginTop: 4, textAlign: 'center' },

  head: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  title: { fontSize: 18, fontWeight: '900', color: theme.colors.onSurface },
  topic: { fontSize: 13, color: theme.colors.onSurfaceSecondary, fontWeight: '600', marginTop: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.brandTertiary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  chipTxt: { color: theme.colors.brand, fontSize: 10, fontWeight: '900' },
  metaRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt: { fontSize: 11.5, color: theme.colors.muted, fontWeight: '700' },

  phaseCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.brandTertiary,
    borderWidth: 1,
    borderColor: theme.colors.brand + '22',
    marginTop: 14,
  },
  phaseIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  phaseTitle: { fontSize: 12.5, fontWeight: '900', color: theme.colors.brand },
  phaseSub: { fontSize: 11.5, color: theme.colors.brand, fontWeight: '600', marginTop: 3, lineHeight: 16 },

  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  action: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  actionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionLbl: { fontSize: 11, fontWeight: '800', color: theme.colors.onSurface },

  markBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.brand,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 16,
  },
  markTxt: { color: '#FFF', fontSize: 14, fontWeight: '900' },
});
