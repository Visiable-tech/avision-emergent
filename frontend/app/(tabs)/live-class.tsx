import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { useCategory } from '@/src/CategoryContext';
import { useI18n } from '@/src/i18n';

export default function LiveClassScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { categoryId } = useCategory();
  const [live, setLive] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const l = await api.liveClasses(categoryId || undefined);
      setLive(l.classes || []);
    } catch (e) { console.warn('live load', e); }
  }, [categoryId]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const liveNow = live.filter((l) => l.status === 'live');
  const upcoming = live.filter((l) => l.status !== 'live');

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <SafeAreaView edges={['top']} style={s.header}>
        <Text style={s.title}>{t('liveClass')}</Text>
        <Text style={s.subtitle}>Watch live sessions from top educators</Text>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.brand} />}
      >
        {liveNow.length > 0 && (
          <>
            <View style={s.sectionHeader}>
              <View style={s.liveDotBig} />
              <Text style={s.section}>{t('liveNow')}</Text>
            </View>
            {liveNow.map((l) => (
              <Pressable key={l.id} testID={`live-now-${l.id}`} style={s.bigCard} onPress={() => router.push(`/live/${l.id}`)}>
                <Image source={{ uri: l.thumbnail }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.9)']} style={StyleSheet.absoluteFillObject} />
                <View style={s.liveBadge}><View style={s.liveDot} /><Text style={s.liveBadgeText}>LIVE</Text></View>
                <View style={s.bigCardBottom}>
                  <Text style={s.bigTitle} numberOfLines={2}>{l.title}</Text>
                  <Text style={s.bigMeta}>{l.instructor} • {l.time}</Text>
                  <View style={s.joinBtn}>
                    <Ionicons name="play" size={14} color="#FFF" />
                    <Text style={s.joinBtnTxt}>{t('joinLive')}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </>
        )}

        {upcoming.length > 0 && (
          <>
            <View style={[s.sectionHeader, { marginTop: 24 }]}>
              <Ionicons name="time-outline" size={18} color={theme.colors.brand} />
              <Text style={s.section}>{t('upcoming')}</Text>
            </View>
            {upcoming.map((l) => (
              <Pressable key={l.id} testID={`live-upcoming-${l.id}`} style={s.upCard} onPress={() => router.push(`/live/${l.id}`)}>
                <Image source={{ uri: l.thumbnail }} style={s.upThumb} contentFit="cover" />
                <View style={{ flex: 1, padding: 12 }}>
                  <Text style={s.upTitle} numberOfLines={2}>{l.title}</Text>
                  <Text style={s.upInstr}>{l.instructor}</Text>
                  <View style={s.upMetaRow}>
                    <Ionicons name="calendar-outline" size={13} color={theme.colors.muted} />
                    <Text style={s.upMeta}>{l.time}</Text>
                  </View>
                  <View style={s.reminderBtn}>
                    <Ionicons name="notifications-outline" size={13} color={theme.colors.brand} />
                    <Text style={s.reminderTxt}>{t('setReminder')}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </>
        )}

        {live.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="videocam-off-outline" size={44} color={theme.colors.mutedLight} />
            <Text style={s.emptyTxt}>{t('emptyContent')}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: theme.spacing.lg, paddingBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', color: theme.colors.onSurface, marginTop: 8 },
  subtitle: { fontSize: 13, color: theme.colors.muted, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  section: { fontSize: 18, fontWeight: '800', color: theme.colors.onSurface },
  liveDotBig: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.live },
  bigCard: { width: '100%', height: 220, borderRadius: 22, overflow: 'hidden', marginBottom: 14, backgroundColor: '#111', ...(theme.shadow.card as object) },
  liveBadge: { position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.live, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFF' },
  liveBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  bigCardBottom: { position: 'absolute', left: 14, right: 14, bottom: 14 },
  bigTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  bigMeta: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 4 },
  joinBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.brand, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, marginTop: 10 },
  joinBtnTxt: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  upCard: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: 18, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border, ...(theme.shadow.soft as object) },
  upThumb: { width: 120, height: '100%', minHeight: 120 },
  upTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.onSurface },
  upInstr: { fontSize: 12, color: theme.colors.muted, marginTop: 4 },
  upMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  upMeta: { fontSize: 12, color: theme.colors.onSurfaceSecondary, fontWeight: '600' },
  reminderBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.brandTertiary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, marginTop: 8 },
  reminderTxt: { color: theme.colors.brand, fontWeight: '800', fontSize: 11 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTxt: { color: theme.colors.muted, fontSize: 13 },
});
