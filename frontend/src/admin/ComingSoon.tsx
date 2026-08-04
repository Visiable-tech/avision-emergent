import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { AdminHeader, AdminCard } from '@/src/admin/ui';

type Props = {
  title: string;
  subtitle?: string;
  icon?: any;
  description?: string;
  blockers?: string[];
  redirects?: { label: string; path: string }[];
};

export default function ComingSoon({ title, subtitle, icon = 'construct', description, blockers = [], redirects = [] }: Props) {
  const router = useRouter();
  return (
    <View style={{ flex: 1 }}>
      <AdminHeader title={title} subtitle={subtitle || 'Planned in the AVISION ONE roadmap'} />
      <AdminCard style={{ padding: 32 }}>
        <View style={s.iconWrap}>
          <Ionicons name={icon} size={40} color={theme.colors.brand} />
        </View>
        <Text style={s.title}>Coming soon</Text>
        {description ? <Text style={s.desc}>{description}</Text> : null}
        {blockers.length ? (
          <View style={{ marginTop: 16, alignSelf: 'stretch' }}>
            <Text style={s.blockersTitle}>Depends on</Text>
            {blockers.map((b, i) => (
              <View key={i} style={s.blockerRow}>
                <Ionicons name="ellipse" size={5} color={theme.colors.brand} />
                <Text style={s.blockerTxt}>{b}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {redirects.length ? (
          <View style={{ marginTop: 20, flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {redirects.map((r) => (
              <Pressable key={r.path} onPress={() => router.push(r.path as any)} style={s.link}>
                <Text style={s.linkTxt}>{r.label} →</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </AdminCard>
    </View>
  );
}

const s = StyleSheet.create({
  iconWrap: { width: 80, height: 80, borderRadius: 20, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 },
  title: { textAlign: 'center', fontSize: 16, fontWeight: '900', color: theme.colors.onSurface },
  desc: { textAlign: 'center', fontSize: 12.5, color: theme.colors.muted, fontWeight: '700', marginTop: 8, lineHeight: 20, maxWidth: 520, alignSelf: 'center' },
  blockersTitle: { fontSize: 10.5, fontWeight: '900', color: theme.colors.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  blockerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  blockerTxt: { fontSize: 12, color: theme.colors.onSurfaceTertiary, fontWeight: '700' },
  link: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme.colors.brandTertiary, borderRadius: 8 },
  linkTxt: { fontSize: 12, fontWeight: '900', color: theme.colors.brand },
});
