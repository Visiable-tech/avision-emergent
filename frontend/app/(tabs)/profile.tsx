import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';

const W = Dimensions.get('window').width;

export default function Profile() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [perf, setPerf] = useState<any>(null);

  useEffect(() => { (async () => { setProfile(await api.profile()); setPerf(await api.performance()); })(); }, []);

  if (!profile) return <View style={{ flex: 1, backgroundColor: '#FFF' }} />;

  const maxHours = Math.max(...(perf?.weekly_hours || [1]));

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <SafeAreaView edges={['top']} style={s.headBg}>
          <LinearGradient colors={[theme.colors.brand, theme.colors.brandDark]} style={StyleSheet.absoluteFill} />
          <View style={s.headContent}>
            <View style={s.headTop}>
              <Text style={s.headTitle}>Profile</Text>
              <Pressable testID="settings-btn" style={s.settingBtn}>
                <Ionicons name="settings-outline" size={20} color="#FFF" />
              </Pressable>
            </View>
            <View style={s.avatarRow}>
              <View style={s.avatar}><Text style={s.avatarText}>A</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{profile.name}</Text>
                <Text style={s.email}>{profile.email}</Text>
                <View style={s.subChip}>
                  <Ionicons name="star" size={11} color={theme.colors.gold} />
                  <Text style={s.subChipText}>{profile.subscription}</Text>
                </View>
              </View>
            </View>
            <View style={s.statsGrid}>
              <View style={s.statCell}><Text style={s.statVal}>{profile.xp}</Text><Text style={s.statLbl}>XP</Text></View>
              <View style={s.statDivider} />
              <View style={s.statCell}><Text style={s.statVal}>{profile.coins}</Text><Text style={s.statLbl}>Coins</Text></View>
              <View style={s.statDivider} />
              <View style={s.statCell}><Text style={s.statVal}>{profile.streak}</Text><Text style={s.statLbl}>Streak</Text></View>
              <View style={s.statDivider} />
              <View style={s.statCell}><Text style={s.statVal}>Lv {profile.level}</Text><Text style={s.statLbl}>Level</Text></View>
            </View>
          </View>
        </SafeAreaView>

        <Text style={s.section}>Performance Analytics</Text>
        {perf && (
          <View style={s.perfCard}>
            <View style={s.perfRow}>
              <View style={s.perfStat}><Text style={s.perfNum}>{profile.stats.study_hours}h</Text><Text style={s.perfLbl}>Study Hours</Text></View>
              <View style={s.perfStat}><Text style={s.perfNum}>{profile.stats.tests_taken}</Text><Text style={s.perfLbl}>Tests</Text></View>
              <View style={s.perfStat}><Text style={s.perfNum}>{profile.stats.avg_accuracy}%</Text><Text style={s.perfLbl}>Accuracy</Text></View>
              <View style={s.perfStat}><Text style={s.perfNum}>#{profile.stats.rank}</Text><Text style={s.perfLbl}>Rank</Text></View>
            </View>
            <Text style={s.chartTitle}>Weekly Study Hours</Text>
            <View style={s.chart}>
              {perf.weekly_hours.map((h: number, i: number) => (
                <View key={i} style={s.barCol}>
                  <View style={[s.bar, { height: (h / maxHours) * 80 }]} />
                  <Text style={s.barLbl}>{['M','T','W','T','F','S','S'][i]}</Text>
                </View>
              ))}
            </View>
            <Text style={s.chartTitle}>Subject Strength</Text>
            {perf.subject_strength.map((sub: any) => (
              <View key={sub.subject} style={{ marginTop: 8 }}>
                <View style={s.subjRow}>
                  <Text style={s.subjName}>{sub.subject}</Text>
                  <Text style={s.subjScore}>{sub.score}%</Text>
                </View>
                <View style={s.subjBar}>
                  <View style={[s.subjFill, { width: `${sub.score}%` }]} />
                </View>
              </View>
            ))}
            <View style={s.aiSuggest}>
              <View style={s.aiHead}>
                <Ionicons name="sparkles" size={16} color={theme.colors.brand} />
                <Text style={s.aiTitle}>AI Suggestions</Text>
              </View>
              {perf.ai_suggestions.map((sg: string, i: number) => (
                <View key={i} style={s.aiItem}>
                  <View style={s.aiDot} />
                  <Text style={s.aiTxt}>{sg}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Text style={s.section}>Badges & Achievements</Text>
        <View style={s.badges}>
          {profile.badges.map((b: any) => (
            <View key={b.id} style={[s.badge, !b.earned && { opacity: 0.35 }]}>
              <View style={s.badgeIcon}>
                <Ionicons name={b.icon} size={22} color={theme.colors.gold} />
              </View>
              <Text style={s.badgeName}>{b.name}</Text>
            </View>
          ))}
        </View>

        <Text style={s.section}>Menu</Text>
        <View style={s.menuList}>
          {[
            { icon: 'ribbon-outline', label: 'Certificates', count: profile.certificates.length, onPress: () => {} },
            { icon: 'bookmark-outline', label: 'Bookmarks', onPress: () => {} },
            { icon: 'download-outline', label: 'Downloads', onPress: () => {} },
            { icon: 'sparkles-outline', label: 'AI Study Planner', onPress: () => router.push('/planner') },
            { icon: 'chatbubbles-outline', label: 'AI Tutor', onPress: () => router.push('/ai-tutor') },
            { icon: 'card-outline', label: 'Subscription', onPress: () => {} },
            { icon: 'help-circle-outline', label: 'Help & Support', onPress: () => {} },
          ].map((m) => (
            <Pressable key={m.label} testID={`menu-${m.label}`} style={s.menuRow} onPress={m.onPress}>
              <View style={s.menuIcon}><Ionicons name={m.icon as any} size={20} color={theme.colors.brand} /></View>
              <Text style={s.menuLabel}>{m.label}</Text>
              {m.count !== undefined && <View style={s.menuCount}><Text style={s.menuCountText}>{m.count}</Text></View>}
              <Ionicons name="chevron-forward" size={18} color={theme.colors.mutedLight} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  headBg: { paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  headContent: { paddingHorizontal: theme.spacing.lg, paddingTop: 8 },
  headTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headTitle: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  settingBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: theme.colors.brand, fontSize: 26, fontWeight: '800' },
  name: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  email: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  subChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginTop: 6 },
  subChipText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 18, padding: 12, marginTop: 18, alignItems: 'center' },
  statCell: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },
  statVal: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  statLbl: { color: 'rgba(255,255,255,0.75)', fontSize: 10, marginTop: 2 },
  section: { fontSize: 18, fontWeight: '800', color: theme.colors.onSurface, marginHorizontal: theme.spacing.lg, marginTop: 22, marginBottom: 10 },
  perfCard: { marginHorizontal: theme.spacing.lg, backgroundColor: theme.colors.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: theme.colors.border, ...(theme.shadow.soft as object) },
  perfRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  perfStat: { alignItems: 'center', flex: 1 },
  perfNum: { fontSize: 18, fontWeight: '800', color: theme.colors.brand },
  perfLbl: { fontSize: 11, color: theme.colors.muted, marginTop: 2 },
  chartTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.onSurfaceSecondary, marginTop: 18, marginBottom: 8 },
  chart: { flexDirection: 'row', height: 110, alignItems: 'flex-end', justifyContent: 'space-between' },
  barCol: { alignItems: 'center', flex: 1 },
  bar: { width: 18, backgroundColor: theme.colors.brand, borderRadius: 6, marginBottom: 6 },
  barLbl: { fontSize: 10, color: theme.colors.muted, fontWeight: '600' },
  subjRow: { flexDirection: 'row', justifyContent: 'space-between' },
  subjName: { fontSize: 12, fontWeight: '600', color: theme.colors.onSurfaceSecondary },
  subjScore: { fontSize: 12, fontWeight: '800', color: theme.colors.brand },
  subjBar: { height: 6, backgroundColor: theme.colors.surfaceTertiary, borderRadius: 3, marginTop: 4, overflow: 'hidden' },
  subjFill: { height: '100%', backgroundColor: theme.colors.gold, borderRadius: 3 },
  aiSuggest: { backgroundColor: theme.colors.brandTertiary, borderRadius: 14, padding: 12, marginTop: 16 },
  aiHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  aiTitle: { fontSize: 13, fontWeight: '800', color: theme.colors.brand },
  aiItem: { flexDirection: 'row', gap: 8, marginTop: 4 },
  aiDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: theme.colors.brand, marginTop: 8 },
  aiTxt: { flex: 1, fontSize: 12, color: theme.colors.onSurfaceSecondary, lineHeight: 17 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: theme.spacing.md },
  badge: { width: '25%', alignItems: 'center', padding: 8 },
  badgeIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: theme.colors.goldTint, alignItems: 'center', justifyContent: 'center' },
  badgeName: { fontSize: 11, textAlign: 'center', fontWeight: '600', color: theme.colors.onSurfaceSecondary, marginTop: 6 },
  menuList: { marginHorizontal: theme.spacing.lg, backgroundColor: theme.colors.surface, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  menuIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.colors.onSurface },
  menuCount: { minWidth: 24, height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: theme.colors.gold, alignItems: 'center', justifyContent: 'center' },
  menuCountText: { fontSize: 11, fontWeight: '800', color: '#FFF' },
});
