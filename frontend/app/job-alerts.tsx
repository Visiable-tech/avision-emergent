import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { useCategory } from '@/src/CategoryContext';
import { useI18n } from '@/src/i18n';

export default function JobAlerts() {
  const router = useRouter();
  const { t } = useI18n();
  const { categoryId } = useCategory();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const r: any = await api.jobAlerts(categoryId || undefined, 50);
      setJobs(r.jobs);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, [categoryId]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <SafeAreaView edges={['top']} style={s.head}>
        <View style={s.headRow}>
          <Pressable testID="jobs-back" style={s.iconBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={theme.colors.onSurface} />
          </Pressable>
          <Text style={s.title}>{t('latestJobs')}</Text>
          <View style={{ width: 38 }} />
        </View>
      </SafeAreaView>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.colors.brand} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={theme.colors.brand} />}
        >
          {jobs.length === 0 && (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <Ionicons name="briefcase-outline" size={44} color={theme.colors.mutedLight} />
              <Text style={s.empty}>{t('emptyContent')}</Text>
            </View>
          )}
          {jobs.map((j) => (
            <Pressable key={j.id} testID={`jobs-${j.id}`} style={s.card}>
              <View style={s.logo}><Text style={s.logoTxt}>{j.org_logo}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.jTitle} numberOfLines={2}>{j.title}</Text>
                <Text style={s.jOrg}>{j.organization}</Text>
                <View style={s.metaRow}>
                  <View style={s.metaCell}>
                    <Text style={s.metaLbl}>{t('posts')}</Text>
                    <Text style={s.metaVal}>{j.posts > 0 ? j.posts.toLocaleString() : '—'}</Text>
                  </View>
                  <View style={s.metaCell}>
                    <Text style={s.metaLbl}>Salary</Text>
                    <Text style={s.metaVal}>{j.salary}</Text>
                  </View>
                  <View style={s.metaCell}>
                    <Text style={s.metaLbl}>{t('lastDate')}</Text>
                    <Text style={[s.metaVal, { color: theme.colors.error }]}>{j.last_date}</Text>
                  </View>
                </View>
                <View style={s.applyBtn}>
                  <Text style={s.applyTxt}>{t('applyNow')}</Text>
                  <Ionicons name="arrow-forward" size={13} color="#FFF" />
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  head: { paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: theme.colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: theme.colors.onSurface },
  card: { flexDirection: 'row', gap: 12, padding: 14, backgroundColor: theme.colors.surface, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, ...(theme.shadow.soft as object) },
  logo: { width: 56, height: 56, borderRadius: 14, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  logoTxt: { fontSize: 12, fontWeight: '800', color: theme.colors.brand },
  jTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.onSurface },
  jOrg: { fontSize: 11, color: theme.colors.muted, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  metaCell: { flex: 1 },
  metaLbl: { fontSize: 9, fontWeight: '800', color: theme.colors.muted, letterSpacing: 0.3, textTransform: 'uppercase' },
  metaVal: { fontSize: 12, fontWeight: '700', color: theme.colors.onSurface, marginTop: 2 },
  applyBtn: { flexDirection: 'row', gap: 4, alignItems: 'center', alignSelf: 'flex-start', backgroundColor: theme.colors.brand, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, marginTop: 10 },
  applyTxt: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  empty: { fontSize: 13, color: theme.colors.muted, marginTop: 12 },
});
