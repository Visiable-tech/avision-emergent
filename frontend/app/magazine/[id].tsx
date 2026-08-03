import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  StatusBar as RNStatusBar,
  ActivityIndicator,
  Image,
  Modal,
  Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { api } from '@/src/api';

type Article = {
  id: string;
  issue_id: string;
  kind: string;
  title: string;
  author: string;
  read_time_min: number;
  cover: string;
  excerpt: string;
  body: string;
};

type Issue = {
  id: string;
  title: string;
  subtitle: string;
  month: string;
  cover_color: string;
  cover_accent: string;
  cover_image?: string;
  editorial: string;
  issue_no: number;
  pages: number;
  read_time_min: number;
  articles: Article[];
};

const KIND_META: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  editorial: { color: '#DC2626', bg: '#FEE2E2', label: 'EDITORIAL', icon: 'star' },
  guide: { color: '#2563EB', bg: '#DBEAFE', label: 'GUIDE', icon: 'compass' },
  'career-guide': { color: '#7C3AED', bg: '#EDE9FE', label: 'CAREER', icon: 'briefcase' },
  'topper-interview': { color: '#F59E0B', bg: '#FEF3C7', label: 'TOPPER TALK', icon: 'trophy' },
  'expert-column': { color: '#059669', bg: '#D1FAE5', label: 'EXPERT COLUMN', icon: 'chatbubbles' },
};

export default function MagazineIssue() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [reading, setReading] = useState<Article | null>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const i = await api.magazineIssue(id);
        setIssue(i);
      } catch {}
    })();
  }, [id]);

  const shareArticle = () => {
    if (!reading) return;
    try {
      Share.share({
        message: `📖 "${reading.title}" by ${reading.author} — from Avision Monthly, ${issue?.month || ''}. Read the full article on the Avision app.`,
      });
    } catch {}
  };

  if (!issue) {
    return (
      <View style={s.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color="#DC2626" size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* HERO */}
      <LinearGradient colors={[issue.cover_color, issue.cover_accent]} style={s.hero}>
        <SafeAreaView edges={['top']}>
          <View style={s.headRow}>
            <Pressable onPress={() => router.back()} hitSlop={12} style={s.iconBtn} testID="mi-back">
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </Pressable>
            <Text style={s.headTxt}>ISSUE #{issue.issue_no}</Text>
            <View style={{ width: 38 }} />
          </View>

          <View style={s.heroBody}>
            <Text style={s.month}>{issue.month.toUpperCase()}</Text>
            <Text style={s.title}>{issue.title}</Text>
            <Text style={s.subtitle}>{issue.subtitle}</Text>
            <View style={s.metaRow}>
              <View style={s.metaChip}>
                <MaterialCommunityIcons name="file-document" size={11} color="#FFF" />
                <Text style={s.metaChipTxt}>{issue.pages} pages</Text>
              </View>
              <View style={s.metaChip}>
                <Ionicons name="time-outline" size={11} color="#FFF" />
                <Text style={s.metaChipTxt}>{issue.read_time_min} min</Text>
              </View>
              <View style={s.metaChip}>
                <Ionicons name="library-outline" size={11} color="#FFF" />
                <Text style={s.metaChipTxt}>{issue.articles?.length ?? 0} articles</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* EDITORIAL SUMMARY */}
        <View style={s.editorial}>
          <View style={s.editorialTag}>
            <MaterialCommunityIcons name="feather" size={12} color="#DC2626" />
            <Text style={s.editorialTagTxt}>FROM THE EDITOR</Text>
          </View>
          <Text style={s.editorialTxt}>{issue.editorial}</Text>
        </View>

        {/* IN THIS ISSUE */}
        <Text style={s.sectionTitle}>In this issue</Text>
        {(issue.articles || []).map((a, i) => {
          const meta = KIND_META[a.kind] || KIND_META.guide;
          return (
            <Pressable
              key={a.id}
              onPress={() => setReading(a)}
              style={s.artCard}
              testID={`mi-art-${a.id}`}
            >
              <Image source={{ uri: a.cover }} style={s.artCover} />
              <View style={{ flex: 1, padding: 12 }}>
                <View style={[s.kindBadge, { backgroundColor: meta.bg }]}>
                  <Ionicons name={meta.icon as any} size={10} color={meta.color} />
                  <Text style={[s.kindBadgeTxt, { color: meta.color }]}>{meta.label}</Text>
                </View>
                <Text style={s.artTitle} numberOfLines={3}>{a.title}</Text>
                <Text style={s.artMeta}>
                  <Text style={s.artAuthor}>{a.author}</Text>
                  <Text style={{ color: '#94A3B8' }}>  ·  {a.read_time_min} min read</Text>
                </Text>
              </View>
              <View style={s.artArrow}>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* READER MODAL */}
      <Modal visible={!!reading} animationType="slide" onRequestClose={() => setReading(null)}>
        {reading && (
          <View style={{ flex: 1, backgroundColor: '#FFF' }}>
            <SafeAreaView edges={['top']} style={s.readerTop}>
              <Pressable onPress={() => setReading(null)} hitSlop={10} style={s.iconBtnLite} testID="mi-close-reader">
                <Ionicons name="chevron-back" size={22} color="#0F172A" />
              </Pressable>
              <Text style={s.readerTop_} numberOfLines={1}>{issue.title}</Text>
              <Pressable onPress={shareArticle} hitSlop={10} style={s.iconBtnLite} testID="mi-share">
                <Ionicons name="share-outline" size={20} color="#0F172A" />
              </Pressable>
            </SafeAreaView>

            <ScrollView
              contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
              showsVerticalScrollIndicator={false}
            >
              <Image source={{ uri: reading.cover }} style={s.readerCover} />
              <View style={{ padding: 20 }}>
                {(() => {
                  const meta = KIND_META[reading.kind] || KIND_META.guide;
                  return (
                    <View style={[s.kindBadge, { backgroundColor: meta.bg, alignSelf: 'flex-start' }]}>
                      <Ionicons name={meta.icon as any} size={11} color={meta.color} />
                      <Text style={[s.kindBadgeTxt, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                  );
                })()}
                <Text style={s.readerTitle}>{reading.title}</Text>
                <View style={s.readerMeta}>
                  <MaterialCommunityIcons name="account-circle" size={16} color="#64748B" />
                  <Text style={s.readerAuthor}>{reading.author}</Text>
                  <View style={s.dot} />
                  <Ionicons name="time-outline" size={12} color="#64748B" />
                  <Text style={s.readerReadTime}>{reading.read_time_min} min read</Text>
                </View>

                <Text style={s.readerExcerpt}>{reading.excerpt}</Text>

                {reading.body.split('\n\n').map((para, i) => (
                  <Text key={i} style={s.readerPara}>{para}</Text>
                ))}

                <View style={s.endRule}>
                  <View style={s.endDot} />
                  <View style={s.endDot} />
                  <View style={s.endDot} />
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 6 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.20)' },
  headTxt: { flex: 1, textAlign: 'center', color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },

  heroBody: { marginTop: 16, paddingHorizontal: 4 },
  month: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: '#FFF', fontSize: 24, fontWeight: '900', marginTop: 4 },
  subtitle: { color: 'rgba(255,255,255,0.95)', fontSize: 14, fontWeight: '700', marginTop: 3 },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 14, flexWrap: 'wrap' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  metaChipTxt: { color: '#FFF', fontSize: 10.5, fontWeight: '800' },

  editorial: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#EEF2F7', marginTop: -14 },
  editorialTag: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  editorialTagTxt: { color: '#DC2626', fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  editorialTxt: { fontSize: 13.5, color: '#0F172A', lineHeight: 22, marginTop: 10, fontWeight: '500' },

  sectionTitle: { fontSize: 15, fontWeight: '900', color: '#0F172A', marginTop: 20, marginBottom: 12 },

  artCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    marginBottom: 10,
    overflow: 'hidden',
    alignItems: 'center',
  },
  artCover: { width: 90, height: 100, backgroundColor: '#E2E8F0' },
  kindBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, marginBottom: 6 },
  kindBadgeTxt: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  artTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A', lineHeight: 17 },
  artMeta: { fontSize: 11, marginTop: 5 },
  artAuthor: { color: '#0F172A', fontWeight: '700' },
  artArrow: { paddingHorizontal: 6 },

  // Reader
  readerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
    backgroundColor: '#FFF',
    gap: 6,
  },
  iconBtnLite: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  readerTop_: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '900', color: '#0F172A' },
  readerCover: { width: '100%', height: 220, backgroundColor: '#E2E8F0' },
  readerTitle: { fontSize: 24, fontWeight: '900', color: '#0F172A', marginTop: 12, lineHeight: 32 },
  readerMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, flexWrap: 'wrap' },
  readerAuthor: { color: '#0F172A', fontSize: 12.5, fontWeight: '800' },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#CBD5E1' },
  readerReadTime: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  readerExcerpt: {
    fontSize: 15,
    color: '#0F172A',
    lineHeight: 24,
    fontStyle: 'italic',
    fontWeight: '500',
    marginTop: 16,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
  },
  readerPara: { fontSize: 14.5, color: '#0F172A', lineHeight: 26, marginTop: 14, fontWeight: '400' },
  endRule: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 24 },
  endDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#CBD5E1' },
});
