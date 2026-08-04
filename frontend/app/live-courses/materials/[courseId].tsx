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
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';

type Material = {
  id: string;
  subject: string;
  topic: string;
  title: string;
  type: string;
  type_label: string;
  icon: string;
  color: string;
  url: string;
  file_size_kb: number;
  page_count: number;
  language: string;
  downloads_count: number;
  is_downloaded?: boolean;
};

type SubjectGroup = {
  subject: string;
  count: number;
  size_kb: number;
  types: string[];
  materials: Material[];
  downloaded_count: number;
};

export default function StudyMaterials() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const [summary, setSummary] = useState<any>(null);
  const [subjects, setSubjects] = useState<SubjectGroup[]>([]);
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!courseId) return;
    try {
      const s = await api.studyMaterialsSummary(courseId);
      setSummary(s);
      setSubjects(s.subjects || []);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [courseId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openMaterial = async (m: Material) => {
    try {
      const doc = await api.studyMaterialOpen(m.id);
      const url = doc.url;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot open', 'The PDF viewer is not available.');
      }
      // Update UI counters
      setSubjects((prev) =>
        prev.map((g) => ({
          ...g,
          materials: g.materials.map((mm) => (mm.id === m.id ? { ...mm, is_downloaded: true, downloads_count: doc.downloads_count } : mm)),
          downloaded_count: g.materials.some((mm) => mm.id === m.id && !mm.is_downloaded) ? g.downloaded_count + 1 : g.downloaded_count,
        })),
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to open material');
    }
  };

  const typeOptions = [
    { id: 'pdf', label: 'Notes', icon: 'document-text', color: '#EF4444' },
    { id: 'handout', label: 'Handouts', icon: 'reader', color: '#0B4DB8' },
    { id: 'formula', label: 'Formulas', icon: 'calculator', color: '#7C3AED' },
    { id: 'pyq', label: 'PYQ', icon: 'trophy', color: '#F59E0B' },
  ];

  const filtered = subjects
    .filter((g) => (activeSubject ? g.subject === activeSubject : true))
    .map((g) => ({
      ...g,
      materials: g.materials.filter((m) => (activeType ? m.type === activeType : true)),
    }));

  if (loading) {
    return (
      <View style={s.loading}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={[theme.colors.brand, theme.colors.brandDark]} style={s.header}>
        <SafeAreaView edges={['top']}>
          <View style={s.headRow}>
            <Pressable onPress={() => router.back()} style={s.iconBtn} testID="sm-back">
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Study Materials</Text>
              <Text style={s.sub}>
                {summary?.total_materials || 0} PDFs • {(summary?.total_size_kb || 0) / 1024 < 1
                  ? `${summary?.total_size_kb || 0} KB`
                  : `${((summary?.total_size_kb || 0) / 1024).toFixed(1)} MB`}
              </Text>
            </View>
            <View style={s.dlChip}>
              <Ionicons name="checkmark-circle" size={12} color="#FCD34D" />
              <Text style={s.dlChipTxt}>{summary?.downloaded_count || 0} opened</Text>
            </View>
          </View>

          {/* Type filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingRight: 16, paddingTop: 6 }}
          >
            <Pressable
              onPress={() => setActiveType(null)}
              style={[s.typeChip, !activeType && s.typeChipActive]}
              testID="sm-type-all"
            >
              <Text style={[s.typeChipTxt, !activeType && s.typeChipTxtActive]}>All Types</Text>
            </Pressable>
            {typeOptions.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => setActiveType(activeType === t.id ? null : t.id)}
                style={[s.typeChip, activeType === t.id && s.typeChipActive]}
                testID={`sm-type-${t.id}`}
              >
                <Ionicons name={t.icon as any} size={12} color={activeType === t.id ? theme.colors.brand : '#FFF'} />
                <Text style={[s.typeChipTxt, activeType === t.id && s.typeChipTxtActive]}>{t.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* Subject pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, padding: 12 }}
        style={s.subBar}
      >
        <Pressable
          style={[s.subjChip, !activeSubject && s.subjChipActive]}
          onPress={() => setActiveSubject(null)}
          testID="sm-subj-all"
        >
          <Text style={[s.subjChipTxt, !activeSubject && s.subjChipTxtActive]}>All Subjects</Text>
        </Pressable>
        {subjects.map((g) => (
          <Pressable
            key={g.subject}
            style={[s.subjChip, activeSubject === g.subject && s.subjChipActive]}
            onPress={() => setActiveSubject(activeSubject === g.subject ? null : g.subject)}
            testID={`sm-subj-${g.subject.slice(0, 8)}`}
          >
            <Text style={[s.subjChipTxt, activeSubject === g.subject && s.subjChipTxtActive]}>{g.subject}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16, gap: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={theme.colors.brand}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="folder-open-outline" size={40} color={theme.colors.mutedLight} />
            <Text style={s.emptyTxt}>No materials match your filters</Text>
          </View>
        ) : (
          filtered.map((g) => {
            const isOpen = expanded[g.subject] !== false;  // default open
            return (
              <View key={g.subject} style={s.subjCard}>
                <Pressable
                  onPress={() => setExpanded((p) => ({ ...p, [g.subject]: !isOpen }))}
                  style={s.subjHead}
                  testID={`sm-group-${g.subject.slice(0, 8)}`}
                >
                  <View style={s.subjIcon}>
                    <Ionicons name="book" size={16} color={theme.colors.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.subjName}>{g.subject}</Text>
                    <Text style={s.subjMeta}>
                      {g.materials.length} materials • {g.downloaded_count}/{g.count} opened
                    </Text>
                  </View>
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.muted} />
                </Pressable>
                {isOpen && (
                  <View style={s.subjList}>
                    {g.materials.map((m) => (
                      <MaterialRow key={m.id} m={m} onOpen={() => openMaterial(m)} />
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function MaterialRow({ m, onOpen }: { m: Material; onOpen: () => void }) {
  return (
    <Pressable style={s.matRow} onPress={onOpen} testID={`sm-mat-${m.id}`}>
      <View style={[s.matIcon, { backgroundColor: m.color + '18' }]}>
        <Ionicons name={m.icon as any} size={18} color={m.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.matTitle} numberOfLines={1}>{m.title}</Text>
        <View style={s.matMetaRow}>
          <Text style={s.matType}>{m.type_label}</Text>
          <Text style={s.matDot}>•</Text>
          <Text style={s.matMeta}>{m.page_count} pgs</Text>
          <Text style={s.matDot}>•</Text>
          <Text style={s.matMeta}>{(m.file_size_kb / 1024).toFixed(1)} MB</Text>
        </View>
      </View>
      {m.is_downloaded ? (
        <View style={s.openedChip}>
          <Ionicons name="checkmark" size={10} color={theme.colors.success} />
          <Text style={s.openedTxt}>Opened</Text>
        </View>
      ) : null}
      <Pressable style={s.dlBtn} onPress={onOpen}>
        <Ionicons name={m.is_downloaded ? 'open-outline' : 'download-outline'} size={16} color="#FFF" />
      </Pressable>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surfaceSecondary },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface },
  header: { paddingHorizontal: 16, paddingBottom: 14, paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 6, paddingBottom: 10 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  title: { color: '#FFF', fontSize: 19, fontWeight: '900' },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 11.5, fontWeight: '600', marginTop: 2 },
  dlChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  dlChipTxt: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  typeChipActive: { backgroundColor: '#FFF', borderColor: '#FFF' },
  typeChipTxt: { color: '#FFF', fontSize: 11.5, fontWeight: '800' },
  typeChipTxtActive: { color: theme.colors.brand },
  subBar: { backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border, maxHeight: 56 },
  subjChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: theme.colors.surfaceSecondary, borderWidth: 1, borderColor: theme.colors.border },
  subjChipActive: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
  subjChipTxt: { fontSize: 11.5, color: theme.colors.onSurfaceSecondary, fontWeight: '700' },
  subjChipTxtActive: { color: '#FFF' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTxt: { fontSize: 13, color: theme.colors.muted, fontWeight: '700' },
  subjCard: { backgroundColor: theme.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  subjHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  subjIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  subjName: { fontSize: 14, fontWeight: '900', color: theme.colors.onSurface },
  subjMeta: { fontSize: 11, color: theme.colors.muted, fontWeight: '700', marginTop: 2 },
  subjList: { paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  matRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: theme.colors.surfaceSecondary, borderRadius: 12 },
  matIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  matTitle: { fontSize: 12.5, fontWeight: '800', color: theme.colors.onSurface },
  matMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  matType: { fontSize: 10.5, color: theme.colors.brand, fontWeight: '800' },
  matDot: { color: theme.colors.mutedLight, fontSize: 10 },
  matMeta: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '700' },
  openedChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: theme.colors.success + '18' },
  openedTxt: { color: theme.colors.success, fontSize: 10, fontWeight: '900' },
  dlBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center' },
});
