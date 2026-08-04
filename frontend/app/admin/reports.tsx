import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/api';
import { theme } from '@/src/theme';
import { AdminHeader, AdminCard, Btn, Stat, EmptyState, Chip, TableRow } from '@/src/admin/ui';

const RANGES = [
  { label: 'Today', value: 'today' },
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: 'All time', value: 'all' },
];

const REPORT_ICONS: Record<string, any> = {
  students: 'people',
  product_sales: 'cart',
  revenue: 'cash',
  orders_report: 'receipt',
  payments_report: 'card',
  course_performance: 'videocam',
  test_performance: 'clipboard',
  engagement: 'flame',
  learning_progress: 'trending-up',
  centre_wise: 'storefront',
  franchise_wise: 'business',
};

export default function ReportsScreen() {
  const [reports, setReports] = useState<{ slug: string; label: string }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [range, setRange] = useState('30d');
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.admin.reportsIndex().then((r: any) => {
      setReports(r.reports || []);
      if ((r.reports || []).length && !selected) setSelected(r.reports[0].slug);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    setErr(null);
    setData(null);
    try {
      const r = await api.admin.report(selected, range);
      setData(r);
    } catch (e: any) {
      setErr(e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }, [selected, range]);

  useEffect(() => { load(); }, [load]);

  return (
    <ScrollView style={{ flex: 1 }}>
      <AdminHeader
        title="Reports & Analytics"
        subtitle="Real-time data from the common backend"
        action={
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {RANGES.map(r => (
              <Pressable key={r.value} onPress={() => setRange(r.value)} style={[s.rangePill, range === r.value && s.rangePillActive]}>
                <Text style={[s.rangeTxt, range === r.value && { color: '#FFF' }]}>{r.label}</Text>
              </Pressable>
            ))}
          </View>
        }
      />

      <View style={s.body}>
        <View style={s.sidebar}>
          <Text style={s.sideHead}>Reports</Text>
          {reports.map(r => {
            const active = selected === r.slug;
            return (
              <Pressable key={r.slug} onPress={() => setSelected(r.slug)} style={[s.item, active && s.itemActive]}>
                <Ionicons name={REPORT_ICONS[r.slug] || 'bar-chart'} size={14} color={active ? '#FFF' : theme.colors.brand} />
                <Text style={[s.itemTxt, active && { color: '#FFF' }]} numberOfLines={1}>{r.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={s.content}>
          {loading ? (
            <View style={{ padding: 60, alignItems: 'center' }}>
              <ActivityIndicator color={theme.colors.brand} />
            </View>
          ) : err ? (
            <AdminCard><Text style={s.err}>{err}</Text></AdminCard>
          ) : !data ? (
            <EmptyState text="Select a report on the left" icon="analytics" />
          ) : (
            <ReportRender data={data} />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function ReportRender({ data }: { data: any }) {
  const kpis = data.kpis || [];
  return (
    <>
      {kpis.length > 0 && (
        <AdminCard style={{ padding: 20 }}>
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            {kpis.map((k: any, i: number) => (
              <View key={i} style={{ flex: 1, minWidth: 160 }}>
                <Stat label={k.label} value={typeof k.value === 'number' ? k.value.toLocaleString() : k.value}
                      icon={i === 0 ? 'stats-chart' : i === 1 ? 'trending-up' : 'checkmark-circle'}
                      tone={i === 0 ? 'primary' : i === 1 ? 'success' : 'default'} />
              </View>
            ))}
          </View>
        </AdminCard>
      )}

      {data.breakdown && data.breakdown.length ? (
        <TableSection title="Breakdown" rows={data.breakdown} columns={Object.keys(data.breakdown[0] || {})} />
      ) : null}
      {data.by_channel && data.by_channel.length ? (
        <TableSection title="By channel" rows={data.by_channel} columns={Object.keys(data.by_channel[0] || {})} />
      ) : null}
      {data.by_status && data.by_status.length ? (
        <TableSection title="By status" rows={data.by_status} columns={Object.keys(data.by_status[0] || {})} />
      ) : null}
      {data.by_gateway && data.by_gateway.length ? (
        <TableSection title="By gateway" rows={data.by_gateway} columns={Object.keys(data.by_gateway[0] || {})} />
      ) : null}
      {data.rows && data.rows.length ? (
        <TableSection title="Details" rows={data.rows} columns={Object.keys(data.rows[0] || {})} />
      ) : null}
    </>
  );
}

function TableSection({ title, rows, columns }: { title: string; rows: any[]; columns: string[] }) {
  return (
    <AdminCard>
      <View style={s.sectionHead}>
        <Text style={s.sectionTitle}>{title}</Text>
        <Chip label={`${rows.length} rows`} tone="primary" />
      </View>
      <View style={s.tableHead}>
        {columns.map(c => <Text key={c} style={[s.th, { flex: 1 }]}>{c.replace(/_/g, ' ')}</Text>)}
      </View>
      {rows.map((r, i) => (
        <TableRow key={i}>
          {columns.map(c => {
            const v = r[c];
            const disp = typeof v === 'number' ? v.toLocaleString() : (v == null ? '—' : String(v));
            return <Text key={c} style={[s.td, { flex: 1 }]} numberOfLines={1}>{disp}</Text>;
          })}
        </TableRow>
      ))}
    </AdminCard>
  );
}

const s = StyleSheet.create({
  body: { flexDirection: 'row', gap: 0, paddingHorizontal: 32, paddingBottom: 40 },
  sidebar: { width: 220, marginRight: 12 },
  content: { flex: 1 },
  sideHead: { fontSize: 10, fontWeight: '900', color: theme.colors.mutedLight, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, paddingHorizontal: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, marginBottom: 1 },
  itemActive: { backgroundColor: theme.colors.brand },
  itemTxt: { flex: 1, fontSize: 12, fontWeight: '700', color: theme.colors.onSurfaceTertiary },
  rangePill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.brandTertiary },
  rangePillActive: { backgroundColor: theme.colors.brand },
  rangeTxt: { fontSize: 11, fontWeight: '900', color: theme.colors.brand },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.colors.surfaceSecondary, gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '900', color: theme.colors.onSurface },
  tableHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  th: { fontSize: 10, fontWeight: '900', color: theme.colors.muted, letterSpacing: 0.6, textTransform: 'uppercase' },
  td: { fontSize: 12, color: theme.colors.onSurface, fontWeight: '700' },
  err: { color: theme.colors.error, padding: 20, fontWeight: '700' },
});
