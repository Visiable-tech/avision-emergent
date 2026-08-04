import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '@/src/api';
import { theme } from '@/src/theme';
import { AdminHeader, AdminCard, Chip, EmptyState } from '@/src/admin/ui';

export default function AdminOrders() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await api.admin.orders(100, 0);
      setRows(d.orders || []);
      setTotal(d.total || 0);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
      <AdminHeader title="Orders" subtitle={`${total} total`} />
      <AdminCard>
        <View style={s.head}>
          <Text style={[s.hcell, { flex: 1.6 }]}>Order ID</Text>
          <Text style={[s.hcell, { flex: 1.4 }]}>User</Text>
          <Text style={[s.hcell, { flex: 2 }]}>Items</Text>
          <Text style={[s.hcell, { width: 100 }]}>Total</Text>
          <Text style={[s.hcell, { width: 90 }]}>Status</Text>
          <Text style={[s.hcell, { width: 90 }]}>Channel</Text>
          <Text style={[s.hcell, { flex: 1.2 }]}>Created</Text>
        </View>
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={theme.colors.brand} /></View>
        ) : rows.length === 0 ? (
          <EmptyState text="No orders yet" icon="receipt" />
        ) : rows.map((r) => (
          <View key={r.id} style={s.row}>
            <Text style={[s.cell, { flex: 1.6, fontWeight: '900', color: theme.colors.brand, fontSize: 11 }]}>{r.avision_order_id}</Text>
            <View style={[s.cell, { flex: 1.4 }]}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.onSurface }} numberOfLines={1}>{r.user?.name || r.user_id}</Text>
              {r.user?.email ? <Text style={{ fontSize: 10.5, color: theme.colors.muted, fontWeight: '700', marginTop: 1 }} numberOfLines={1}>{r.user.email}</Text> : null}
            </View>
            <View style={[s.cell, { flex: 2 }]}>
              {(r.items || []).map((it: any, i: number) => (
                <Text key={i} style={{ fontSize: 12, color: theme.colors.onSurface, fontWeight: '700' }} numberOfLines={1}>{it.product_id} • ₹{it.price}</Text>
              ))}
            </View>
            <Text style={[s.cell, { width: 100, fontWeight: '900' }]}>₹{Number(r.total || 0).toLocaleString('en-IN')}</Text>
            <View style={{ width: 90 }}><Chip label={r.status} tone={r.status === 'paid' ? 'success' : r.status === 'failed' ? 'danger' : 'default'} /></View>
            <View style={{ width: 90 }}><Chip label={r.channel} tone={r.channel === 'offline' ? 'warning' : 'default'} /></View>
            <Text style={[s.cell, { flex: 1.2, fontSize: 11.5 }]}>{fmt(r.created_at)}</Text>
          </View>
        ))}
      </AdminCard>
    </ScrollView>
  );
}

function fmt(iso?: string) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }); } catch { return iso; }
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, backgroundColor: theme.colors.surfaceSecondary, gap: 12 },
  hcell: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, gap: 12 },
  cell: { fontSize: 12.5, color: theme.colors.onSurface },
});
