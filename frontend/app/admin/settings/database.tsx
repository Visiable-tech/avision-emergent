import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '@/src/api';
import { theme } from '@/src/theme';
import { AdminHeader, AdminCard, Chip, EmptyState } from '@/src/admin/ui';

export default function DatabaseOverview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await api.adminExtra.databaseOverview();
      setData(d);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
      <AdminHeader
        title="Database Overview"
        subtitle={loading ? '—' : `${data?.total_collections || 0} collections tracked • MongoDB`}
      />

      <View style={{ paddingHorizontal: 32, marginBottom: 12 }}>
        <View style={s.warnCard}>
          <Text style={s.warnTitle}>🔒 Safe read-only overview</Text>
          <Text style={s.warnTxt}>This page shows entity names and document counts only. Database credentials, connection strings and raw records are never exposed here.</Text>
        </View>
      </View>

      <AdminCard>
        <View style={s.head}>
          <Text style={[s.hcell, { flex: 2 }]}>Entity</Text>
          <Text style={[s.hcell, { flex: 1.4 }]}>Collection</Text>
          <Text style={[s.hcell, { flex: 2.2 }]}>Description</Text>
          <Text style={[s.hcell, { width: 100, textAlign: 'right' }]}>Records</Text>
          <Text style={[s.hcell, { width: 90 }]}>Status</Text>
        </View>
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={theme.colors.brand} /></View>
        ) : !data?.entities?.length ? (
          <EmptyState text="No entities found" icon="server" />
        ) : data.entities.map((e: any) => (
          <View key={e.collection} style={s.row}>
            <Text style={[s.cell, { flex: 2, fontWeight: '900' }]}>{e.label}</Text>
            <Text style={[s.cell, { flex: 1.4, fontFamily: 'monospace' as any, fontSize: 11.5, color: theme.colors.brand }]}>{e.collection}</Text>
            <Text style={[s.cell, { flex: 2.2, color: theme.colors.muted, fontWeight: '700' }]} numberOfLines={1}>{e.description}</Text>
            <Text style={[s.cell, { width: 100, textAlign: 'right', fontVariant: ['tabular-nums'] as any, fontWeight: '900', fontSize: 13 }]}>{Number(e.count).toLocaleString('en-IN')}</Text>
            <View style={{ width: 90 }}><Chip label={e.status === 'ok' ? 'ok' : 'error'} tone={e.status === 'ok' ? 'success' : 'danger'} /></View>
          </View>
        ))}
      </AdminCard>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, backgroundColor: theme.colors.surfaceSecondary, gap: 12 },
  hcell: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, gap: 12 },
  cell: { fontSize: 12.5, color: theme.colors.onSurface },
  warnCard: { padding: 14, backgroundColor: '#FDF7EC', borderRadius: 10, borderLeftWidth: 4, borderLeftColor: theme.colors.gold },
  warnTitle: { fontSize: 12.5, fontWeight: '900', color: theme.colors.onSurface, marginBottom: 4 },
  warnTxt: { fontSize: 11.5, color: theme.colors.onSurfaceTertiary, fontWeight: '700', lineHeight: 18 },
});
