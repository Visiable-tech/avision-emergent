import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, Platform, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { useI18n } from '@/src/i18n';

export default function JobAlertDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!id) return;
        const j = await api.jobDetail(id);
        setJob(j);
      } catch (e) { console.warn('job detail', e); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const openLink = async (url: string) => {
    if (!url || url === '#') {
      Alert.alert('Coming soon', 'The official link will be updated once available.');
      return;
    }
    try { await Linking.openURL(url); } catch { Alert.alert('Unable to open link'); }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: theme.colors.muted }}>{t('loading')}</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.mutedLight} />
        <Text style={{ color: theme.colors.muted, marginTop: 10 }}>Job alert not found.</Text>
        <Pressable onPress={() => router.back()} style={[s.applyMain, { marginTop: 16 }]}>
          <Text style={s.applyMainTxt}>{t('back')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surfaceSecondary }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Hero */}
      <LinearGradient colors={[theme.colors.brand, theme.colors.brandDark]} style={s.hero}>
        <SafeAreaView edges={['top']}>
          <View style={s.heroTopRow}>
            <Pressable onPress={() => router.back()} testID="job-back" hitSlop={12} style={s.circleBtn}>
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable style={s.circleBtn} testID="job-share">
              <Ionicons name="share-social-outline" size={18} color="#FFF" />
            </Pressable>
          </View>
          <View style={s.heroLogo}>
            <Text style={s.heroLogoTxt}>{job.org_logo}</Text>
          </View>
          <Text style={s.heroTitle}>{job.title}</Text>
          <Text style={s.heroOrg}>{job.organization}</Text>
          <View style={s.chipsRow}>
            <View style={s.chip}>
              <Ionicons name="calendar" size={12} color="#FFF" />
              <Text style={s.chipTxt}>Last: {job.last_date}</Text>
            </View>
            <View style={s.chip}>
              <Ionicons name="briefcase" size={12} color="#FFF" />
              <Text style={s.chipTxt}>{job.posts_count || job.posts || 0} posts</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Stat cards */}
        <View style={s.statGrid}>
          <StatCard icon="cash-outline" label={t('salary')} value={job.salary} />
          <StatCard icon="people-outline" label={t('totalPosts')} value={`${job.posts_count || job.posts || 0}`} />
          <StatCard icon="hourglass-outline" label={t('ageLimit')} value={job.age_limit || '—'} />
        </View>

        {/* Description */}
        {job.short_desc ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>About</Text>
            <Text style={s.body}>{job.short_desc}</Text>
          </View>
        ) : null}

        {/* Eligibility */}
        {job.eligibility ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>{t('eligibility')}</Text>
            <Text style={s.body}>{job.eligibility}</Text>
          </View>
        ) : null}

        {/* Important dates */}
        {job.important_dates?.length ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>{t('importantDates')}</Text>
            <View style={{ marginTop: 8 }}>
              {job.important_dates.map((d: any, i: number) => (
                <View key={i} style={s.datesRow}>
                  <View style={s.dotBig} />
                  <Text style={s.dateEvent}>{d.event}</Text>
                  <View style={{ flex: 1 }} />
                  <Text style={s.dateVal}>{d.date}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Selection process */}
        {job.selection_process?.length ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>{t('selectionProcess')}</Text>
            <View style={{ marginTop: 8 }}>
              {job.selection_process.map((step: string, i: number) => (
                <View key={i} style={s.stepRow}>
                  <View style={s.stepNum}><Text style={s.stepNumTxt}>{i + 1}</Text></View>
                  <Text style={s.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Important links */}
        {job.important_links?.length ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>{t('importantLinks')}</Text>
            <View style={{ marginTop: 10, gap: 8 }}>
              {job.important_links.map((l: any, i: number) => (
                <Pressable key={i} style={s.linkRow} onPress={() => openLink(l.url)}>
                  <Ionicons name="link-outline" size={16} color={theme.colors.brand} />
                  <Text style={s.linkTxt}>{l.label}</Text>
                  <View style={{ flex: 1 }} />
                  <Ionicons name="open-outline" size={14} color={theme.colors.muted} />
                </Pressable>
              ))}
              {job.official_website ? (
                <Pressable style={s.linkRow} onPress={() => openLink(job.official_website)}>
                  <Ionicons name="globe-outline" size={16} color={theme.colors.brand} />
                  <Text style={s.linkTxt}>{t('officialWebsite')}</Text>
                  <View style={{ flex: 1 }} />
                  <Ionicons name="open-outline" size={14} color={theme.colors.muted} />
                </Pressable>
              ) : null}
              {job.notif_pdf ? (
                <Pressable style={s.linkRow} onPress={() => openLink(job.notif_pdf)}>
                  <Ionicons name="document-text-outline" size={16} color={theme.colors.brand} />
                  <Text style={s.linkTxt}>{t('downloadPdf')}</Text>
                  <View style={{ flex: 1 }} />
                  <Ionicons name="download-outline" size={14} color={theme.colors.muted} />
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Apply floating CTA */}
      <SafeAreaView edges={['bottom']} style={s.applyBar}>
        <Pressable style={s.applyMain} testID="job-apply" onPress={() => openLink(job.apply_url || job.official_website || '#')}>
          <Ionicons name="rocket-outline" size={18} color="#FFF" />
          <Text style={s.applyMainTxt}>{t('applyNow')}</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function StatCard({ icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <View style={s.stat}>
      <View style={s.statIcon}><Ionicons name={icon} size={16} color={theme.colors.brand} /></View>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { paddingHorizontal: 16, paddingBottom: 20, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 4, paddingBottom: 6 },
  circleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  heroLogo: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginTop: 12 },
  heroLogoTxt: { color: '#FFF', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
  heroTitle: { color: '#FFF', fontSize: 22, fontWeight: '800', marginTop: 14, lineHeight: 28 },
  heroOrg: { color: 'rgba(255,255,255,0.9)', marginTop: 4, fontSize: 13, fontWeight: '600' },
  chipsRow: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  chipTxt: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  statGrid: { flexDirection: 'row', gap: 10, marginTop: -30 },
  stat: { flex: 1, backgroundColor: theme.colors.surface, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, ...(theme.shadow.soft as object) },
  statIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 10.5, color: theme.colors.muted, marginTop: 8, fontWeight: '700', letterSpacing: 0.3 },
  statValue: { fontSize: 14, fontWeight: '800', color: theme.colors.onSurface, marginTop: 2 },
  card: { backgroundColor: theme.colors.surface, borderRadius: 18, padding: 14, marginTop: 12, borderWidth: 1, borderColor: theme.colors.border },
  cardTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.onSurface },
  body: { fontSize: 13.5, color: theme.colors.onSurfaceSecondary, marginTop: 8, lineHeight: 20 },
  datesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  dotBig: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.brand },
  dateEvent: { fontSize: 13, color: theme.colors.onSurface, fontWeight: '600' },
  dateVal: { fontSize: 12, color: theme.colors.muted, fontWeight: '700' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center' },
  stepNumTxt: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  stepText: { fontSize: 13, color: theme.colors.onSurface, fontWeight: '600' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: theme.colors.surfaceSecondary, borderWidth: 1, borderColor: theme.colors.border },
  linkTxt: { fontSize: 13, color: theme.colors.brand, fontWeight: '700' },
  applyBar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: theme.colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
  applyMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.brand, borderRadius: 16, paddingVertical: 14, ...(theme.shadow.card as object) },
  applyMainTxt: { color: '#FFF', fontWeight: '800', fontSize: 15 },
});
