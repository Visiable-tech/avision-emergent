import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '@/src/api';
import { theme } from '@/src/theme';
import { AdminHeader, AdminCard, Chip, EmptyState } from '@/src/admin/ui';

export default function AdminCoupons() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await api.admin.coupons();
      setRows(d.coupons || []);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
      <AdminHeader title="Coupons" subtitle={`${rows.length} configured`} />
      <AdminCard>
        <View style={s.head}>
          <Text style={[s.hcell, { flex: 1 }]}>Code</Text>
          <Text style={[s.hcell, { flex: 2 }]}>Description</Text>
          <Text style={[s.hcell, { width: 100 }]}>Discount</Text>
          <Text style={[s.hcell, { width: 100 }]}>Max ₹</Text>
          <Text style={[s.hcell, { flex: 1.4 }]}>Applies to</Text>
          <Text style={[s.hcell, { width: 100 }]}>Used</Text>
          <Text style={[s.hcell, { width: 80 }]}>Status</Text>
        </View>
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={theme.colors.brand} /></View>
        ) : rows.length === 0 ? (
          <EmptyState text="No coupons yet" icon="pricetag" />
        ) : rows.map((r) => (
          <View key={r.code} style={s.row}>
            <Text style={[s.cell, { flex: 1, fontWeight: '900', color: theme.colors.brand }]}>{r.code}</Text>
            <Text style={[s.cell, { flex: 2 }]} numberOfLines={1}>{r.desc || '—'}</Text>
            <Text style={[s.cell, { width: 100, fontWeight: '900' }]}>{r.discount_pct}% off</Text>
            <Text style={[s.cell, { width: 100 }]}>{r.max_discount_inr ? `₹${r.max_discount_inr}` : '—'}</Text>
            <View style={[s.cell, { flex: 1.4, flexDirection: 'row', gap: 4, flexWrap: 'wrap' }]}>
              {(r.applies_to_types || []).map((t: string) => <Chip key={t} label={t} />)}
            </View>
            <Text style={[s.cell, { width: 100 }]}>{r.used_count || 0}{r.usage_limit ? ` / ${r.usage_limit}` : ''}</Text>
            <View style={{ width: 80 }}><Chip label={r.active ? 'active' : 'inactive'} tone={r.active ? 'success' : 'warning'} /></View>
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
});
