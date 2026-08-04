import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { api } from '@/src/api';
import { theme } from '@/src/theme';
import { AdminHeader, AdminCard, Chip, Btn } from '@/src/admin/ui';

type Item = { label: string; status: string; detail?: string };

const STATUS_TONE: Record<string, { bg: string; fg: string; dot: string; icon: any }> = {
  online: { bg: '#DCFCE7', fg: '#166534', dot: theme.colors.success, icon: 'checkmark-circle' },
  connected: { bg: '#DCFCE7', fg: '#166534', dot: theme.colors.success, icon: 'checkmark-circle' },
  working: { bg: '#DCFCE7', fg: '#166534', dot: theme.colors.success, icon: 'checkmark-circle' },
  test_mode: { bg: '#FEF3C7', fg: '#92400E', dot: theme.colors.warning, icon: 'construct' },
  stale: { bg: '#FEF3C7', fg: '#92400E', dot: theme.colors.warning, icon: 'time' },
  not_configured: { bg: '#F1F5F9', fg: '#475569', dot: theme.colors.mutedLight, icon: 'help-circle' },
  not_connected: { bg: '#FEE2E2', fg: '#991B1B', dot: theme.colors.error, icon: 'radio-button-off' },
  disconnected: { bg: '#FEE2E2', fg: '#991B1B', dot: theme.colors.error, icon: 'close-circle' },
  offline: { bg: '#FEE2E2', fg: '#991B1B', dot: theme.colors.error, icon: 'close-circle' },
  error: { bg: '#FEE2E2', fg: '#991B1B', dot: theme.colors.error, icon: 'alert-circle' },
};

function Row({ label, status, detail }: Item) {
  const tone = STATUS_TONE[status] || STATUS_TONE.not_configured;
  return (
    <View style={s.row}>
      <View style={[s.dot, { backgroundColor: tone.dot }]} />
      <View style={{ flex: 1 }}>
        <Text style={s.rowLabel}>{label}</Text>
        {detail ? <Text style={s.rowDetail}>{detail}</Text> : null}
      </View>
      <View style={[s.pill, { backgroundColor: tone.bg }]}>
        <Ionicons name={tone.icon as any} size={11} color={tone.fg} />
        <Text style={[s.pillTxt, { color: tone.fg }]}>{status.replace('_', ' ')}</Text>
      </View>
    </View>
  );
}

export default function SystemStatus() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.adminExtra.systemStatus();
      setData(d);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
      <AdminHeader
        title="System Status"
        subtitle="Live health of Avision One infrastructure"
        action={<Btn label="Refresh" icon="refresh" variant="ghost" busy={refreshing} onPress={() => { setRefreshing(true); load(); }} />}
      />

      {loading ? (
        <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={theme.colors.brand} /></View>
      ) : !data ? null : (
        <>
          {/* Meta band */}
          <View style={{ paddingHorizontal: 32, flexDirection: 'row', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <Chip label={`env: ${data.environment}`} tone="primary" />
            <Chip label={`api: v${data.api_version}`} />
            <Chip label={`up since: ${fmt(data.boot_time)}`} />
            {data.last_successful_request_at ? <Chip label={`last req: ${fmt(data.last_successful_request_at)}`} /> : null}
            <Chip label={`last db backup: ${data.last_db_backup_at ? fmt(data.last_db_backup_at) : 'not configured'}`} />
          </View>

          <View style={{ paddingHorizontal: 32, flexDirection: 'row', gap: 20, alignItems: 'stretch' }}>
            <View style={{ flex: 1 }}>
              <Text style={s.sectionHdr}>Frontend Applications</Text>
              <AdminCard>
                <Row {...data.frontend.student_app} label="Avision Student App" />
                <Row {...data.frontend.website} label="Avision Website" />
                <Row {...data.frontend.super_admin} label="Super Admin" />
              </AdminCard>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.sectionHdr}>Backend Services</Text>
              <AdminCard>
                <Row {...data.backend.api} />
                <Row {...data.backend.database} />
                <Row {...data.backend.auth} />
                <Row {...data.backend.storage} />
                <Row {...data.backend.video} />
                <Row {...data.backend.payment} />
                <Row {...data.backend.notifications} />
              </AdminCard>
            </View>
          </View>

          <View style={{ paddingHorizontal: 32, marginTop: 8 }}>
            <AdminCard style={{ padding: 16 }}>
              <Text style={s.helpTitle}>How to prove clients are connected</Text>
              <Text style={s.helpTxt}>• <Text style={s.b}>Student App</Text> — open the app tabs on any device (web or mobile) and this widget flips to <Text style={s.b}>connected</Text> within 60s.</Text>
              <Text style={s.helpTxt}>• <Text style={s.b}>Super Admin</Text> — you&apos;re seeing it live because this page runs a heartbeat every 60s while it&apos;s open.</Text>
              <Text style={s.helpTxt}>• <Text style={s.b}>Avision Website</Text> — currently <Text style={s.b}>not_connected</Text> because the staging website has not yet been built (see project roadmap).</Text>
            </AdminCard>
          </View>
        </>
      )}
    </ScrollView>
  );
}

function fmt(iso?: string) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return iso; }
}

const s = StyleSheet.create({
  sectionHdr: { fontSize: 11, fontWeight: '900', color: theme.colors.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowLabel: { fontSize: 13, fontWeight: '900', color: theme.colors.onSurface },
  rowDetail: { fontSize: 11, color: theme.colors.muted, fontWeight: '700', marginTop: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  pillTxt: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  helpTitle: { fontSize: 12.5, fontWeight: '900', color: theme.colors.onSurface, marginBottom: 6 },
  helpTxt: { fontSize: 12, color: theme.colors.onSurfaceTertiary, fontWeight: '700', lineHeight: 20 },
  b: { fontWeight: '900', color: theme.colors.brand },
});
