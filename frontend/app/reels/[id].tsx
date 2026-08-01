import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform, StatusBar as RNStatusBar, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { StatusBar } from 'expo-status-bar';
import { theme } from '@/src/theme';
import { api } from '@/src/api';

const { width: W, height: H } = Dimensions.get('window');

export default function ReelViewer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [reel, setReel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (!id) return;
        const r = await api.reelDetail(id);
        setReel(r);
      } catch (e) { console.warn('reel', e); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const player = useVideoPlayer(reel?.video_url || null, (p) => {
    p.loop = true;
    p.muted = false;
    p.play();
  });

  useEffect(() => {
    if (player) player.muted = muted;
  }, [muted, player]);

  const togglePlay = () => {
    if (!player) return;
    if (player.playing) player.pause(); else player.play();
  };

  if (loading || !reel) {
    return (
      <View style={s.loading}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color="#FFF" />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />

      {/* Video full-screen */}
      <Pressable style={StyleSheet.absoluteFill} onPress={togglePlay}>
        {player ? (
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            nativeControls={false}
            contentFit="cover"
          />
        ) : null}
        {/* Scrims for overlay legibility */}
        <LinearGradient colors={['rgba(0,0,0,0.4)', 'transparent']} style={s.topScrim} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={s.bottomScrim} />
      </Pressable>

      {/* Top bar */}
      <SafeAreaView edges={['top']} style={s.topBar}>
        <Pressable onPress={() => router.back()} testID="reel-back" hitSlop={12} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => setMuted((m) => !m)} testID="reel-mute" hitSlop={12} style={s.iconBtn}>
          <Ionicons name={muted ? 'volume-mute' : 'volume-medium'} size={22} color="#FFF" />
        </Pressable>
      </SafeAreaView>

      {/* Right action rail */}
      <View style={s.rail}>
        <RailBtn icon="heart" label={formatCompact(reel.likes)} />
        <RailBtn icon="chatbubble" label="0" />
        <RailBtn icon="share-social" label="Share" />
        <RailBtn icon="bookmark" label="Save" />
      </View>

      {/* Bottom info */}
      <SafeAreaView edges={['bottom']} style={s.bottomWrap} pointerEvents="box-none">
        <View style={s.bottomInner}>
          <View style={s.brandRow}>
            <View style={s.brandChip}>
              <Ionicons name="school" size={12} color="#FFF" />
              <Text style={s.brandTxt}>{reel.brand}</Text>
            </View>
            <View style={s.viewsChip}>
              <Ionicons name="eye" size={11} color="#FFF" />
              <Text style={s.viewsTxt}>{formatCompact(reel.views)}</Text>
            </View>
          </View>
          <Text style={s.title}>{reel.title}</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

function RailBtn({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={s.railBtnWrap}>
      <View style={s.railBtn}>
        <Ionicons name={icon} size={22} color="#FFF" />
      </View>
      <Text style={s.railLabel}>{label}</Text>
    </View>
  );
}

function formatCompact(n?: number): string {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  loading: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 140 },
  bottomScrim: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 260 },
  topBar: {
    position: 'absolute', left: 0, right: 0, top: 0,
    paddingHorizontal: 8, paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0,
    flexDirection: 'row', alignItems: 'center',
  },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  rail: { position: 'absolute', right: 8, bottom: 160, gap: 16, alignItems: 'center' },
  railBtnWrap: { alignItems: 'center', gap: 4 },
  railBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  railLabel: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  bottomWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bottomInner: { paddingHorizontal: 16, paddingBottom: 20, paddingTop: 10, maxWidth: W - 80 },
  brandRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  brandChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(11,77,184,0.85)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  brandTxt: { color: '#FFF', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  viewsChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 },
  viewsTxt: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  title: { color: '#FFF', fontSize: 15, fontWeight: '700', lineHeight: 20 },
});
