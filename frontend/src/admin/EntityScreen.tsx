import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal, Switch, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/api';
import { theme } from '@/src/theme';
import { AdminHeader, AdminCard, Btn, SearchInput, EmptyState, Chip, TableRow } from '@/src/admin/ui';

export type FieldType = 'text' | 'textarea' | 'number' | 'bool' | 'json' | 'image' | 'url' | 'select' | 'chips' | 'visibility';

export type FieldSpec = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: { label: string; value: string }[];
  required?: boolean;
  colSpan?: 1 | 2;
  help?: string;
};

export type EntityScreenProps = {
  entity: string;
  title: string;
  subtitle?: string;
  icon?: any;
  fields: FieldSpec[];
  primaryLabel?: string;                       // column shown in list (default: title/name)
  extraColumns?: { key: string; label: string; format?: (v: any) => string }[];
  helpNote?: string;
  clientBadge?: 'app' | 'website' | 'both';    // shows a badge for where this entity is consumed
};

export default function EntityScreen({ entity, title, subtitle, icon, fields, primaryLabel, extraColumns = [], helpNote, clientBadge }: EntityScreenProps) {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<any | null>(null);      // row being edited (or {} for create)
  const [saving, setSaving] = useState(false);
  const [showJson, setShowJson] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await api.admin.cmsList(entity, { q, limit: 100 });
      setRows(r.items || []);
      setTotal(r.total || 0);
    } catch (e: any) {
      setErr(e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }, [entity, q]);

  useEffect(() => { load(); }, [load]);

  const primaryKey = useMemo(() => {
    if (primaryLabel) return primaryLabel;
    if (fields.find(f => f.key === 'title')) return 'title';
    if (fields.find(f => f.key === 'name')) return 'name';
    return fields[0]?.key || 'id';
  }, [primaryLabel, fields]);

  const onSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const isNew = !editing.id;
      const body: any = {};
      fields.forEach(f => {
        let v = editing[f.key];
        if (v === undefined) return;
        if (f.type === 'number') v = Number(v) || 0;
        if (f.type === 'json' && typeof v === 'string') {
          try { v = JSON.parse(v); } catch { /* keep as string; server will reject */ }
        }
        body[f.key] = v;
      });
      if (isNew) await api.admin.cmsCreate(entity, body);
      else await api.admin.cmsUpdate(entity, editing.id, body);
      setEditing(null);
      await load();
    } catch (e: any) {
      alert(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (row: any) => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (!window.confirm(`Delete "${row[primaryKey] || row.id}"?`)) return;
    }
    try {
      await api.admin.cmsDelete(entity, row.id);
      await load();
    } catch (e: any) {
      alert(e.message || 'Delete failed');
    }
  };

  return (
    <ScrollView style={{ flex: 1 }}>
      <AdminHeader
        title={title}
        subtitle={subtitle || `Common backend • entity: ${entity}`}
        action={
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {clientBadge ? (
              <View style={s.clientBadge}>
                <Ionicons name={clientBadge === 'website' ? 'globe' : clientBadge === 'app' ? 'phone-portrait' : 'sync'} size={11} color={theme.colors.brand} />
                <Text style={s.clientBadgeTxt}>{clientBadge === 'both' ? 'App + Website' : clientBadge}</Text>
              </View>
            ) : null}
            <SearchInput value={q} onChangeText={setQ} placeholder="Search…" />
            <Btn label="New" icon="add" onPress={() => setEditing({})} />
          </View>
        }
      />
      {helpNote ? (
        <View style={s.helpNote}>
          <Ionicons name="information-circle" size={14} color={theme.colors.brand} />
          <Text style={s.helpNoteTxt}>{helpNote}</Text>
        </View>
      ) : null}

      <AdminCard>
        <View style={s.tableHead}>
          <Text style={[s.th, { flex: 2 }]}>{fields.find(f => f.key === primaryKey)?.label || 'Name'}</Text>
          {extraColumns.map(c => <Text key={c.key} style={[s.th, { flex: 1 }]}>{c.label}</Text>)}
          <Text style={[s.th, { width: 100 }]}>Status</Text>
          <Text style={[s.th, { width: 140, textAlign: 'right' }]}>Actions</Text>
        </View>

        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={theme.colors.brand} /></View>
        ) : err ? (
          <View style={{ padding: 20 }}><Text style={s.err}>{err}</Text></View>
        ) : rows.length === 0 ? (
          <EmptyState text="Nothing here yet. Tap 'New' to add the first item." icon="folder-open" />
        ) : (
          rows.map((r, i) => (
            <TableRow key={r.id || i}>
              <View style={{ flex: 2 }}>
                <Text style={s.rowTitle} numberOfLines={1}>{r[primaryKey] || r.id}</Text>
                <Text style={s.rowSub} numberOfLines={1}>{r.id}</Text>
              </View>
              {extraColumns.map(c => (
                <Text key={c.key} style={[s.td, { flex: 1 }]} numberOfLines={1}>
                  {c.format ? c.format(r[c.key]) : (r[c.key] ?? '—')}
                </Text>
              ))}
              <View style={{ width: 100 }}>
                <Chip label={r.active === false ? 'inactive' : 'active'} tone={r.active === false ? 'default' : 'success'} />
              </View>
              <View style={{ width: 140, flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
                <Pressable onPress={() => setShowJson(r)} style={s.iconBtn}>
                  <Ionicons name="code-slash" size={13} color={theme.colors.onSurfaceTertiary} />
                </Pressable>
                <Pressable onPress={() => setEditing(r)} style={s.iconBtn}>
                  <Ionicons name="create" size={13} color={theme.colors.brand} />
                </Pressable>
                <Pressable onPress={() => onDelete(r)} style={s.iconBtn}>
                  <Ionicons name="trash" size={13} color={theme.colors.error} />
                </Pressable>
              </View>
            </TableRow>
          ))
        )}
        <View style={s.tableFoot}>
          <Text style={s.footTxt}>{rows.length} of {total}</Text>
        </View>
      </AdminCard>

      {/* Create/Edit Modal */}
      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <View style={s.modalBg}>
          <View style={s.modal}>
            <View style={s.modalHead}>
              <View>
                <Text style={s.modalTitle}>{editing?.id ? 'Edit' : 'New'} {title}</Text>
                <Text style={s.modalSub}>Stored in common backend • auto-available to App/Website</Text>
              </View>
              <Pressable onPress={() => setEditing(null)} hitSlop={10}>
                <Ionicons name="close" size={20} color={theme.colors.muted} />
              </Pressable>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
              <View style={s.formGrid}>
                {fields.map(f => (
                  <FormField key={f.key} spec={f} value={editing?.[f.key]}
                             onChange={(v) => setEditing((cur: any) => ({ ...cur, [f.key]: v }))} />
                ))}
              </View>
            </ScrollView>
            <View style={s.modalFoot}>
              <Btn label="Cancel" variant="ghost" onPress={() => setEditing(null)} />
              <Btn label={editing?.id ? 'Save changes' : 'Create'} busy={saving} onPress={onSave} icon="checkmark" />
            </View>
          </View>
        </View>
      </Modal>

      {/* JSON preview modal */}
      <Modal visible={!!showJson} transparent animationType="fade" onRequestClose={() => setShowJson(null)}>
        <View style={s.modalBg}>
          <View style={[s.modal, { maxWidth: 700 }]}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Common backend record</Text>
              <Pressable onPress={() => setShowJson(null)} hitSlop={10}>
                <Ionicons name="close" size={20} color={theme.colors.muted} />
              </Pressable>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
              <Text style={s.code}>{JSON.stringify(showJson, null, 2)}</Text>
            </ScrollView>
            <View style={s.modalFoot}>
              <Btn label="Close" onPress={() => setShowJson(null)} variant="ghost" />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function FormField({ spec, value, onChange }: { spec: FieldSpec; value: any; onChange: (v: any) => void }) {
  const width = spec.colSpan === 2 ? '100%' : '48%';
  const labelTxt = <Text style={s.label}>{spec.label}{spec.required ? ' *' : ''}</Text>;

  if (spec.type === 'bool') {
    return (
      <View style={[s.fieldRow, { width }]}>
        {labelTxt}
        <Switch value={!!value} onValueChange={onChange} />
      </View>
    );
  }
  if (spec.type === 'visibility') {
    const v = value || { app: true, website: true, admin_only: false };
    return (
      <View style={[s.fieldRow, { width: '100%' }]}>
        {labelTxt}
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={s.toggleRow}>
            <Text style={s.toggleLbl}>Visible on App</Text>
            <Switch value={!!v.app} onValueChange={(x) => onChange({ ...v, app: x })} />
          </View>
          <View style={s.toggleRow}>
            <Text style={s.toggleLbl}>Visible on Website</Text>
            <Switch value={!!v.website} onValueChange={(x) => onChange({ ...v, website: x })} />
          </View>
          <View style={s.toggleRow}>
            <Text style={s.toggleLbl}>Admin only</Text>
            <Switch value={!!v.admin_only} onValueChange={(x) => onChange({ ...v, admin_only: x })} />
          </View>
        </View>
      </View>
    );
  }
  if (spec.type === 'select') {
    return (
      <View style={[s.fieldRow, { width }]}>
        {labelTxt}
        <View style={s.selectRow}>
          {(spec.options || []).map(o => {
            const active = value === o.value;
            return (
              <Pressable key={o.value} onPress={() => onChange(o.value)} style={[s.pill, active && s.pillActive]}>
                <Text style={[s.pillTxt, active && { color: '#FFF' }]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }
  if (spec.type === 'chips') {
    const arr: string[] = Array.isArray(value) ? value : (typeof value === 'string' && value ? value.split(',').map((x: string) => x.trim()) : []);
    return (
      <View style={[s.fieldRow, { width }]}>
        {labelTxt}
        <TextInput
          style={s.input}
          value={arr.join(', ')}
          placeholder={spec.placeholder || 'comma, separated, tags'}
          placeholderTextColor={theme.colors.mutedLight}
          onChangeText={(t) => onChange(t.split(',').map(x => x.trim()).filter(Boolean))}
        />
      </View>
    );
  }
  if (spec.type === 'textarea' || spec.type === 'json') {
    const display = spec.type === 'json' ? (typeof value === 'string' ? value : JSON.stringify(value ?? '', null, 2)) : (value ?? '');
    return (
      <View style={[s.fieldRow, { width: '100%' }]}>
        {labelTxt}
        <TextInput
          style={[s.input, { height: 120, textAlignVertical: 'top' }]}
          multiline
          numberOfLines={5}
          value={display}
          placeholder={spec.placeholder}
          placeholderTextColor={theme.colors.mutedLight}
          onChangeText={onChange}
        />
        {spec.help ? <Text style={s.help}>{spec.help}</Text> : null}
      </View>
    );
  }
  // text / number / url / image
  return (
    <View style={[s.fieldRow, { width }]}>
      {labelTxt}
      <TextInput
        style={s.input}
        value={value == null ? '' : String(value)}
        keyboardType={spec.type === 'number' ? 'numeric' : 'default'}
        placeholder={spec.placeholder}
        placeholderTextColor={theme.colors.mutedLight}
        onChangeText={onChange}
      />
      {spec.help ? <Text style={s.help}>{spec.help}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  clientBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.brandTertiary, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  clientBadgeTxt: { color: theme.colors.brand, fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  helpNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 32, marginBottom: 12, backgroundColor: theme.colors.brandTertiary, padding: 10, borderRadius: 8 },
  helpNoteTxt: { flex: 1, fontSize: 11.5, color: theme.colors.brand, fontWeight: '700' },
  tableHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.colors.surfaceSecondary, gap: 12 },
  th: { fontSize: 10.5, fontWeight: '900', color: theme.colors.muted, letterSpacing: 0.6, textTransform: 'uppercase' },
  td: { fontSize: 12, color: theme.colors.onSurfaceTertiary, fontWeight: '700' },
  rowTitle: { fontSize: 12.5, color: theme.colors.onSurface, fontWeight: '900' },
  rowSub: { fontSize: 10.5, color: theme.colors.mutedLight, fontWeight: '700', marginTop: 2 },
  tableFoot: { padding: 12, alignItems: 'center' },
  footTxt: { fontSize: 11, color: theme.colors.mutedLight, fontWeight: '700' },
  err: { color: theme.colors.error, fontSize: 12, fontWeight: '700' },
  iconBtn: { padding: 6, borderRadius: 6, backgroundColor: theme.colors.surfaceSecondary },

  modalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { width: '100%', maxWidth: 900, maxHeight: '90%', backgroundColor: theme.colors.surface, borderRadius: 16, overflow: 'hidden' },
  modalHead: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, gap: 8 },
  modalTitle: { flex: 1, fontSize: 15, fontWeight: '900', color: theme.colors.onSurface },
  modalSub: { fontSize: 11, color: theme.colors.muted, fontWeight: '700', marginTop: 3 },
  modalFoot: { flexDirection: 'row', justifyContent: 'flex-end', padding: 14, borderTopWidth: 1, borderTopColor: theme.colors.divider, gap: 8 },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  fieldRow: { gap: 6 },
  label: { fontSize: 11, color: theme.colors.muted, fontWeight: '900', letterSpacing: 0.4, textTransform: 'uppercase' },
  input: { backgroundColor: theme.colors.surfaceSecondary, borderRadius: 8, padding: 10, fontSize: 12.5, color: theme.colors.onSurface, borderWidth: 1, borderColor: theme.colors.border, outlineStyle: 'none' as any },
  help: { fontSize: 10.5, color: theme.colors.mutedLight, fontWeight: '700' },
  selectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: theme.colors.surfaceSecondary, borderRadius: 20 },
  pillActive: { backgroundColor: theme.colors.brand },
  pillTxt: { fontSize: 11, fontWeight: '900', color: theme.colors.onSurfaceTertiary },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.surfaceSecondary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  toggleLbl: { fontSize: 11, color: theme.colors.onSurfaceTertiary, fontWeight: '700' },
  code: { fontFamily: Platform.select({ web: 'ui-monospace, "SF Mono", Menlo, monospace', default: 'monospace' }) as any, fontSize: 11, color: theme.colors.onSurface, backgroundColor: theme.colors.surfaceSecondary, padding: 12, borderRadius: 8 },
});
