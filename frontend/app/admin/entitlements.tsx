import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '@/src/api';
import { theme } from '@/src/theme';
import { AdminHeader, AdminCard, Chip, EmptyState } from '@/src/admin/ui';

export default function AdminEntitlements() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await api.admin.entitlements({ limit: 200 });
      setRows(d.entitlements || []);
      setTotal(d.total || 0);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
      <AdminHeader title="Entitlements" subtitle={`${total} active`} />
      <AdminCard>
        <View style={s.head}>
          <Text style={[s.hcell, { flex: 1.4 }]}>User</Text>
          <Text style={[s.hcell, { flex: 1.8 }]}>Product</Text>
          <Text style={[s.hcell, { flex: 1 }]}>Type</Text>
          <Text style={[s.hcell, { flex: 1 }]}>Source</Text>
          <Text style={[s.hcell, { flex: 1.4 }]}>Granted</Text>
          <Text style={[s.hcell, { flex: 1.4 }]}>Expires</Text>
          <Text style={[s.hcell, { width: 80 }]}>Status</Text>
        </View>
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={theme.colors.brand} /></View>
        ) : rows.length === 0 ? (
          <EmptyState text="No entitlements" icon="shield-checkmark" />
        ) : rows.map((r) => (
          <View key={r.id} style={s.row}>
            <Text style={[s.cell, { flex: 1.4, fontSize: 11.5 }]} numberOfLines={1}>{r.user_id}</Text>
            <Text style={[s.cell, { flex: 1.8, fontWeight: '800' }]} numberOfLines={1}>{r.product_id}</Text>
            <View style={[s.cell, { flex: 1 }]}><Chip label={r.product_type} tone="default" /></View>
            <View style={[s.cell, { flex: 1 }]}><Chip label={r.source} tone={r.source === 'admin_grant' ? 'primary' : r.source === 'offline' ? 'warning' : 'default'} /></View>
            <Text style={[s.cell, { flex: 1.4, fontSize: 11.5 }]}>{fmt(r.granted_at)}</Text>
            <Text style={[s.cell, { flex: 1.4, fontSize: 11.5 }]}>{fmt(r.expires_at)}</Text>
            <View style={{ width: 80 }}><Chip label={r.active ? 'active' : 'inactive'} tone={r.active ? 'success' : 'warning'} /></View>
          </View>
        ))}
      </AdminCard>
    </ScrollView>
  );
}

function fmt(iso?: string) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return iso; }
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, backgroundColor: theme.colors.surfaceSecondary, gap: 12 },
  hcell: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, gap: 12 },
  cell: { fontSize: 12.5, color: theme.colors.onSurface },
});
