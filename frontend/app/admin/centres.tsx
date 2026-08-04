import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '@/src/api';
import { theme } from '@/src/theme';
import { AdminHeader, AdminCard, Chip, Btn, EmptyState } from '@/src/admin/ui';

export default function AdminCentres() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'own', city: '', state: '' });

  const load = useCallback(async () => {
    try {
      const d = await api.admin.centres();
      setRows(d.centres || []);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const create = async () => {
    if (!form.name.trim()) { Alert.alert('Enter centre name'); return; }
    setBusy(true);
    try {
      await api.admin.createCentre({ name: form.name.trim(), type: form.type, city: form.city.trim() || undefined, state: form.state.trim() || undefined });
      setForm({ name: '', type: 'own', city: '', state: '' });
      load();
    } catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
      <AdminHeader title="Centres" subtitle={`${rows.length} centres`} />

      <AdminCard style={{ padding: 20 }}>
        <Text style={s.hdr}>Add new centre</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 2 }}>
            <Text style={s.lbl}>Name</Text>
            <TextInput style={s.input} placeholder="Kolkata Main" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.lbl}>Type</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {['own', 'franchise'].map((t) => (
                <Btn key={t} small variant={form.type === t ? 'primary' : 'ghost'} label={t} onPress={() => setForm({ ...form, type: t })} />
              ))}
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.lbl}>City</Text>
            <TextInput style={s.input} placeholder="Kolkata" value={form.city} onChangeText={(v) => setForm({ ...form, city: v })} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.lbl}>State</Text>
            <TextInput style={s.input} placeholder="West Bengal" value={form.state} onChangeText={(v) => setForm({ ...form, state: v })} />
          </View>
          <View style={{ justifyContent: 'flex-end' }}>
            <Btn label="Add centre" icon="add" busy={busy} onPress={create} />
          </View>
        </View>
      </AdminCard>

      <AdminCard>
        <View style={s.head}>
          <Text style={[s.hcell, { flex: 2 }]}>Name</Text>
          <Text style={[s.hcell, { width: 100 }]}>Type</Text>
          <Text style={[s.hcell, { flex: 1 }]}>City</Text>
          <Text style={[s.hcell, { flex: 1 }]}>State</Text>
          <Text style={[s.hcell, { width: 80 }]}>Status</Text>
        </View>
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={theme.colors.brand} /></View>
        ) : rows.length === 0 ? (
          <EmptyState text="No centres yet" icon="business" />
        ) : rows.map((r) => (
          <View key={r.id} style={s.row}>
            <Text style={[s.cell, { flex: 2, fontWeight: '800' }]}>{r.name}</Text>
            <View style={{ width: 100 }}><Chip label={r.type} tone={r.type === 'own' ? 'primary' : 'default'} /></View>
            <Text style={[s.cell, { flex: 1 }]}>{r.city || '—'}</Text>
            <Text style={[s.cell, { flex: 1 }]}>{r.state || '—'}</Text>
            <View style={{ width: 80 }}><Chip label={r.active ? 'active' : 'inactive'} tone={r.active ? 'success' : 'warning'} /></View>
          </View>
        ))}
      </AdminCard>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  hdr: { fontSize: 13, fontWeight: '900', color: theme.colors.onSurface, marginBottom: 12 },
  lbl: { fontSize: 11, color: theme.colors.muted, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  input: { height: 38, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 10, fontSize: 13, fontWeight: '700', color: theme.colors.onSurface, backgroundColor: theme.colors.surfaceSecondary, outlineStyle: 'none' as any },
  head: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, backgroundColor: theme.colors.surfaceSecondary, gap: 12 },
  hcell: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, gap: 12 },
  cell: { fontSize: 12.5, color: theme.colors.onSurface },
});
