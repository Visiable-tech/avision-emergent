import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/src/api';
import { theme } from '@/src/theme';
import { AdminHeader, AdminCard, SearchInput, Chip, Btn, EmptyState } from '@/src/admin/ui';

export default function AdminStudents() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [skip, setSkip] = useState(0);
  const LIMIT = 25;

  const load = useCallback(async (searchQ = q, offset = 0) => {
    setLoading(true);
    try {
      const d = await api.admin.students(searchQ || undefined, LIMIT, offset);
      setRows(d.students || []);
      setTotal(d.total || 0);
      setSkip(offset);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }, [q]);

  useEffect(() => {
    load('', 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(q, 0), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
      <AdminHeader
        title="Students"
        subtitle={`${total.toLocaleString('en-IN')} total`}
        action={<SearchInput value={q} onChangeText={setQ} placeholder="Search email, name, AV-ID, phone" />}
      />

      <AdminCard>
        <View style={s.head}>
          <Text style={[s.hcell, { flex: 1.2 }]}>AVISION ID</Text>
          <Text style={[s.hcell, { flex: 2 }]}>Name</Text>
          <Text style={[s.hcell, { flex: 2 }]}>Email</Text>
          <Text style={[s.hcell, { flex: 1 }]}>Phone</Text>
          <Text style={[s.hcell, { flex: 1 }]}>Category</Text>
          <Text style={[s.hcell, { flex: 1.4 }]}>Roles</Text>
          <Text style={[s.hcell, { width: 90 }]}>Actions</Text>
        </View>
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator color={theme.colors.brand} />
          </View>
        ) : rows.length === 0 ? (
          <EmptyState text="No students found" icon="people" />
        ) : (
          rows.map((r) => (
            <View key={r.user_id} style={s.row}>
              <Text style={[s.cell, { flex: 1.2, fontWeight: '900', color: theme.colors.brand, fontSize: 11.5 }]} numberOfLines={1}>{r.avision_id || '—'}</Text>
              <Text style={[s.cell, { flex: 2, fontWeight: '800' }]} numberOfLines={1}>{r.name}</Text>
              <Text style={[s.cell, { flex: 2 }]} numberOfLines={1}>{r.email}</Text>
              <Text style={[s.cell, { flex: 1 }]} numberOfLines={1}>{r.phone || '—'}</Text>
              <Text style={[s.cell, { flex: 1 }]} numberOfLines={1}>{r.category_id || '—'}</Text>
              <View style={[s.cell, { flex: 1.4, flexDirection: 'row', gap: 4, flexWrap: 'wrap' }]}>
                {(r.roles || ['student']).map((rl: string) => (
                  <Chip key={rl} label={rl} tone={rl === 'admin' ? 'primary' : 'default'} />
                ))}
              </View>
              <View style={{ width: 90 }}>
                <Btn small label="View" icon="eye" onPress={() => router.push(`/admin/students/${r.user_id}`)} />
              </View>
            </View>
          ))
        )}

        {total > LIMIT ? (
          <View style={s.pager}>
            <Btn small variant="ghost" label="Prev" icon="chevron-back" disabled={skip === 0} onPress={() => load(q, Math.max(0, skip - LIMIT))} />
            <Text style={s.pagerTxt}>{skip + 1}–{Math.min(skip + LIMIT, total)} of {total}</Text>
            <Btn small variant="ghost" label="Next" icon="chevron-forward" disabled={skip + LIMIT >= total} onPress={() => load(q, skip + LIMIT)} />
          </View>
        ) : null}
      </AdminCard>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, backgroundColor: theme.colors.surfaceSecondary, gap: 12 },
  hcell: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, gap: 12 },
  cell: { fontSize: 12.5, color: theme.colors.onSurface },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 14, padding: 12 },
  pagerTxt: { fontSize: 12, color: theme.colors.muted, fontWeight: '800' },
});
