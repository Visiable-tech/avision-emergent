// Web fallback: never called (VideoCourseWatch renders <video> directly on web).
// This stub exists so Metro can resolve `@/src/NativeVideo` on all platforms.
import { View } from 'react-native';

type Props = {
  uri: string;
  startSeconds?: number;
  onTime: (currentSeconds: number, durationSeconds: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onEnded: () => void;
};

export default function NativeVideo(_p: Props) {
  return <View />;
}
