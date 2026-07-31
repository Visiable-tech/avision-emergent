import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';

export default function ForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'reset' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPw, setNewPw] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErr('Enter a valid email.'); return; }
    setErr(null); setLoading(true);
    try {
      const res: any = await api.forgotPassword(email.trim().toLowerCase());
      // Mock flow: token surfaced in response for demo purposes
      if (res.mock_reset_token) {
        setToken(res.mock_reset_token);
        setMsg(`Reset code sent. For demo, we auto-filled the token below. In production this would go to your email.`);
      } else {
        setMsg('If this email is registered, a reset link has been sent.');
      }
      setStep('reset');
    } catch (e: any) {
      setErr(e.message || 'Something went wrong.');
    } finally { setLoading(false); }
  };

  const doReset = async () => {
    if (!token) { setErr('Enter your reset token.'); return; }
    if (newPw.length < 6) { setErr('Password must be at least 6 characters.'); return; }
    setErr(null); setLoading(true);
    try {
      await api.resetPassword(token, newPw);
      setStep('done');
    } catch (e: any) {
      setErr(e.message || 'Reset failed. Token may be invalid or expired.');
    } finally { setLoading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <SafeAreaView edges={['top']} style={s.head}>
        <Pressable testID="fp-back" style={s.iconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.onSurface} />
        </Pressable>
        <Text style={s.title}>Reset Password</Text>
        <Text style={s.subtitle}>
          {step === 'email' && "Enter your email and we'll send you a reset code."}
          {step === 'reset' && 'Enter the reset code and choose a new password.'}
          {step === 'done' && 'Your password has been reset.'}
        </Text>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
          {step === 'email' && (
            <>
              <Text style={s.label}>Email Address</Text>
              <View style={s.inputWrap}>
                <Ionicons name="mail-outline" size={18} color={theme.colors.muted} style={{ marginLeft: 12 }} />
                <TextInput
                  testID="fp-email"
                  style={s.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@email.com"
                  placeholderTextColor={theme.colors.mutedLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {err && <Text style={s.err}>{err}</Text>}
              <Pressable testID="fp-send" style={[s.cta, loading && { opacity: 0.7 }]} onPress={sendCode} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.ctaTxt}>Send Reset Code</Text>}
              </Pressable>
            </>
          )}

          {step === 'reset' && (
            <>
              {msg && <View style={s.info}><Ionicons name="information-circle" size={16} color={theme.colors.info} /><Text style={s.infoTxt}>{msg}</Text></View>}
              <Text style={s.label}>Reset Code</Text>
              <View style={s.inputWrap}>
                <Ionicons name="key-outline" size={18} color={theme.colors.muted} style={{ marginLeft: 12 }} />
                <TextInput testID="fp-token" style={s.input} value={token} onChangeText={setToken} placeholder="Paste code here" placeholderTextColor={theme.colors.mutedLight} autoCapitalize="none" />
              </View>
              <Text style={s.label}>New Password</Text>
              <View style={s.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={theme.colors.muted} style={{ marginLeft: 12 }} />
                <TextInput testID="fp-newpw" style={s.input} value={newPw} onChangeText={setNewPw} placeholder="Minimum 6 characters" placeholderTextColor={theme.colors.mutedLight} secureTextEntry />
              </View>
              {err && <Text style={s.err}>{err}</Text>}
              <Pressable testID="fp-reset" style={[s.cta, loading && { opacity: 0.7 }]} onPress={doReset} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.ctaTxt}>Reset Password</Text>}
              </Pressable>
            </>
          )}

          {step === 'done' && (
            <View style={s.doneBox}>
              <View style={s.doneIcon}><Ionicons name="checkmark-circle" size={44} color={theme.colors.success} /></View>
              <Text style={s.doneTitle}>Password Reset!</Text>
              <Text style={s.doneSub}>You can now login with your new password.</Text>
              <Pressable testID="fp-goto-login" style={s.cta} onPress={() => router.replace('/auth/login')}>
                <Text style={s.ctaTxt}>Back to Login</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  head: { paddingHorizontal: 20, paddingBottom: 10 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: theme.colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  title: { fontSize: 24, fontWeight: '800', color: theme.colors.onSurface, marginTop: 16 },
  subtitle: { fontSize: 13, color: theme.colors.muted, marginTop: 6, lineHeight: 19 },
  label: { fontSize: 12, fontWeight: '700', color: theme.colors.onSurfaceSecondary, marginBottom: 6, marginTop: 14 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceSecondary, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border },
  input: { flex: 1, height: 48, paddingHorizontal: 12, fontSize: 14, color: theme.colors.onSurface },
  cta: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', height: 54, borderRadius: 16, backgroundColor: theme.colors.brand, marginTop: 22 },
  ctaTxt: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  err: { fontSize: 13, color: theme.colors.error, marginTop: 12, fontWeight: '600' },
  info: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', backgroundColor: theme.colors.brandTertiary, borderRadius: 12, padding: 12, marginBottom: 4 },
  infoTxt: { flex: 1, fontSize: 12, color: theme.colors.onSurfaceSecondary, lineHeight: 17 },
  doneBox: { alignItems: 'center', paddingTop: 40 },
  doneIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.onSurface, marginTop: 18 },
  doneSub: { fontSize: 13, color: theme.colors.muted, marginTop: 6, textAlign: 'center' },
});
