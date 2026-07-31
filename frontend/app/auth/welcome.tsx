import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { useI18n } from '@/src/i18n';

export default function Welcome() {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <LinearGradient colors={[theme.colors.brand, theme.colors.brandDark]} style={s.hero}>
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <View style={s.heroInner}>
            <View style={s.logoBox}>
              <Ionicons name="school" size={44} color="#FFF" />
            </View>
            <Text style={s.brand}>Avision Institute</Text>
            <Text style={s.tag}>{t('brandTag')}</Text>
            <View style={s.badgeRow}>
              <View style={s.badge}><Ionicons name="sparkles" size={12} color={theme.colors.gold} /><Text style={s.badgeTxt}>{t('aiTutor')}</Text></View>
              <View style={s.badge}><Ionicons name="trophy" size={12} color={theme.colors.gold} /><Text style={s.badgeTxt}>{t('tests')}</Text></View>
              <View style={s.badge}><Ionicons name="videocam" size={12} color={theme.colors.gold} /><Text style={s.badgeTxt}>{t('liveClasses')}</Text></View>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={s.bottom}>
        <Text style={s.title}>{t('startJourney')}</Text>
        <Text style={s.subtitle}>{t('joinSub')}</Text>

        <Pressable
          testID="welcome-register"
          style={s.primaryBtn}
          onPress={() => router.push('/auth/category-select')}
        >
          <Text style={s.primaryTxt}>{t('createAccount')}</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFF" />
        </Pressable>

        <Pressable
          testID="welcome-login"
          style={s.secondaryBtn}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={s.secondaryTxt}>{t('haveAccount')}</Text>
        </Pressable>

        <Text style={s.legal}>{t('agreeTerms')}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { flex: 1 },
  heroInner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  logoBox: { width: 88, height: 88, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  brand: { color: '#FFF', fontSize: 30, fontWeight: '800' },
  tag: { color: 'rgba(255,255,255,0.85)', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 26 },
  badge: { flexDirection: 'row', gap: 4, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  badgeTxt: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  bottom: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 32, marginTop: -24 },
  title: { fontSize: 22, fontWeight: '800', color: theme.colors.onSurface, marginTop: 8 },
  subtitle: { fontSize: 13, color: theme.colors.muted, marginTop: 4 },
  primaryBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', height: 54, borderRadius: 16, backgroundColor: theme.colors.brand, marginTop: 22 },
  primaryTxt: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  secondaryBtn: { alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 16, backgroundColor: theme.colors.brandTertiary, marginTop: 10 },
  secondaryTxt: { color: theme.colors.brand, fontSize: 14, fontWeight: '700' },
  legal: { textAlign: 'center', fontSize: 11, color: theme.colors.muted, marginTop: 18 },
});
