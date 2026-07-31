import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { useCategory } from '@/src/CategoryContext';

const CATS = ['All', 'National', 'International', 'Economy', 'Science', 'Sports', 'Awards'];

export default function CurrentAffairs() {
  const router = useRouter();
  const { categoryId } = useCategory();
  const [items, setItems] = useState<any[]>([]);
  const [cat, setCat] = useState('All');

  useEffect(() => { (async () => setItems((await api.currentAffairs(categoryId || undefined)).articles))(); }, [categoryId]);
  const filtered = cat === 'All' ? items : items.filter((i) => i.category === cat);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <SafeAreaView edges={['top']} style={s.header}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.date}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
            <Text style={s.title}>Daily Current Affairs</Text>
          </View>
          <Pressable style={s.dlBtn} testID="download-pdf">
            <Ionicons name="download-outline" size={18} color={theme.colors.brand} />
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
          {CATS.map((c) => (
            <Pressable key={c} testID={`ca-filter-${c}`} style={[s.chip, cat === c && s.chipActive]} onPress={() => setCat(c)}>
              <Text style={[s.chipText, cat === c && s.chipTextActive]}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 140 }}
        renderItem={({ item, index }) =>
          index === 0 ? (
            <Pressable testID={`ca-${item.id}`} style={s.featured} onPress={() => router.push('/(tabs)/current-affairs')}>
              <Image source={{ uri: item.image }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
              <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.9)']} style={StyleSheet.absoluteFillObject} />
              <View style={s.featuredContent}>
                <View style={s.catTag}><Text style={s.catTagText}>{item.category.toUpperCase()}</Text></View>
                <Text style={s.featuredTitle}>{item.title}</Text>
                <Text style={s.featuredSummary} numberOfLines={2}>{item.summary}</Text>
                <Text style={s.featuredDate}>{item.date}</Text>
              </View>
            </Pressable>
          ) : (
            <Pressable testID={`ca-${item.id}`} style={s.newsCard}>
              <Image source={{ uri: item.image }} style={s.newsImage} contentFit="cover" />
              <View style={{ flex: 1, padding: 12 }}>
                <View style={s.newsCatTag}><Text style={s.newsCatTagText}>{item.category}</Text></View>
                <Text style={s.newsTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={s.newsDate}>{item.date}</Text>
              </View>
            </Pressable>
          )
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: theme.spacing.lg, paddingBottom: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 },
  date: { fontSize: 12, color: theme.colors.muted, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '800', color: theme.colors.onSurface, marginTop: 2 },
  dlBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  chipsRow: { paddingVertical: 12, gap: 8 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: theme.colors.surfaceSecondary, borderWidth: 1, borderColor: theme.colors.border, justifyContent: 'center', flexShrink: 0 },
  chipActive: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
  chipText: { fontSize: 13, color: theme.colors.onSurfaceSecondary, fontWeight: '600' },
  chipTextActive: { color: '#FFF' },
  featured: { height: 240, borderRadius: 22, overflow: 'hidden', marginBottom: 16, backgroundColor: '#000', ...(theme.shadow.card as object) },
  featuredContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18 },
  catTag: { alignSelf: 'flex-start', backgroundColor: theme.colors.gold, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginBottom: 10 },
  catTagText: { fontSize: 10, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  featuredTitle: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  featuredSummary: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 6 },
  featuredDate: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 8, fontWeight: '600' },
  newsCard: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: 18, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border, ...(theme.shadow.soft as object) },
  newsImage: { width: 110, height: 110 },
  newsCatTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: theme.colors.brandTertiary, marginBottom: 6 },
  newsCatTagText: { fontSize: 10, fontWeight: '800', color: theme.colors.brand },
  newsTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.onSurface, lineHeight: 19 },
  newsDate: { fontSize: 11, color: theme.colors.muted, marginTop: 6, fontWeight: '600' },
});
