import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';

export default function Login() {
  const router = useRouter();
  const { signInWithToken } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErr('Please enter a valid email.'); return; }
    if (!password) { setErr('Please enter your password.'); return; }
    setErr(null); setLoading(true);
    try {
      const res: any = await api.login(email.trim().toLowerCase(), password);
      await signInWithToken(res.access_token, res.user);
      router.replace('/(tabs)');
    } catch (e: any) {
      setErr(e.message || 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <LinearGradient colors={[theme.colors.brand, theme.colors.brandDark]} style={s.head}>
        <SafeAreaView edges={['top']}>
          <View style={s.headRow}>
            <Pressable testID="login-back" style={s.iconBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </Pressable>
            <View style={{ width: 38 }} />
          </View>
          <View style={s.heroInfo}>
            <View style={s.logoBox}><Ionicons name="school" size={28} color="#FFF" /></View>
            <Text style={s.brand}>Welcome back</Text>
            <Text style={s.tag}>Sign in to continue your prep</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={s.card}>
            <Text style={s.label}>Email Address</Text>
            <View style={s.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={theme.colors.muted} style={{ marginLeft: 12 }} />
              <TextInput
                testID="login-email"
                style={s.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@email.com"
                placeholderTextColor={theme.colors.mutedLight}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={s.rowBetween}>
              <Text style={s.label}>Password</Text>
              <Pressable testID="login-forgot" onPress={() => router.push('/auth/forgot-password')}>
                <Text style={s.forgot}>Forgot?</Text>
              </Pressable>
            </View>
            <View style={s.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={theme.colors.muted} style={{ marginLeft: 12 }} />
              <TextInput
                testID="login-password"
                style={s.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                placeholderTextColor={theme.colors.mutedLight}
                secureTextEntry={!showPw}
              />
              <Pressable style={{ padding: 12 }} onPress={() => setShowPw((v) => !v)}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.muted} />
              </Pressable>
            </View>

            {err && (
              <View testID="login-error" style={s.errBox}>
                <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
                <Text style={s.errTxt}>{err}</Text>
              </View>
            )}

            <Pressable testID="login-submit" style={[s.cta, loading && { opacity: 0.7 }]} onPress={submit} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <Text style={s.ctaTxt}>Login</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </>
              )}
            </Pressable>
          </View>

          <View style={s.registerRow}>
            <Text style={s.regQ}>New to Avision Institute?</Text>
            <Pressable testID="login-goto-register" onPress={() => router.replace('/auth/course-select')}>
              <Text style={s.regLink}>Create Account</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  head: { paddingBottom: 32, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  heroInfo: { alignItems: 'center', paddingTop: 4 },
  logoBox: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  brand: { color: '#FFF', fontSize: 24, fontWeight: '800' },
  tag: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },
  card: { backgroundColor: theme.colors.surface, borderRadius: 22, padding: 20, marginTop: -22, borderWidth: 1, borderColor: theme.colors.border, ...(theme.shadow.card as object) },
  label: { fontSize: 12, fontWeight: '700', color: theme.colors.onSurfaceSecondary, marginBottom: 6, marginTop: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  forgot: { fontSize: 12, color: theme.colors.brand, fontWeight: '700', marginTop: 14 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceSecondary, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border },
  input: { flex: 1, height: 48, paddingHorizontal: 12, fontSize: 14, color: theme.colors.onSurface },
  errBox: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginTop: 14 },
  errTxt: { flex: 1, fontSize: 13, color: theme.colors.error, fontWeight: '600' },
  cta: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', height: 54, borderRadius: 16, backgroundColor: theme.colors.brand, marginTop: 20 },
  ctaTxt: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  registerRow: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: 24 },
  regQ: { fontSize: 13, color: theme.colors.muted },
  regLink: { fontSize: 13, fontWeight: '800', color: theme.colors.brand },
});
