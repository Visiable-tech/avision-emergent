import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
  StatusBar as RNStatusBar,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';

const { width: SCREEN_W } = Dimensions.get('window');
const COVER_W = (SCREEN_W - 48) / 2;
const COVER_H = COVER_W * 1.42;

type Issue = {
  id: string;
  title: string;
  subtitle: string;
  month: string;
  cover_color: string;
  cover_accent: string;
  cover_image?: string;
  editorial: string;
  category_id?: string | null;
  issue_no: number;
  pages: number;
  read_time_min: number;
};

export default function MagazineHome() {
  const router = useRouter();
  const { user } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const cat = (user as any)?.category_id || undefined;
      const r = await api.magazines(cat);
      setIssues(r.issues || []);
    } catch {}
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const [latest, ...older] = issues;

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient colors={['#DC2626', '#F59E0B']} style={s.hero}>
        <SafeAreaView edges={['top']}>
          <View style={s.headRow}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={s.iconBtn} testID="mag-back">
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </Pressable>
            <View style={{ flex: 1, marginHorizontal: 8 }}>
              <View style={s.brandChip}>
                <MaterialCommunityIcons name="book-open-page-variant" size={11} color="#B45309" />
                <Text style={s.brandTxt}>AVISION MONTHLY</Text>
              </View>
              <Text style={s.title}>The Magazine</Text>
              <Text style={s.sub}>Curated for aspirants — every month.</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color="#DC2626" size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DC2626" />}
          showsVerticalScrollIndicator={false}
        >
          {/* LATEST ISSUE — big feature card */}
          {latest && (
            <View style={{ paddingHorizontal: 16, marginTop: -12 }}>
              <Pressable
                onPress={() => router.push(`/magazine/${latest.id}` as any)}
                style={s.featureCard}
                testID={`mag-feat-${latest.id}`}
              >
                <LinearGradient
                  colors={[latest.cover_color, latest.cover_accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.featureCover}
                >
                  {latest.cover_image ? (
                    <Image source={{ uri: latest.cover_image }} style={s.featureImg} />
                  ) : null}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                    style={s.featureOverlay}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                  />
                  <View style={s.featureBadge}>
                    <MaterialCommunityIcons name="star" size={11} color="#FCD34D" />
                    <Text style={s.featureBadgeTxt}>LATEST ISSUE</Text>
                  </View>
                  <View style={s.featureText}>
                    <Text style={s.featureIssue}>ISSUE #{latest.issue_no}  ·  {latest.month}</Text>
                    <Text style={s.featureTitle}>{latest.title}</Text>
                    <Text style={s.featureSubtitle}>{latest.subtitle}</Text>
                  </View>
                </LinearGradient>
                <View style={s.featureMeta}>
                  <View style={s.featureMetaItem}>
                    <MaterialCommunityIcons name="file-document" size={13} color="#64748B" />
                    <Text style={s.featureMetaTxt}>{latest.pages} pages</Text>
                  </View>
                  <View style={s.featureMetaItem}>
                    <Ionicons name="time-outline" size={13} color="#64748B" />
                    <Text style={s.featureMetaTxt}>{latest.read_time_min} min read</Text>
                  </View>
                  <View style={{ flex: 1 }} />
                  <View style={s.readBtn}>
                    <Text style={s.readBtnTxt}>READ NOW</Text>
                    <Ionicons name="arrow-forward" size={12} color="#FFF" />
                  </View>
                </View>
              </Pressable>
            </View>
          )}

          {/* OLDER ISSUES — magazine grid */}
          {older.length > 0 && (
            <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
              <Text style={s.sectionTitle}>Past Issues</Text>
              <View style={s.grid}>
                {older.map((iss) => (
                  <Pressable
                    key={iss.id}
                    onPress={() => router.push(`/magazine/${iss.id}` as any)}
                    style={s.gridItem}
                    testID={`mag-item-${iss.id}`}
                  >
                    <LinearGradient
                      colors={[iss.cover_color, iss.cover_accent]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={s.gridCover}
                    >
                      {iss.cover_image ? (
                        <Image source={{ uri: iss.cover_image }} style={s.gridImg} />
                      ) : null}
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.65)']}
                        style={s.gridOverlay}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                      />
                      <View style={s.gridIssue}>
                        <Text style={s.gridIssueTxt}>#{iss.issue_no}</Text>
                      </View>
                      <View style={s.gridText}>
                        <Text style={s.gridMonth}>{iss.month}</Text>
                        <Text style={s.gridTitle} numberOfLines={2}>{iss.subtitle}</Text>
                      </View>
                    </LinearGradient>
                    <View style={s.gridFooter}>
                      <Ionicons name="time-outline" size={11} color="#94A3B8" />
                      <Text style={s.gridFooterTxt}>{iss.read_time_min}m  ·  {iss.pages}p</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 6 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.20)' },
  brandChip: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  brandTxt: { color: '#B45309', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.8 },
  title: { color: '#FFF', fontSize: 22, fontWeight: '900', marginTop: 8 },
  sub: { color: 'rgba(255,255,255,0.9)', fontSize: 12.5, marginTop: 2, fontWeight: '600' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  featureCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEF2F7',
    ...Platform.select({
      ios: { shadowColor: '#0B4DB8', shadowOpacity: 0.10, shadowOffset: { width: 0, height: 8 }, shadowRadius: 18 },
      android: { elevation: 4 },
    }),
  },
  featureCover: { height: 240, position: 'relative' },
  featureImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.42 },
  featureOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  featureBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  featureBadgeTxt: { color: '#FCD34D', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.6 },
  featureText: { position: 'absolute', bottom: 18, left: 16, right: 16 },
  featureIssue: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  featureTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', marginTop: 6 },
  featureSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 3, fontWeight: '700' },

  featureMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  featureMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  featureMetaTxt: { fontSize: 11, color: '#64748B', fontWeight: '700' },
  readBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  readBtnTxt: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },

  sectionTitle: { fontSize: 15, fontWeight: '900', color: '#0F172A', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between' },
  gridItem: { width: COVER_W },
  gridCover: { width: COVER_W, height: COVER_H, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  gridImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.45 },
  gridOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  gridIssue: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  gridIssueTxt: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  gridText: { position: 'absolute', bottom: 12, left: 12, right: 12 },
  gridMonth: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  gridTitle: { color: '#FFF', fontSize: 13, fontWeight: '900', marginTop: 3, lineHeight: 17 },
  gridFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  gridFooterTxt: { fontSize: 10.5, color: '#64748B', fontWeight: '700' },
});
