import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';
import { theme } from '@/src/theme';

export default function AdminLogin() {
  const router = useRouter();
  const { signInWithToken } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true); setErr(null);
    try {
      const res: any = await api.login(email.trim().toLowerCase(), password);
      const roles: string[] = res?.user?.roles || [];
      if (!roles.includes('admin')) {
        setErr('This account does not have admin access.');
        setBusy(false);
        return;
      }
      await signInWithToken(res.access_token, res.user);
      router.replace('/admin');
    } catch (e: any) {
      setErr(e?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={s.gate}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="desktop" size={40} color={theme.colors.mutedLight} />
        <Text style={s.gateT}>Admin panel is web-only</Text>
        <Pressable onPress={() => router.replace('/(tabs)')} style={s.gateBtn}>
          <Text style={s.gateBtnTxt}>Back to app</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.card}>
        <View style={s.badge}>
          <Text style={s.badgeTxt}>AV</Text>
        </View>
        <Text style={s.title}>AVISION ONE</Text>
        <Text style={s.subtitle}>Super Admin Console</Text>

        <View style={s.field}>
          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            placeholder="admin@avision.com"
            placeholderTextColor={theme.colors.mutedLight}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            testID="admin-login-email"
          />
        </View>
        <View style={s.field}>
          <Text style={s.label}>Password</Text>
          <View style={s.passRow}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder="••••••••"
              placeholderTextColor={theme.colors.mutedLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              testID="admin-login-password"
            />
            <Pressable onPress={() => setShowPass((v) => !v)} style={s.eye}>
              <Ionicons name={showPass ? 'eye-off' : 'eye'} size={16} color={theme.colors.muted} />
            </Pressable>
          </View>
        </View>

        {err ? (
          <View style={s.errBox}>
            <Ionicons name="alert-circle" size={14} color={theme.colors.error} />
            <Text style={s.errTxt}>{err}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={submit}
          disabled={busy || !email || !password}
          style={[s.cta, (busy || !email || !password) && { opacity: 0.7 }]}
          testID="admin-login-submit"
        >
          {busy ? <ActivityIndicator color="#FFF" /> : (
            <>
              <Text style={s.ctaTxt}>Sign in to Admin</Text>
              <Ionicons name="arrow-forward" size={14} color="#FFF" />
            </>
          )}
        </Pressable>

        <Text style={s.foot}>Only accounts with the <Text style={{ fontWeight: '900' }}>admin</Text> role can access this console.</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.brandDark, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, backgroundColor: theme.colors.surface, borderRadius: 20, padding: 32, alignItems: 'stretch', gap: 8 },
  badge: { width: 56, height: 56, borderRadius: 14, backgroundColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 6 },
  badgeTxt: { color: '#FFF', fontWeight: '900', letterSpacing: 2, fontSize: 20 },
  title: { fontSize: 20, fontWeight: '900', color: theme.colors.onSurface, letterSpacing: 1.2, textAlign: 'center' },
  subtitle: { fontSize: 12, color: theme.colors.muted, fontWeight: '700', letterSpacing: 0.8, textAlign: 'center', marginBottom: 20 },
  field: { gap: 6, marginBottom: 4 },
  label: { fontSize: 11, fontWeight: '900', color: theme.colors.muted, letterSpacing: 0.8, textTransform: 'uppercase' },
  input: { height: 44, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, fontSize: 13, fontWeight: '700', color: theme.colors.onSurface, backgroundColor: theme.colors.surfaceSecondary, outlineStyle: 'none' as any },
  passRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eye: { padding: 8 },
  errBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, marginTop: 8 },
  errTxt: { color: theme.colors.error, fontSize: 11.5, fontWeight: '800', flex: 1 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.brand, height: 46, borderRadius: 12, marginTop: 16 },
  ctaTxt: { color: '#FFF', fontWeight: '900', fontSize: 13.5 },
  foot: { fontSize: 11, color: theme.colors.muted, fontWeight: '700', textAlign: 'center', marginTop: 14 },

  gate: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32, backgroundColor: theme.colors.surface },
  gateT: { fontSize: 15, fontWeight: '900', color: theme.colors.onSurface, marginTop: 8 },
  gateBtn: { marginTop: 14, backgroundColor: theme.colors.brand, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  gateBtnTxt: { color: '#FFF', fontWeight: '900' },
});
