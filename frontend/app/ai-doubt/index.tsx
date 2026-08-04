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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';

const SUBJECTS = [
  { id: 'quant', label: 'Quant', icon: 'calculator', color: '#EF4444' },
  { id: 'reasoning', label: 'Reasoning', icon: 'extension-puzzle', color: '#7C3AED' },
  { id: 'english', label: 'English', icon: 'book', color: '#0B4DB8' },
  { id: 'gs', label: 'General Studies', icon: 'earth', color: '#059669' },
  { id: 'banking', label: 'Banking', icon: 'briefcase', color: '#F59E0B' },
  { id: 'current-affairs', label: 'Current Affairs', icon: 'newspaper', color: '#DB2777' },
] as const;

export default function AiDoubtList() {
  const router = useRouter();
  const { user } = useAuth();
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const r = await api.aiListThreads();
      setThreads(r.threads || []);
    } catch (e) { console.warn('ai list', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const startNew = async (subject: string) => {
    try {
      const r = await api.aiCreateThread({ subject });
      const tid = r.thread.id;
      router.push(`/ai-doubt/${tid}?subject=${subject}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed');
    }
  };

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={[theme.colors.brand, theme.colors.brandDark]} style={s.header}>
        <SafeAreaView edges={['top']}>
          <View style={s.headRow}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={s.iconBtn} testID="aid-back">
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>AI Doubt Solver</Text>
              <Text style={s.sub}>Powered by Claude Sonnet 4.6 • Instant answers</Text>
            </View>
            <View style={s.iconBtn}>
              <MaterialCommunityIcons name="robot-happy" size={20} color="#FFF" />
            </View>
          </View>
          {/* Subject picker */}
          <Text style={s.pickLbl}>Ask a doubt in</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingRight: 16 }}
          >
            {SUBJECTS.map((sub) => (
              <Pressable
                key={sub.id}
                onPress={() => startNew(sub.id)}
                style={s.subjChip}
                testID={`aid-new-${sub.id}`}
              >
                <View style={[s.subjIcon, { backgroundColor: '#FFFFFF22' }]}>
                  <Ionicons name={sub.icon as any} size={14} color="#FFF" />
                </View>
                <Text style={s.subjTxt}>{sub.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={theme.colors.brand} />
        </View>
      ) : threads.length === 0 ? (
        <View style={s.empty}>
          <MaterialCommunityIcons name="robot-outline" size={56} color={theme.colors.mutedLight} />
          <Text style={s.emptyTitle}>Ask your first doubt</Text>
          <Text style={s.emptySub}>Pick a subject above to start a conversation with your AI tutor.</Text>
          <View style={{ marginTop: 16, gap: 8, width: '100%' }}>
            {[
              'Solve: 25% of 60 vs 40% of 45',
              'Explain seating arrangement basics',
              'What is Fiscal Policy?',
              'Grammar tip for cloze test',
            ].map((h, i) => (
              <View key={i} style={s.exampleRow}>
                <MaterialCommunityIcons name="lightbulb-outline" size={14} color={theme.colors.brand} />
                <Text style={s.exampleTxt}>{h}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.brand} />
          }
          showsVerticalScrollIndicator={false}
        >
          {threads.map((t) => {
            const sub = SUBJECTS.find((x) => x.id === t.subject) || SUBJECTS[0];
            return (
              <Pressable
                key={t.id}
                onPress={() => router.push(`/ai-doubt/${t.id}`)}
                style={s.card}
                testID={`aid-thread-${t.id}`}
                onLongPress={() =>
                  Alert.alert('Delete Doubt', 'This thread will be permanently deleted.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await api.aiDeleteThread(t.id);
                          setThreads((prev) => prev.filter((x) => x.id !== t.id));
                        } catch (e: any) {
                          Alert.alert('Error', e?.message || 'Failed');
                        }
                      },
                    },
                  ])
                }
              >
                <View style={[s.cardIcon, { backgroundColor: sub.color + '18' }]}>
                  <Ionicons name={sub.icon as any} size={16} color={sub.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle} numberOfLines={1}>{t.title}</Text>
                  {t.last_message ? (
                    <Text style={s.cardMsg} numberOfLines={1}>{t.last_message.replace(/[\*#]/g, '')}</Text>
                  ) : null}
                  <View style={s.cardMeta}>
                    <View style={[s.subjPill, { backgroundColor: sub.color + '18' }]}>
                      <Text style={[s.subjPillTxt, { color: sub.color }]}>{sub.label}</Text>
                    </View>
                    <Text style={s.cardTime}>
                      {new Date(t.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </Text>
                    <Text style={s.cardMsgs}>{t.message_count || 0} msgs</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surfaceSecondary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 6, paddingBottom: 10 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  title: { color: '#FFF', fontSize: 19, fontWeight: '900' },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 11.5, fontWeight: '600', marginTop: 2 },
  pickLbl: { color: 'rgba(255,255,255,0.8)', fontSize: 10.5, fontWeight: '800', letterSpacing: 1, marginBottom: 8, marginTop: 6 },
  subjChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999 },
  subjIcon: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  subjTxt: { color: '#FFF', fontSize: 12, fontWeight: '800' },

  empty: { flex: 1, alignItems: 'center', padding: 24, paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.onSurface, marginTop: 14 },
  emptySub: { fontSize: 12.5, color: theme.colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  exampleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: theme.colors.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border },
  exampleTxt: { fontSize: 12, color: theme.colors.onSurfaceSecondary, fontWeight: '600', flex: 1 },

  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.surface, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border },
  cardIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 13.5, fontWeight: '800', color: theme.colors.onSurface },
  cardMsg: { fontSize: 11.5, color: theme.colors.muted, fontWeight: '600', marginTop: 3 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  subjPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  subjPillTxt: { fontSize: 9.5, fontWeight: '900' },
  cardTime: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '700' },
  cardMsgs: { fontSize: 10.5, color: theme.colors.brand, fontWeight: '800' },
});
