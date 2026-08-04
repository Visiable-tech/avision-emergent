import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { api } from '@/src/api';
import { theme } from '@/src/theme';
import { AdminHeader, AdminCard, Btn, Chip } from '@/src/admin/ui';

const CATEGORY_ORDER = [
  'Authentication', 'Course API', 'Entitlement API', 'Progress API', 'Test API',
  'App ↔ Backend', 'Website ↔ Backend', 'Admin ↔ Backend',
];

export default function IntegrationTest() {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    setBusy(true);
    try {
      const d = await api.adminExtra.integrationTests();
      setData(d);
    } catch (e) { console.warn(e); }
    finally { setBusy(false); }
  }, []);

  useFocusEffect(useCallback(() => { run(); }, [run]));

  const groups: Record<string, any[]> = {};
  (data?.results || []).forEach((r: any) => {
    (groups[r.category] = groups[r.category] || []).push(r);
  });
  const orderedCats = [
    ...CATEGORY_ORDER.filter((c) => groups[c]),
    ...Object.keys(groups).filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  const summary = data?.summary || { pass: 0, fail: 0, skip: 0, total: 0 };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
      <AdminHeader
        title="Integration Test"
        subtitle={data ? `Last run: ${fmt(data.run_at)}` : 'Auto-runs each visit'}
        action={<Btn label="Re-run all" icon="flash" busy={busy} onPress={run} />}
      />

      <View style={{ paddingHorizontal: 32, flexDirection: 'row', gap: 14, marginBottom: 14 }}>
        <StatCard label="TOTAL" value={summary.total} tone="default" />
        <StatCard label="PASS" value={summary.pass} tone="success" />
        <StatCard label="FAIL" value={summary.fail} tone="danger" />
        <StatCard label="SKIP" value={summary.skip} tone="warning" />
      </View>

      {busy && !data ? (
        <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={theme.colors.brand} /></View>
      ) : orderedCats.length === 0 ? null : orderedCats.map((cat) => (
        <View key={cat}>
          <Text style={s.cat}>{cat}</Text>
          <AdminCard>
            {groups[cat].map((r: any, i: number) => (
              <View key={i} style={s.row}>
                <View style={{ width: 24, alignItems: 'center' }}>
                  <Ionicons
                    name={r.status === 'pass' ? 'checkmark-circle' : r.status === 'fail' ? 'close-circle' : 'ellipse-outline'}
                    size={22}
                    color={r.status === 'pass' ? theme.colors.success : r.status === 'fail' ? theme.colors.error : theme.colors.mutedLight}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{r.name}</Text>
                  {r.detail ? <Text style={s.detail}>{r.detail}</Text> : null}
                </View>
                <Chip
                  label={r.status}
                  tone={r.status === 'pass' ? 'success' : r.status === 'fail' ? 'danger' : 'warning'}
                />
              </View>
            ))}
          </AdminCard>
        </View>
      ))}
    </ScrollView>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: 'default' | 'success' | 'danger' | 'warning' }) {
  const bg = tone === 'success' ? '#DCFCE7' : tone === 'danger' ? '#FEE2E2' : tone === 'warning' ? '#FEF3C7' : theme.colors.surfaceSecondary;
  const fg = tone === 'success' ? '#166534' : tone === 'danger' ? '#991B1B' : tone === 'warning' ? '#92400E' : theme.colors.onSurface;
  return (
    <View style={[s.stat, { backgroundColor: bg }]}>
      <Text style={[s.statVal, { color: fg }]}>{value}</Text>
      <Text style={[s.statLbl, { color: fg }]}>{label}</Text>
    </View>
  );
}

function fmt(iso?: string) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); } catch { return iso; }
}

const s = StyleSheet.create({
  stat: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'flex-start' },
  statVal: { fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  statLbl: { fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 2 },
  cat: { fontSize: 11, fontWeight: '900', color: theme.colors.brand, letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 32, marginTop: 8, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  name: { fontSize: 13, fontWeight: '800', color: theme.colors.onSurface },
  detail: { fontSize: 11, color: theme.colors.muted, fontWeight: '700', marginTop: 2 },
});
