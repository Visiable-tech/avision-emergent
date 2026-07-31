/**
 * Category + Language selector for the Home header.
 * Uses a bottom-sheet-style Modal so it doesn't fight the tab bar's zIndex.
 */
import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCategory } from '@/src/CategoryContext';
import { useI18n, LANGUAGES } from '@/src/i18n';
import { useAuth } from '@/src/AuthContext';
import { theme } from '@/src/theme';

export function HeaderDropdowns({ testIDPrefix = 'hd' }: { testIDPrefix?: string }) {
  const { t } = useI18n();
  const { category, categories, setCategoryId } = useCategory();
  const [showCat, setShowCat] = useState(false);
  const [showLang, setShowLang] = useState(false);

  return (
    <View style={s.row}>
          <Pressable testID={`${testIDPrefix}-category-btn`} style={s.chip} onPress={() => setShowCat(true)}>
        <Ionicons name={(category?.icon as any) || 'apps-outline'} size={14} color={theme.colors.brand} />
        <Text style={s.chipTxt} numberOfLines={1}>{category?.name || t('selectCategory')}</Text>
        <Ionicons name="chevron-down" size={14} color={theme.colors.brand} />
      </Pressable>
      <Pressable testID={`${testIDPrefix}-lang-btn`} style={s.langChip} onPress={() => setShowLang(true)}>
        <Ionicons name="language-outline" size={14} color={theme.colors.brand} />
        <Ionicons name="chevron-down" size={14} color={theme.colors.brand} />
      </Pressable>

      <CategorySheet
        visible={showCat}
        onClose={() => setShowCat(false)}
        categories={categories}
        currentId={category?.id}
        onSelect={async (id) => { await setCategoryId(id, true); setShowCat(false); }}
      />
      <LanguageSheet visible={showLang} onClose={() => setShowLang(false)} />
    </View>
  );
}

function CategorySheet({ visible, onClose, categories, currentId, onSelect }: any) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const filtered = query.trim()
    ? categories.filter((c: any) => c.name.toLowerCase().includes(query.toLowerCase()) ||
        (c.subtitle || '').toLowerCase().includes(query.toLowerCase()))
    : categories;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.sheetHandle} />
        <Text style={s.sheetTitle}>{t('changeCategory')}</Text>
        <View style={s.searchWrap}>
          <Ionicons name="search" size={16} color={theme.colors.muted} />
          <TextInput
            testID="hd-cat-search"
            style={s.searchInput}
            placeholder={t('categorySearchPlaceholder')}
            placeholderTextColor={theme.colors.mutedLight}
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <ScrollView style={{ maxHeight: 420 }}>
          {filtered.length === 0 && (
            <Text style={s.empty}>{t('noCategoryFound')}</Text>
          )}
          {filtered.map((c: any) => {
            const active = c.id === currentId;
            return (
              <Pressable
                key={c.id}
                testID={`hd-cat-${c.id}`}
                style={[s.catRow, active && s.catRowActive]}
                onPress={() => onSelect(c.id)}
              >
                <View style={[s.catIcon, active && { backgroundColor: theme.colors.brand }]}>
                  <Ionicons name={c.icon as any} size={18} color={active ? '#FFF' : theme.colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.catName, active && { color: theme.colors.brand }]}>{c.name}</Text>
                  {c.subtitle ? <Text style={s.catSub} numberOfLines={1}>{c.subtitle}</Text> : null}
                </View>
                {active && <Ionicons name="checkmark-circle" size={22} color={theme.colors.brand} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

function LanguageSheet({ visible, onClose }: any) {
  const { t, lang, setLang } = useI18n();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.sheetHandle} />
        <Text style={s.sheetTitle}>{t('language')}</Text>
        {LANGUAGES.map((L) => {
          const active = L.code === lang;
          return (
            <Pressable
              key={L.code}
              testID={`hd-lang-${L.code}`}
              style={[s.langRow, active && s.langRowActive]}
              onPress={async () => { await setLang(L.code); onClose(); }}
            >
              <Text style={s.flag}>{L.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.langName, active && { color: theme.colors.brand }]}>{L.native}</Text>
                <Text style={s.langSub}>{L.label}</Text>
              </View>
              {active && <Ionicons name="checkmark-circle" size={22} color={theme.colors.brand} />}
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginTop: 4 },
  chip: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: theme.colors.brandTertiary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, maxWidth: 170 },
  chipTxt: { fontSize: 12, fontWeight: '700', color: theme.colors.brand },
  langChip: { flexDirection: 'row', gap: 4, alignItems: 'center', backgroundColor: theme.colors.brandTertiary, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 999 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '85%' },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.onSurface, marginBottom: 14 },
  searchWrap: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: theme.colors.surfaceSecondary, borderRadius: 12, paddingHorizontal: 12, height: 44, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.onSurface },
  empty: { textAlign: 'center', color: theme.colors.muted, padding: 20 },
  catRow: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 14 },
  catRowActive: { backgroundColor: theme.colors.brandTertiary },
  catIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 14, fontWeight: '700', color: theme.colors.onSurface },
  catSub: { fontSize: 11, color: theme.colors.muted, marginTop: 2 },
  langRow: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10, borderRadius: 14 },
  langRowActive: { backgroundColor: theme.colors.brandTertiary },
  flag: { fontSize: 24 },
  langName: { fontSize: 15, fontWeight: '700', color: theme.colors.onSurface },
  langSub: { fontSize: 11, color: theme.colors.muted },
});
