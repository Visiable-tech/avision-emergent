import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '@/src/api';
import { theme } from '@/src/theme';
import { AdminHeader, AdminCard, Chip, EmptyState } from '@/src/admin/ui';

export default function AdminPayments() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await api.adminExtra.payments(100, 0);
      setRows(d.payments || []);
      setTotal(d.total || 0);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
      <AdminHeader title="Payments" subtitle={`${total} total`} />
      <AdminCard>
        <View style={s.head}>
          <Text style={[s.hcell, { flex: 1.6 }]}>Order</Text>
          <Text style={[s.hcell, { flex: 1 }]}>Gateway</Text>
          <Text style={[s.hcell, { width: 100 }]}>Method</Text>
          <Text style={[s.hcell, { width: 110 }]}>Amount</Text>
          <Text style={[s.hcell, { width: 90 }]}>Status</Text>
          <Text style={[s.hcell, { flex: 1.4 }]}>Paid at</Text>
        </View>
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={theme.colors.brand} /></View>
        ) : rows.length === 0 ? (
          <EmptyState text="No payments yet" icon="card" />
        ) : rows.map((r) => (
          <View key={r.id} style={s.row}>
            <View style={[s.cell, { flex: 1.6 }]}>
              <Text style={{ fontSize: 11.5, fontWeight: '900', color: theme.colors.brand }}>{r.order_id}</Text>
              {r.order?.total ? <Text style={{ fontSize: 10.5, color: theme.colors.muted, fontWeight: '700', marginTop: 2 }}>₹{Number(r.order.total).toLocaleString('en-IN')} • {r.order.items?.[0]?.product_id}</Text> : null}
            </View>
            <View style={[s.cell, { flex: 1 }]}><Chip label={r.gateway} tone={r.gateway === 'razorpay' ? 'primary' : r.gateway === 'offline' ? 'warning' : 'default'} /></View>
            <Text style={[s.cell, { width: 100, fontWeight: '800' }]}>{r.method || '—'}</Text>
            <Text style={[s.cell, { width: 110, fontWeight: '900' }]}>₹{Number((r.amount_paise || 0) / 100).toLocaleString('en-IN')}</Text>
            <View style={{ width: 90 }}><Chip label={r.status} tone={r.status === 'success' ? 'success' : r.status === 'failed' ? 'danger' : 'default'} /></View>
            <Text style={[s.cell, { flex: 1.4, fontSize: 11.5 }]}>{fmt(r.paid_at)}</Text>
          </View>
        ))}
      </AdminCard>
    </ScrollView>
  );
}

function fmt(iso?: string) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return iso; }
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, backgroundColor: theme.colors.surfaceSecondary, gap: 12 },
  hcell: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, gap: 12 },
  cell: { fontSize: 12.5, color: theme.colors.onSurface },
});
