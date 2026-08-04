import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';

export default function MyVideoCourses() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.vcMyEnrollments();
      setItems(r.enrollments || []);
    } catch { /* not logged in */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={s.title}>My Video Courses</Text>
        <View style={{ width: 36 }} />
      </SafeAreaView>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={theme.colors.brand} /></View>
      ) : items.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="videocam-outline" size={54} color={theme.colors.mutedLight} />
          <Text style={s.emptyTitle}>No enrolled courses yet</Text>
          <Text style={s.emptySub}>Explore our video course catalog and start learning today.</Text>
          <Pressable style={s.cta} onPress={() => router.back()}>
            <Text style={s.ctaTxt}>Browse Courses</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.brand} />}
        >
          {items.map((e: any) => (
            <Pressable
              key={e.id}
              style={s.card}
              onPress={() => router.push(`/video-courses/${e.course_id}`)}
            >
              {e.course?.banner_image ? (
                <Image source={{ uri: e.course.banner_image }} style={s.thumb} contentFit="cover" />
              ) : (
                <View style={[s.thumb, { backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="videocam" size={26} color={theme.colors.brand} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.cardName} numberOfLines={2}>{e.course_name}</Text>
                <View style={s.bar}><View style={[s.fill, { width: `${e.progress_pct || 0}%` }]} /></View>
                <Text style={s.meta}>{e.progress_pct || 0}% complete • {e.videos_watched || 0} videos watched</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surfaceSecondary },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8, backgroundColor: theme.colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 17, fontWeight: '900', color: theme.colors.onSurface, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '900', color: theme.colors.onSurface, marginTop: 12 },
  emptySub: { fontSize: 12.5, color: theme.colors.muted, fontWeight: '700', textAlign: 'center' },
  cta: { marginTop: 12, paddingHorizontal: 22, paddingVertical: 12, backgroundColor: theme.colors.brand, borderRadius: 14 },
  ctaTxt: { color: '#FFF', fontSize: 13, fontWeight: '900' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.surface, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border },
  thumb: { width: 68, height: 68, borderRadius: 12 },
  cardName: { fontSize: 13.5, fontWeight: '900', color: theme.colors.onSurface },
  bar: { height: 5, backgroundColor: theme.colors.surfaceSecondary, borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: theme.colors.gold },
  meta: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '700', marginTop: 4 },
});
