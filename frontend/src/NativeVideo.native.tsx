import { useEffect, useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { theme } from '@/src/theme';

type Props = {
  uri: string;
  startSeconds?: number;
  onTime: (currentSeconds: number, durationSeconds: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onEnded: () => void;
};

export default function NativeVideo({ uri, startSeconds = 0, onTime, onPlayingChange, onEnded }: Props) {
  const player = useVideoPlayer(uri, (p) => {
    p.timeUpdateEventInterval = 1;
    p.loop = false;
    p.play();
  });
  const seekedRef = useRef(false);

  useEffect(() => {
    if (!player) return;
    const timeSub = player.addListener('timeUpdate', (e: any) => {
      const t = e?.currentTime || 0;
      const d = player.duration || 0;
      onTime(t, d);
      // Attempt seek once metadata is ready
      if (!seekedRef.current && startSeconds > 0 && d > 0) {
        try { player.currentTime = Math.min(startSeconds, d - 1); } catch {/* ignore */}
        seekedRef.current = true;
      }
    });
    const playSub = player.addListener('playingChange', (e: any) => {
      onPlayingChange(!!e?.isPlaying);
    });
    const endSub = player.addListener('playToEnd', () => onEnded());
    return () => { timeSub?.remove?.(); playSub?.remove?.(); endSub?.remove?.(); };
  }, [player, startSeconds, onTime, onPlayingChange, onEnded]);

  if (!player) {
    return (
      <View style={s.err}>
        <Text style={s.errTxt}>Player unavailable</Text>
      </View>
    );
  }

  return (
    <VideoView
      style={StyleSheet.absoluteFillObject}
      player={player}
      allowsFullscreen
      allowsPictureInPicture
      nativeControls
      contentFit="contain"
    />
  );
}

const s = StyleSheet.create({
  err: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errTxt: { color: theme.colors.mutedLight, fontSize: 13, fontWeight: '700' },
});
