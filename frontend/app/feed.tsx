import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { useCategory } from '@/src/CategoryContext';
import { useAuth } from '@/src/AuthContext';
import { useI18n } from '@/src/i18n';

const TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
  motivation: { label: 'MOTIVATION', color: '#7C3AED', icon: 'flash' },
  tip: { label: 'TIP', color: '#0B4DB8', icon: 'bulb' },
  infographic: { label: 'INFOGRAPHIC', color: '#C68A2D', icon: 'image' },
  'current-affairs': { label: 'CURRENT AFFAIRS', color: '#EF4444', icon: 'newspaper' },
  notice: { label: 'NOTICE', color: '#10B981', icon: 'megaphone' },
};

export default function FeedScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useAuth();
  const { categoryId } = useCategory();
  const [posts, setPosts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.feed(categoryId || undefined, user?.user_id);
      setPosts(r.posts || []);
    } catch (e) { console.warn('feed load', e); }
  }, [categoryId, user?.user_id]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surfaceSecondary }}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={s.header}>
        <View style={s.headerRow}>
          <Pressable onPress={() => router.back()} testID="feed-back" hitSlop={12} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.onSurface} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{t('feed')}</Text>
            <Text style={s.subtitle}>Tips, motivation & notices from Avision</Text>
          </View>
          <View style={s.headerIcon}>
            <Ionicons name="sparkles" size={18} color={theme.colors.brand} />
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.brand} />}
      >
        {posts.map((p) => {
          const meta = TYPE_META[p.type] || TYPE_META.tip;
          return (
            <View key={p.id} testID={`feed-post-${p.id}`} style={s.card}>
              {/* Post header */}
              <View style={s.postHeader}>
                <View style={s.avatar}>
                  <Text style={s.avatarTxt}>{p.admin_avatar || 'A'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.author}>{p.admin_name || 'Avision Team'}</Text>
                  <Text style={s.time}>{p.publish_date}</Text>
                </View>
                <View style={[s.typePill, { backgroundColor: `${meta.color}15` }]}>
                  <Ionicons name={meta.icon as any} size={11} color={meta.color} />
                  <Text style={[s.typePillTxt, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>

              {/* Image */}
              {p.image ? (
                <Image source={{ uri: p.image }} style={s.image} contentFit="cover" transition={200} />
              ) : null}

              {/* Body */}
              <View style={s.body}>
                <Text style={s.postTitle}>{p.title}</Text>
                <Text style={s.postDesc} numberOfLines={5}>{p.description}</Text>

                {p.tags && p.tags.length > 0 && (
                  <View style={s.tagsRow}>
                    {p.tags.slice(0, 4).map((t: string) => (
                      <View key={t} style={s.tag}>
                        <Text style={s.tagTxt}>#{t}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Footer */}
              <View style={s.footer}>
                <View style={s.footStat}>
                  <Ionicons name="heart-outline" size={16} color={theme.colors.muted} />
                  <Text style={s.footStatTxt}>{p.likes ?? 0}</Text>
                </View>
                <View style={s.footStat}>
                  <Ionicons name="chatbubble-outline" size={15} color={theme.colors.muted} />
                  <Text style={s.footStatTxt}>{p.comments ?? 0}</Text>
                </View>
                <View style={{ flex: 1 }} />
                <Pressable style={s.shareBtn} testID={`feed-share-${p.id}`}>
                  <Ionicons name="share-social-outline" size={15} color={theme.colors.brand} />
                  <Text style={s.shareTxt}>Share</Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        {posts.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="reader-outline" size={44} color={theme.colors.mutedLight} />
            <Text style={s.emptyTxt}>{t('noPosts')}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 4 : 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: theme.colors.onSurface },
  subtitle: { fontSize: 12, color: theme.colors.muted, marginTop: 2 },
  headerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: theme.colors.surface, borderRadius: 22, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border, ...(theme.shadow.soft as object) },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, paddingBottom: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  author: { fontSize: 13, fontWeight: '800', color: theme.colors.onSurface },
  time: { fontSize: 11, color: theme.colors.muted, marginTop: 2 },
  typePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  typePillTxt: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.4 },
  image: { width: '100%', height: 200, backgroundColor: theme.colors.surfaceTertiary },
  body: { padding: 14 },
  postTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.onSurface, lineHeight: 22 },
  postDesc: { fontSize: 13.5, color: theme.colors.onSurfaceSecondary, marginTop: 8, lineHeight: 20 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: theme.colors.brandTertiary },
  tagTxt: { fontSize: 11, color: theme.colors.brand, fontWeight: '700' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
  footStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footStatTxt: { fontSize: 12, color: theme.colors.muted, fontWeight: '700' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.brandTertiary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  shareTxt: { color: theme.colors.brand, fontSize: 11, fontWeight: '800' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTxt: { color: theme.colors.muted, fontSize: 13 },
});
