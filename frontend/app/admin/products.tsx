import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '@/src/api';
import { theme } from '@/src/theme';
import { AdminHeader, AdminCard, SearchInput, Chip, Btn, EmptyState } from '@/src/admin/ui';

const TYPES = [
  { id: '', label: 'All' },
  { id: 'live_course', label: 'Live' },
  { id: 'video_course', label: 'Video' },
  { id: 'test_series', label: 'Test' },
  { id: 'booster', label: 'Booster' },
  { id: 'magazine', label: 'Magazine' },
];

export default function AdminProducts() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [type, setType] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [newProd, setNewProd] = useState<any>({ type: 'video_course', name: '', price: 0, offer_price: 0, validity_days: 365, category_id: 'banking', exam_name: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.admin.products(type || undefined, q || undefined, 200);
      setRows(d.products || []);
      setTotal(d.total || 0);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }, [type, q]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const toggleActive = async (p: any) => {
    try {
      await api.admin.updateProduct(p.id, { active: !p.active });
      load();
    } catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
  };

  const saveEdit = async (patch: any) => {
    try {
      await api.admin.updateProduct(editing.id, patch);
      setEditing(null);
      load();
    } catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
      <AdminHeader
        title="Products"
        subtitle={`${total} in catalog`}
        action={
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <SearchInput value={q} onChangeText={setQ} placeholder="Search products" />
            <Btn label="New product" icon="add" onPress={() => setCreating(true)} />
          </View>
        }
      />

      <View style={{ paddingHorizontal: 32, flexDirection: 'row', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {TYPES.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setType(t.id)}
            style={[s.tab, type === t.id && s.tabActive]}
          >
            <Text style={[s.tabTxt, type === t.id && { color: '#FFF' }]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <AdminCard>
        <View style={s.head}>
          <Text style={[s.hcell, { flex: 2.4 }]}>Name</Text>
          <Text style={[s.hcell, { flex: 1 }]}>Type</Text>
          <Text style={[s.hcell, { flex: 1 }]}>Category</Text>
          <Text style={[s.hcell, { width: 100 }]}>Price</Text>
          <Text style={[s.hcell, { width: 100 }]}>Offer</Text>
          <Text style={[s.hcell, { width: 90 }]}>Active</Text>
          <Text style={[s.hcell, { width: 160 }]}>Actions</Text>
        </View>
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={theme.colors.brand} /></View>
        ) : rows.length === 0 ? (
          <EmptyState text="No products" icon="cube" />
        ) : rows.map((r) => (
          <View key={r.id} style={s.row}>
            <View style={[s.cell, { flex: 2.4 }]}>
              <Text style={{ fontWeight: '800', color: theme.colors.onSurface, fontSize: 12.5 }} numberOfLines={1}>{r.name}</Text>
              <Text style={{ fontSize: 10.5, color: theme.colors.muted, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>{r.id}</Text>
            </View>
            <View style={[s.cell, { flex: 1 }]}><Chip label={r.type} tone="default" /></View>
            <Text style={[s.cell, { flex: 1, fontSize: 12 }]}>{r.category_id || '—'}</Text>
            <Text style={[s.cell, { width: 100, fontSize: 12 }]}>₹{Number(r.price || 0).toLocaleString('en-IN')}</Text>
            <Text style={[s.cell, { width: 100, fontSize: 12, fontWeight: '900' }]}>₹{Number(r.offer_price || 0).toLocaleString('en-IN')}</Text>
            <View style={{ width: 90 }}>
              <Pressable onPress={() => toggleActive(r)} style={[s.toggle, r.active && s.toggleOn]}>
                <View style={[s.toggleKnob, r.active && s.toggleKnobOn]} />
              </Pressable>
            </View>
            <View style={{ width: 160, flexDirection: 'row', gap: 6 }}>
              <Btn small label="Edit" icon="create" onPress={() => setEditing({ ...r })} />
              <Btn small variant="ghost" label="View" icon="eye" onPress={() => router.push(`/(tabs)/courses`)} />
            </View>
          </View>
        ))}
      </AdminCard>

      {editing ? (
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Edit product</Text>
              <Pressable onPress={() => setEditing(null)}>
                <Ionicons name="close" size={20} color={theme.colors.muted} />
              </Pressable>
            </View>
            <Text style={s.mLbl}>Name</Text>
            <TextInput style={s.mInput} value={editing.name} onChangeText={(v) => setEditing({ ...editing, name: v })} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.mLbl}>Price (₹)</Text>
                <TextInput style={s.mInput} keyboardType="numeric" value={String(editing.price ?? '')} onChangeText={(v) => setEditing({ ...editing, price: parseInt(v || '0', 10) })} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.mLbl}>Offer price (₹)</Text>
                <TextInput style={s.mInput} keyboardType="numeric" value={String(editing.offer_price ?? '')} onChangeText={(v) => setEditing({ ...editing, offer_price: parseInt(v || '0', 10) })} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.mLbl}>Validity (days)</Text>
                <TextInput style={s.mInput} keyboardType="numeric" value={String(editing.validity_days ?? '')} onChangeText={(v) => setEditing({ ...editing, validity_days: parseInt(v || '0', 10) })} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.mLbl}>Display order</Text>
                <TextInput style={s.mInput} keyboardType="numeric" value={String(editing.display_order ?? '')} onChangeText={(v) => setEditing({ ...editing, display_order: parseInt(v || '0', 10) })} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
              <Btn label="Cancel" variant="ghost" onPress={() => setEditing(null)} />
              <Btn label="Save" icon="save" onPress={() => saveEdit({
                name: editing.name,
                price: editing.price,
                offer_price: editing.offer_price,
                validity_days: editing.validity_days,
                display_order: editing.display_order,
              })} />
            </View>
          </View>
        </View>
      ) : null}

      {creating ? (
        <View style={s.overlay}>
          <View style={[s.modal, { maxWidth: 640 }]}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Create new product</Text>
              <Pressable onPress={() => setCreating(false)}>
                <Ionicons name="close" size={20} color={theme.colors.muted} />
              </Pressable>
            </View>
            <Text style={s.mLbl}>Type</Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {['live_course', 'video_course', 'test_series', 'booster', 'magazine'].map((t) => (
                <Pressable key={t} onPress={() => setNewProd({ ...newProd, type: t })} style={[s.tab, newProd.type === t && s.tabActive]}>
                  <Text style={[s.tabTxt, newProd.type === t && { color: '#FFF' }]}>{t}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={s.mLbl}>Name</Text>
            <TextInput style={s.mInput} placeholder="TEST — AVISION BANKING COURSE" value={newProd.name} onChangeText={(v) => setNewProd({ ...newProd, name: v })} testID="new-prod-name" />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.mLbl}>Category</Text>
                <TextInput style={s.mInput} placeholder="banking" value={newProd.category_id} onChangeText={(v) => setNewProd({ ...newProd, category_id: v })} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.mLbl}>Exam name</Text>
                <TextInput style={s.mInput} placeholder="IBPS PO 2026" value={newProd.exam_name} onChangeText={(v) => setNewProd({ ...newProd, exam_name: v })} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.mLbl}>Price (₹)</Text>
                <TextInput style={s.mInput} keyboardType="numeric" value={String(newProd.price)} onChangeText={(v) => setNewProd({ ...newProd, price: parseInt(v || '0', 10) })} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.mLbl}>Offer price (₹)</Text>
                <TextInput style={s.mInput} keyboardType="numeric" value={String(newProd.offer_price)} onChangeText={(v) => setNewProd({ ...newProd, offer_price: parseInt(v || '0', 10) })} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.mLbl}>Validity (days)</Text>
                <TextInput style={s.mInput} keyboardType="numeric" value={String(newProd.validity_days)} onChangeText={(v) => setNewProd({ ...newProd, validity_days: parseInt(v || '0', 10) })} />
              </View>
            </View>
            <Text style={{ fontSize: 11, color: theme.colors.muted, fontWeight: '700', marginTop: 10 }}>Visible on: <Text style={{ fontWeight: '900', color: theme.colors.brand }}>Student App</Text>{' + '}<Text style={{ fontWeight: '900', color: theme.colors.brand }}>Website</Text> (once website ships)</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
              <Btn label="Cancel" variant="ghost" onPress={() => setCreating(false)} />
              <Btn label="Create product" icon="checkmark-circle" onPress={async () => {
                try {
                  if (!newProd.name.trim()) { Alert.alert('Enter name'); return; }
                  await api.adminExtra.createProduct({
                    type: newProd.type, name: newProd.name.trim(),
                    price: newProd.price, offer_price: newProd.offer_price,
                    validity_days: newProd.validity_days,
                    category_id: newProd.category_id || undefined,
                    exam_name: newProd.exam_name || undefined,
                    visibility: { app: true, website: true, admin_only: false },
                  });
                  setCreating(false);
                  setNewProd({ type: 'video_course', name: '', price: 0, offer_price: 0, validity_days: 365, category_id: 'banking', exam_name: '' });
                  load();
                } catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
              }} testID="new-prod-submit" />
            </View>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  tabActive: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
  tabTxt: { fontSize: 12, fontWeight: '900', color: theme.colors.onSurfaceTertiary },

  head: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, backgroundColor: theme.colors.surfaceSecondary, gap: 12 },
  hcell: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, gap: 12 },
  cell: { fontSize: 12.5, color: theme.colors.onSurface },

  toggle: { width: 40, height: 22, borderRadius: 11, backgroundColor: theme.colors.surfaceSecondary, padding: 2, justifyContent: 'center' },
  toggleOn: { backgroundColor: theme.colors.success },
  toggleKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFF' },
  toggleKnobOn: { marginLeft: 18 },

  overlay: { position: 'absolute', inset: 0 as any, backgroundColor: 'rgba(15,23,42,0.5)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  modal: { width: '100%', maxWidth: 520, backgroundColor: theme.colors.surface, borderRadius: 16, padding: 24 },
  modalHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  modalTitle: { flex: 1, fontSize: 15, fontWeight: '900', color: theme.colors.onSurface },
  mLbl: { fontSize: 11, color: theme.colors.muted, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 8, marginBottom: 4 },
  mInput: { height: 40, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 10, fontSize: 13, fontWeight: '700', color: theme.colors.onSurface, backgroundColor: theme.colors.surfaceSecondary, outlineStyle: 'none' as any },
});
