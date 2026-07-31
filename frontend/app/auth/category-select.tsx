import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { useI18n } from '@/src/i18n';

type Cat = { id: string; name: string; icon: string; color: string; subtitle: string };

export default function CategorySelect() {
  const router = useRouter();
  const { t } = useI18n();
  const [cats, setCats] = useState<Cat[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.activeCategories()
      .then((r: any) => setCats(r.categories))
      .catch((e) => setErr(e.message || 'Could not load categories'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cats;
    return cats.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.subtitle || '').toLowerCase().includes(q) ||
      (c as any).id?.toLowerCase().includes(q),
    );
  }, [cats, query]);

  const goNext = () => {
    if (!selected) return;
    router.push({ pathname: '/auth/register', params: { category_id: selected } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <SafeAreaView edges={['top']} style={s.head}>
        <View style={s.headRow}>
          <Pressable testID="cs-back" style={s.iconBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={theme.colors.onSurface} />
          </Pressable>
          <View style={s.stepper}>
            <View style={[s.stepDot, s.stepDotActive]}><Text style={s.stepTxtActive}>1</Text></View>
            <View style={s.stepLine} />
            <View style={s.stepDot}><Text style={s.stepTxt}>2</Text></View>
          </View>
          <View style={{ width: 38 }} />
        </View>
        <Text style={s.title}>{t('categoryTitle')}</Text>
        <Text style={s.subtitle}>{t('categorySubtitle')}</Text>

        <View style={s.searchWrap}>
          <Ionicons name="search" size={18} color={theme.colors.muted} />
          <TextInput
            testID="cs-search"
            style={s.searchInput}
            placeholder={t('categorySearchPlaceholder')}
            placeholderTextColor={theme.colors.mutedLight}
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.colors.mutedLight} />
            </Pressable>
          )}
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.colors.brand} />
        </View>
      ) : err ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: theme.colors.error }}>{err}</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Ionicons name="search" size={40} color={theme.colors.mutedLight} />
          <Text style={s.emptyTxt}>{t('noCategoryFound')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.grid} showsVerticalScrollIndicator={false}>
          {filtered.map((c) => {
            const isSel = selected === c.id;
            return (
              <Pressable
                key={c.id}
                testID={`cat-card-${c.id}`}
                style={[s.card, isSel && s.cardActive]}
                onPress={() => setSelected(c.id)}
              >
                <View style={[s.iconWrap, { backgroundColor: isSel ? '#FFF' : theme.colors.brandTertiary }]}>
                  <Ionicons name={c.icon as any} size={26} color={isSel ? theme.colors.brand : (c.color || theme.colors.brand)} />
                </View>
                {isSel && (
                  <View style={s.checkBadge}>
                    <Ionicons name="checkmark" size={14} color="#FFF" />
                  </View>
                )}
                <Text style={[s.cardName, isSel && { color: '#FFF' }]} numberOfLines={1}>{c.name}</Text>
                <Text style={[s.cardSub, isSel && { color: 'rgba(255,255,255,0.85)' }]} numberOfLines={2}>
                  {c.subtitle}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View style={s.bar}>
        <Pressable
          testID="cs-continue"
          style={[s.cta, !selected && s.ctaDisabled]}
          disabled={!selected}
          onPress={goNext}
        >
          <Text style={s.ctaTxt}>{selected ? t('continue') : t('selectCategory')}</Text>
          {selected && <Ionicons name="arrow-forward" size={18} color="#FFF" />}
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  head: { paddingHorizontal: 20, paddingBottom: 8 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: theme.colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.surfaceTertiary, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: theme.colors.brand },
  stepTxt: { fontSize: 12, fontWeight: '800', color: theme.colors.muted },
  stepTxtActive: { fontSize: 12, fontWeight: '800', color: '#FFF' },
  stepLine: { width: 24, height: 2, backgroundColor: theme.colors.border },
  title: { fontSize: 26, fontWeight: '800', color: theme.colors.onSurface, marginTop: 16, lineHeight: 32 },
  subtitle: { fontSize: 13, color: theme.colors.muted, marginTop: 6, lineHeight: 19 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, borderRadius: 14, backgroundColor: theme.colors.surfaceSecondary, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 12, marginTop: 16 },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.onSurface, height: '100%' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16, paddingBottom: 140 },
  card: {
    width: '48%',
    minHeight: 140,
    padding: 16,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'space-between',
    ...(theme.shadow.soft as object),
  },
  cardActive: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand, ...(theme.shadow.strong as object) },
  iconWrap: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  checkBadge: { position: 'absolute', top: 12, right: 12, width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.gold, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 16, fontWeight: '800', color: theme.colors.onSurface, marginTop: 10 },
  cardSub: { fontSize: 11, color: theme.colors.muted, marginTop: 4, lineHeight: 15 },
  emptyTxt: { fontSize: 14, color: theme.colors.muted, marginTop: 12 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: '#FFF', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
  cta: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', height: 54, borderRadius: 16, backgroundColor: theme.colors.brand },
  ctaDisabled: { backgroundColor: theme.colors.mutedLight },
  ctaTxt: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
