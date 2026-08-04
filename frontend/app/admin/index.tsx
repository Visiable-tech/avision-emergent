import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '@/src/api';
import { theme } from '@/src/theme';
import { AdminHeader, AdminCard, Stat } from '@/src/admin/ui';

const TYPE_LABEL: Record<string, string> = {
  live_course: 'Live Courses',
  video_course: 'Video Courses',
  test_series: 'Test Series',
  booster: 'Boosters',
  magazine: 'Magazines',
};

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await api.admin.dashboard();
      setData(d);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const stats = data?.stats || {};
  const byType = stats.products_by_type || {};

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
      <AdminHeader title="Dashboard" subtitle="AVISION ONE at a glance" />

      {loading ? (
        <View style={{ paddingVertical: 60, alignItems: 'center' }}>
          <ActivityIndicator color={theme.colors.brand} />
        </View>
      ) : (
        <>
          <View style={s.grid}>
            <Stat label="Students" value={stats.users?.toLocaleString('en-IN') ?? '—'} icon="people" tone="primary" />
            <Stat label="Active students" value={stats.active_users?.toLocaleString('en-IN') ?? '—'} icon="checkmark-circle" tone="success" />
            <Stat label="Products" value={stats.products ?? '—'} icon="cube" tone="default" />
            <Stat label="Entitlements" value={stats.entitlements ?? '—'} icon="shield-checkmark" tone="warning" />
          </View>
          <View style={s.grid}>
            <Stat label="Orders" value={stats.orders ?? '—'} icon="receipt" tone="default" />
            <Stat label="Faculty" value={stats.faculty ?? '—'} icon="school" tone="default" />
            <Stat label="Centres" value={stats.centres ?? '—'} icon="business" tone="default" />
            <Stat label="Admin" value={data?.admin?.email || '—'} icon="key" tone="default" />
          </View>

          <AdminCard>
            <View style={s.tblHead}>
              <Text style={s.tblTitle}>Products by type</Text>
              <Text style={s.tblSub}>{stats.products || 0} total</Text>
            </View>
            <View style={{ padding: 16 }}>
              {Object.entries(TYPE_LABEL).map(([k, label]) => {
                const n = byType[k] || 0;
                const pct = stats.products ? Math.round((n / stats.products) * 100) : 0;
                return (
                  <View key={k} style={s.barRow}>
                    <Text style={s.barLbl}>{label}</Text>
                    <View style={s.barBg}>
                      <View style={[s.barFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={s.barVal}>{n}</Text>
                  </View>
                );
              })}
            </View>
          </AdminCard>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 14, paddingHorizontal: 32, marginBottom: 14, flexWrap: 'wrap' },
  tblHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  tblTitle: { flex: 1, fontSize: 14, fontWeight: '900', color: theme.colors.onSurface },
  tblSub: { fontSize: 11, color: theme.colors.muted, fontWeight: '700' },

  barRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 6 },
  barLbl: { width: 130, fontSize: 12, fontWeight: '800', color: theme.colors.onSurfaceTertiary },
  barBg: { flex: 1, height: 8, backgroundColor: theme.colors.surfaceSecondary, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: theme.colors.brand },
  barVal: { width: 40, textAlign: 'right', fontWeight: '900', color: theme.colors.onSurface, fontSize: 12.5 },
});
