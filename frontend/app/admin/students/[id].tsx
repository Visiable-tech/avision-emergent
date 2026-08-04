import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/src/api';
import { theme } from '@/src/theme';
import { AdminHeader, AdminCard, Chip, Btn, EmptyState } from '@/src/admin/ui';

export default function StudentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const d = await api.admin.studentDetail(id);
      setData(d);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed');
    } finally { setLoading(false); }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleAdmin = async () => {
    if (!data?.student) return;
    const cur = new Set<string>(data.student.roles || []);
    if (cur.has('admin')) cur.delete('admin'); else cur.add('admin');
    setBusy(true);
    try {
      await api.admin.setStudentRoles(id!, Array.from(cur));
      await load();
    } catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }
  if (!data?.student) return <EmptyState text="Student not found" />;
  const stu = data.student;
  const ents = data.entitlements || [];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
      <AdminHeader
        title={stu.name}
        subtitle={`${stu.avision_id || '—'} • ${stu.email}`}
        action={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn label="Back" icon="chevron-back" variant="ghost" onPress={() => router.back()} />
            <Btn label={stu.roles?.includes('admin') ? 'Revoke admin' : 'Make admin'} icon="key" variant={stu.roles?.includes('admin') ? 'danger' : 'primary'} busy={busy} onPress={toggleAdmin} />
            <Btn label="Enroll" icon="add-circle" variant="success" onPress={() => router.push(`/admin/enroll?user_id=${stu.user_id}`)} />
          </View>
        }
      />

      <AdminCard>
        <View style={s.profile}>
          <View style={s.avatar}><Text style={s.avatarTxt}>{(stu.name || 'A').charAt(0).toUpperCase()}</Text></View>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {(stu.roles || ['student']).map((r: string) => (
                <Chip key={r} label={r} tone={r === 'admin' ? 'primary' : 'default'} />
              ))}
              {stu.active ? <Chip label="active" tone="success" /> : <Chip label="inactive" tone="warning" />}
              {stu.category_id ? <Chip label={stu.category_id} /> : null}
              {stu.admission_source ? <Chip label={stu.admission_source} /> : null}
            </View>
            <Text style={s.dline}><Text style={s.dlbl}>Phone:</Text> {stu.phone || '—'}</Text>
            <Text style={s.dline}><Text style={s.dlbl}>Language:</Text> {stu.language || 'en'}</Text>
            <Text style={s.dline}><Text style={s.dlbl}>XP:</Text> {stu.xp ?? 0} • <Text style={s.dlbl}>Coins:</Text> {stu.coins ?? 0} • <Text style={s.dlbl}>Streak:</Text> {stu.streak ?? 0}</Text>
            <Text style={s.dline}><Text style={s.dlbl}>Joined:</Text> {stu.created_at ? new Date(stu.created_at).toLocaleDateString() : '—'}</Text>
          </View>
        </View>
      </AdminCard>

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 32, marginBottom: 8 }}>
        <Text style={s.section}>Entitlements ({ents.length})</Text>
      </View>
      <AdminCard>
        {ents.length === 0 ? (
          <EmptyState text="No entitlements yet" icon="shield-checkmark" />
        ) : (
          <View>
            <View style={s.head}>
              <Text style={[s.hcell, { flex: 2 }]}>Product</Text>
              <Text style={[s.hcell, { flex: 1 }]}>Type</Text>
              <Text style={[s.hcell, { flex: 1 }]}>Source</Text>
              <Text style={[s.hcell, { flex: 1.4 }]}>Granted</Text>
              <Text style={[s.hcell, { flex: 1.4 }]}>Expires</Text>
              <Text style={[s.hcell, { width: 80 }]}>Status</Text>
            </View>
            {ents.map((e: any, i: number) => (
              <View key={i} style={s.row}>
                <Text style={[s.cell, { flex: 2, fontWeight: '800' }]} numberOfLines={1}>{e.product?.name || e.product_id}</Text>
                <View style={[s.cell, { flex: 1 }]}><Chip label={e.product_type} tone="default" /></View>
                <View style={[s.cell, { flex: 1 }]}><Chip label={e.source} tone={e.source === 'admin_grant' ? 'primary' : 'default'} /></View>
                <Text style={[s.cell, { flex: 1.4, fontSize: 11.5 }]}>{fmt(e.granted_at)}</Text>
                <Text style={[s.cell, { flex: 1.4, fontSize: 11.5 }]}>{fmt(e.expires_at)}</Text>
                <View style={{ width: 80 }}><Chip label={e.active ? 'active' : 'inactive'} tone={e.active ? 'success' : 'warning'} /></View>
              </View>
            ))}
          </View>
        )}
      </AdminCard>
    </ScrollView>
  );
}

function fmt(iso?: string) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return iso; }
}

const s = StyleSheet.create({
  profile: { flexDirection: 'row', gap: 20, padding: 20 },
  avatar: { width: 64, height: 64, borderRadius: 16, backgroundColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  dline: { fontSize: 12.5, color: theme.colors.onSurface },
  dlbl: { color: theme.colors.muted, fontWeight: '800' },
  section: { fontSize: 13, fontWeight: '900', color: theme.colors.onSurface, marginTop: 4, marginBottom: 4 },
  head: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, backgroundColor: theme.colors.surfaceSecondary, gap: 12 },
  hcell: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, gap: 12 },
  cell: { fontSize: 12.5, color: theme.colors.onSurface },
});
