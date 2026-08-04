import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';

export default function FacultyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [f, setF] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!id) return;
        setF(await api.liveCourseFacultyDetail(id));
      } catch (e) {
        console.warn('faculty', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={s.loading}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }

  if (!f) {
    return (
      <View style={s.loading}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text>Faculty not found.</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[theme.colors.brand, theme.colors.brandDark]} style={s.hero}>
          <SafeAreaView edges={['top']}>
            <View style={s.topRow}>
              <Pressable onPress={() => router.back()} hitSlop={10} style={s.iconBtn} testID="faculty-back">
                <Ionicons name="chevron-back" size={22} color="#FFF" />
              </Pressable>
              <View style={{ flex: 1 }} />
            </View>
            <View style={s.heroBody}>
              <Image source={{ uri: f.avatar }} style={s.avatar} contentFit="cover" />
              <Text style={s.name}>{f.name}</Text>
              <Text style={s.title}>{f.title}</Text>
              <View style={s.metaRow}>
                <View style={s.metaPill}>
                  <Ionicons name="star" size={11} color="#FCD34D" />
                  <Text style={s.metaTxt}>{f.rating}</Text>
                </View>
                <View style={s.metaPill}>
                  <Ionicons name="briefcase-outline" size={11} color="#FFF" />
                  <Text style={s.metaTxt}>{f.experience_years} yrs</Text>
                </View>
                <View style={s.metaPill}>
                  <Ionicons name="people-outline" size={11} color="#FFF" />
                  <Text style={s.metaTxt}>{(f.students_taught / 1000).toFixed(0)}k+ students</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={s.card}>
          <Text style={s.cardTitle}>About</Text>
          <Text style={s.body}>{f.bio}</Text>
        </View>

        {f.subjects?.length ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>Subjects Taught</Text>
            <View style={s.chips}>
              {f.subjects.map((sub: string) => (
                <View key={sub} style={s.chip}>
                  <Ionicons name="book-outline" size={12} color={theme.colors.brand} />
                  <Text style={s.chipTxt}>{sub}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {f.achievements?.length ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>Achievements</Text>
            <View style={{ marginTop: 10, gap: 8 }}>
              {f.achievements.map((a: string, i: number) => (
                <View key={i} style={s.achRow}>
                  <Ionicons name="trophy" size={14} color={theme.colors.gold} />
                  <Text style={s.achTxt}>{a}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {f.courses?.length ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>Courses by {f.name.split(' ')[0]}</Text>
            <View style={{ marginTop: 10, gap: 10 }}>
              {f.courses.map((c: any) => (
                <Pressable
                  key={c.id}
                  onPress={() => router.push(`/live-courses/${c.id}`)}
                  style={s.courseRow}
                  testID={`fac-course-${c.id}`}
                >
                  <Image source={{ uri: c.banner_image }} style={s.courseThumb} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={s.courseName} numberOfLines={2}>{c.name}</Text>
                    <Text style={s.courseExam} numberOfLines={1}>{c.exam_name}</Text>
                    <View style={s.priceRow}>
                      <Text style={s.priceMain}>₹{c.offer_price.toLocaleString('en-IN')}</Text>
                      <Text style={s.priceStrike}>₹{c.price.toLocaleString('en-IN')}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surfaceSecondary },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 6, paddingBottom: 12 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  heroBody: { alignItems: 'center', paddingTop: 6 },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  name: { color: '#FFF', fontSize: 22, fontWeight: '900', marginTop: 12 },
  title: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '700', marginTop: 4, textAlign: 'center' },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  metaTxt: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  card: { backgroundColor: theme.colors.surface, marginHorizontal: 16, borderRadius: 18, padding: 14, marginTop: 12, borderWidth: 1, borderColor: theme.colors.border },
  cardTitle: { fontSize: 16, fontWeight: '900', color: theme.colors.onSurface },
  body: { fontSize: 13, color: theme.colors.onSurfaceSecondary, marginTop: 8, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.colors.brandTertiary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  chipTxt: { color: theme.colors.brand, fontSize: 11.5, fontWeight: '800' },
  achRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  achTxt: { flex: 1, fontSize: 12.5, color: theme.colors.onSurface, fontWeight: '600' },
  courseRow: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: theme.colors.surfaceSecondary, padding: 10, borderRadius: 14 },
  courseThumb: { width: 60, height: 60, borderRadius: 10 },
  courseName: { fontSize: 13, fontWeight: '900', color: theme.colors.onSurface },
  courseExam: { fontSize: 11, color: theme.colors.muted, fontWeight: '700', marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
  priceMain: { fontSize: 13, fontWeight: '900', color: theme.colors.brand },
  priceStrike: { fontSize: 10, color: theme.colors.muted, textDecorationLine: 'line-through', fontWeight: '700' },
});
