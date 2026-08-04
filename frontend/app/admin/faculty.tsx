import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { api } from '@/src/api';
import { theme } from '@/src/theme';
import { AdminHeader, Chip, EmptyState } from '@/src/admin/ui';

export default function AdminFaculty() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const d = await api.admin.faculty();
      setRows(d.faculty || []);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
      <AdminHeader title="Faculty Master" subtitle={`${rows.length} educators`} />
      <View style={{ paddingHorizontal: 32, flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center', width: '100%' }}><ActivityIndicator color={theme.colors.brand} /></View>
        ) : rows.length === 0 ? (
          <EmptyState text="No faculty added yet" icon="school" />
        ) : rows.map((f: any) => (
          <View key={f.id} style={s.card}>
            <View style={s.avatarWrap}>
              {f.photo ? (
                <Image source={{ uri: f.photo }} style={s.avatar} contentFit="cover" />
              ) : (
                <View style={[s.avatar, { backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="person" size={32} color={theme.colors.brand} />
                </View>
              )}
            </View>
            <Text style={s.name} numberOfLines={1}>{f.name}</Text>
            <Text style={s.role} numberOfLines={1}>{f.designation || 'Faculty'}</Text>
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
              {f.subject ? <Chip label={f.subject} tone="primary" /> : null}
              {f.experience_years ? <Chip label={`${f.experience_years}y exp`} /> : null}
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
              <Chip label={f.active ? 'active' : 'inactive'} tone={f.active ? 'success' : 'warning'} />
              {f.visibility?.app !== false ? <Chip label="app" /> : null}
              {f.visibility?.website !== false ? <Chip label="web" /> : null}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  card: { width: 220, backgroundColor: theme.colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center' },
  avatarWrap: { marginBottom: 10 },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  name: { fontSize: 13.5, fontWeight: '900', color: theme.colors.onSurface, textAlign: 'center' },
  role: { fontSize: 11, color: theme.colors.muted, fontWeight: '700', textAlign: 'center', marginTop: 2 },
});
