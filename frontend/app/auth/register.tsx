import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';
import { useI18n } from '@/src/i18n';
import { useCategory } from '@/src/CategoryContext';

export default function Register() {
  const params = useLocalSearchParams<{ category_id?: string }>();
  const router = useRouter();
  const { signInWithToken } = useAuth();
  const { setCategoryId } = useCategory();
  const { t, lang } = useI18n();
  const [category, setCategory] = useState<any>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!params.category_id) { router.replace('/auth/category-select'); return; }
    api.categoryDetail(params.category_id).then(setCategory).catch(() => {});
  }, [params.category_id]);

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    if (!params.category_id) return t('errCategoryMissing');
    if (form.name.trim().length < 2) return t('errNameShort');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return t('errEmail');
    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) return t('errPhone');
    if (form.password.length < 6) return t('errPwShort');
    if (form.password !== form.confirm) return t('errPwMismatch');
    return null;
  };

  const submit = async () => {
    const v = validate(); if (v) { setErr(v); return; }
    setErr(null); setSubmitting(true);
    try {
      const res: any = await api.register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.phone.trim(),
        category_id: params.category_id!,
        language: lang,
      });
      await setCategoryId(params.category_id!, false);
      await signInWithToken(res.access_token, res.user);
      router.replace('/(tabs)');
    } catch (e: any) {
      setErr(e.message || 'Registration failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <SafeAreaView edges={['top']} style={s.head}>
        <View style={s.headRow}>
          <Pressable testID="reg-back" style={s.iconBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={theme.colors.onSurface} />
          </Pressable>
          <View style={s.stepper}>
            <View style={[s.stepDot, s.stepDotDone]}><Ionicons name="checkmark" size={14} color="#FFF" /></View>
            <View style={[s.stepLine, s.stepLineActive]} />
            <View style={[s.stepDot, s.stepDotActive]}><Text style={s.stepTxtActive}>2</Text></View>
          </View>
          <View style={{ width: 38 }} />
        </View>
        <Text style={s.title}>{t('createYourAccount')}</Text>
        <Text style={s.subtitle}>{t('oneStepAway')}</Text>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          {category && (
            <View style={s.catChip}>
              <View style={[s.chipIcon, { backgroundColor: theme.colors.brandTertiary }]}>
                <Ionicons name={category.icon} size={20} color={theme.colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.chipLabel}>{t('selectedCategoryLabel')}</Text>
                <Text style={s.chipTitle} numberOfLines={1}>{category.name}</Text>
              </View>
              <Pressable testID="change-category" style={s.chipChange} onPress={() => router.back()}>
                <Text style={s.chipChangeTxt}>{t('change')}</Text>
              </Pressable>
            </View>
          )}

          <Field label={t('fullName')} icon="person-outline" value={form.name} onChangeText={(t: string) => update('name', t)} placeholder="Aarav Sharma" testID="reg-name" autoCapitalize="words" />
          <Field label={t('emailAddress')} icon="mail-outline" value={form.email} onChangeText={(t: string) => update('email', t)} placeholder="you@email.com" testID="reg-email" keyboardType="email-address" autoCapitalize="none" />
          <Field label={t('mobileNumber')} icon="call-outline" value={form.phone} onChangeText={(t: string) => update('phone', t.replace(/\D/g, '').slice(0, 10))} placeholder="9876543210" testID="reg-phone" keyboardType="number-pad" maxLength={10} prefix="+91" />
          <Field label={t('password')} icon="lock-closed-outline" value={form.password} onChangeText={(t: string) => update('password', t)} placeholder={t('passwordHint')} testID="reg-password" secureTextEntry={!showPw} toggle={{ show: showPw, onPress: () => setShowPw((v) => !v) }} />
          <Field label={t('confirmPassword')} icon="lock-closed-outline" value={form.confirm} onChangeText={(t: string) => update('confirm', t)} placeholder={t('reEnter')} testID="reg-confirm" secureTextEntry={!showConfirm} toggle={{ show: showConfirm, onPress: () => setShowConfirm((v) => !v) }} />

          {err && (
            <View testID="reg-error" style={s.errBox}>
              <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
              <Text style={s.errTxt}>{err}</Text>
            </View>
          )}

          <Pressable testID="reg-submit" style={[s.cta, submitting && { opacity: 0.7 }]} onPress={submit} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#FFF" /> : (
              <>
                <Text style={s.ctaTxt}>{t('createAccount')}</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </>
            )}
          </Pressable>

          <View style={s.loginRow}>
            <Text style={s.loginQ}>{t('alreadyAccount')}</Text>
            <Pressable testID="reg-goto-login" onPress={() => router.replace('/auth/login')}>
              <Text style={s.loginLink}>{t('login')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field(props: any) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={s.label}>{props.label}</Text>
      <View style={s.inputWrap}>
        <Ionicons name={props.icon} size={18} color={theme.colors.muted} style={{ marginLeft: 12 }} />
        {props.prefix && <Text style={s.prefix}>{props.prefix}</Text>}
        <TextInput
          testID={props.testID}
          style={s.input}
          value={props.value}
          onChangeText={props.onChangeText}
          placeholder={props.placeholder}
          placeholderTextColor={theme.colors.mutedLight}
          secureTextEntry={props.secureTextEntry}
          autoCapitalize={props.autoCapitalize}
          keyboardType={props.keyboardType}
          maxLength={props.maxLength}
        />
        {props.toggle && (
          <Pressable style={{ padding: 12 }} onPress={props.toggle.onPress}>
            <Ionicons name={props.toggle.show ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.muted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  head: { paddingHorizontal: 20, paddingBottom: 12 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: theme.colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.surfaceTertiary, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: theme.colors.brand },
  stepDotDone: { backgroundColor: theme.colors.success },
  stepTxtActive: { fontSize: 12, fontWeight: '800', color: '#FFF' },
  stepLine: { width: 24, height: 2, backgroundColor: theme.colors.border },
  stepLineActive: { backgroundColor: theme.colors.success },
  title: { fontSize: 24, fontWeight: '800', color: theme.colors.onSurface, marginTop: 14 },
  subtitle: { fontSize: 13, color: theme.colors.muted, marginTop: 4 },
  catChip: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: theme.colors.brandTertiary, borderRadius: 16, padding: 12 },
  chipIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chipLabel: { fontSize: 10, fontWeight: '800', color: theme.colors.brand, letterSpacing: 0.5 },
  chipTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.onSurface, marginTop: 2 },
  chipChange: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#FFF' },
  chipChangeTxt: { fontSize: 12, fontWeight: '700', color: theme.colors.brand },
  label: { fontSize: 12, fontWeight: '700', color: theme.colors.onSurfaceSecondary, marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceSecondary, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border },
  prefix: { fontSize: 14, color: theme.colors.onSurface, fontWeight: '700', paddingLeft: 8 },
  input: { flex: 1, height: 48, paddingHorizontal: 12, fontSize: 14, color: theme.colors.onSurface },
  errBox: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, marginTop: 14 },
  errTxt: { flex: 1, fontSize: 13, color: theme.colors.error, fontWeight: '600' },
  cta: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', height: 54, borderRadius: 16, backgroundColor: theme.colors.brand, marginTop: 22 },
  ctaTxt: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  loginRow: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: 18 },
  loginQ: { fontSize: 13, color: theme.colors.muted },
  loginLink: { fontSize: 13, fontWeight: '800', color: theme.colors.brand },
});
