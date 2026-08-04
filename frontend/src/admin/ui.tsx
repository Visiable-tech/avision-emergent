import { View, Text, StyleSheet, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/src/theme';

export function AdminHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <View style={ui.header}>
      <View style={{ flex: 1 }}>
        <Text style={ui.title}>{title}</Text>
        {subtitle ? <Text style={ui.subtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function AdminCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[ui.card, style]}>{children}</View>;
}

export function Btn({
  label, onPress, icon, variant = 'primary', busy, disabled, small,
}: { label: string; onPress: () => void; icon?: any; variant?: 'primary' | 'ghost' | 'danger' | 'success'; busy?: boolean; disabled?: boolean; small?: boolean }) {
  const bg = variant === 'primary' ? theme.colors.brand
    : variant === 'danger' ? theme.colors.error
    : variant === 'success' ? theme.colors.success
    : theme.colors.brandTertiary;
  const fg = variant === 'ghost' ? theme.colors.brand : '#FFF';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      style={[
        ui.btn,
        { backgroundColor: bg, opacity: disabled ? 0.5 : 1 },
        small && { paddingHorizontal: 10, paddingVertical: 6 },
      ]}
    >
      {busy ? <ActivityIndicator color={fg} size="small" /> : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 12 : 14} color={fg} /> : null}
          <Text style={[ui.btnTxt, { color: fg, fontSize: small ? 11 : 12 }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function SearchInput({ value, onChangeText, placeholder }: { value: string; onChangeText: (v: string) => void; placeholder?: string }) {
  return (
    <View style={ui.search}>
      <Ionicons name="search" size={14} color={theme.colors.muted} />
      <TextInput
        style={ui.searchInput}
        placeholder={placeholder || 'Search…'}
        placeholderTextColor={theme.colors.mutedLight}
        value={value}
        onChangeText={onChangeText}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')}>
          <Ionicons name="close-circle" size={14} color={theme.colors.mutedLight} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Stat({ label, value, icon, tone }: { label: string; value: React.ReactNode; icon?: any; tone?: 'primary' | 'success' | 'warning' | 'default' }) {
  const bg = tone === 'primary' ? theme.colors.brandTertiary
    : tone === 'success' ? '#DCFCE7'
    : tone === 'warning' ? '#FEF3C7'
    : theme.colors.surfaceSecondary;
  const iconColor = tone === 'primary' ? theme.colors.brand
    : tone === 'success' ? theme.colors.success
    : tone === 'warning' ? theme.colors.warning
    : theme.colors.muted;
  return (
    <View style={[ui.stat, { backgroundColor: bg }]}>
      {icon ? (
        <View style={[ui.statIcon, { backgroundColor: '#FFF' }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={ui.statLbl}>{label}</Text>
        <Text style={ui.statVal}>{value}</Text>
      </View>
    </View>
  );
}

export function EmptyState({ text, icon = 'file-tray' }: { text: string; icon?: any }) {
  return (
    <View style={ui.empty}>
      <Ionicons name={icon} size={40} color={theme.colors.mutedLight} />
      <Text style={ui.emptyTxt}>{text}</Text>
    </View>
  );
}

export function Chip({ label, tone = 'default' }: { label: string; tone?: 'default' | 'success' | 'warning' | 'danger' | 'primary' }) {
  const map: any = {
    default: { bg: theme.colors.surfaceSecondary, fg: theme.colors.onSurfaceTertiary },
    primary: { bg: theme.colors.brandTertiary, fg: theme.colors.brand },
    success: { bg: '#DCFCE7', fg: '#166534' },
    warning: { bg: '#FEF3C7', fg: '#92400E' },
    danger: { bg: '#FEE2E2', fg: '#991B1B' },
  };
  const c = map[tone];
  return (
    <View style={[ui.chip, { backgroundColor: c.bg }]}>
      <Text style={[ui.chipTxt, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

export function TableRow({ children, hover }: { children: React.ReactNode; hover?: boolean }) {
  return <View style={[ui.row, hover && ui.rowHover]}>{children}</View>;
}

export const ui = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 32, paddingTop: 28, paddingBottom: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '900', color: theme.colors.onSurface, letterSpacing: -0.5 },
  subtitle: { fontSize: 12.5, color: theme.colors.muted, marginTop: 3, fontWeight: '700' },

  card: { backgroundColor: theme.colors.surface, marginHorizontal: 32, marginBottom: 20, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },

  btn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8 },
  btnTxt: { fontWeight: '900' },

  search: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.surfaceSecondary, borderRadius: 10, paddingHorizontal: 12, height: 36, minWidth: 240 },
  searchInput: { flex: 1, fontSize: 13, color: theme.colors.onSurface, outlineStyle: 'none' as any },

  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12 },
  statIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statLbl: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  statVal: { fontSize: 20, color: theme.colors.onSurface, fontWeight: '900', marginTop: 2, letterSpacing: -0.4 },

  empty: { alignItems: 'center', paddingVertical: 44, gap: 8 },
  emptyTxt: { fontSize: 12.5, color: theme.colors.muted, fontWeight: '700' },

  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  chipTxt: { fontSize: 10, fontWeight: '900', letterSpacing: 0.3 },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, gap: 12 },
  rowHover: { backgroundColor: theme.colors.surfaceSecondary },
});
