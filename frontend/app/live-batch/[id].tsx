import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, StatusBar as RNStatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';

export default function LiveBatchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [b, setB] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!id) return;
        setB(await api.liveBatchDetail(id));
      } catch (e) { console.warn('batch detail', e); }
      finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }
  if (!b) {
    return (
      <View style={styles.loading}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="alert-circle-outline" size={44} color={theme.colors.mutedLight} />
        <Text style={{ color: theme.colors.muted, marginTop: 10 }}>Batch not found.</Text>
        <Pressable onPress={() => router.back()} style={styles.enrollBtn}>
          <Text style={styles.enrollBtnTxt}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const gradient = b.gradient || ['#0B4DB8', '#083A8E'];

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient colors={gradient} style={styles.hero}>
          <Image source={{ uri: b.banner_image }} style={[StyleSheet.absoluteFillObject, { opacity: 0.22 }]} contentFit="cover" />
          <SafeAreaView edges={['top']}>
            <View style={styles.topRow}>
              <Pressable onPress={() => router.back()} testID="lb-back" hitSlop={10} style={styles.iconBtn}>
                <Ionicons name="chevron-back" size={24} color="#FFF" />
              </Pressable>
              <View style={{ flex: 1 }} />
              <Pressable style={styles.iconBtn} testID="lb-share">
                <Ionicons name="share-social-outline" size={20} color="#FFF" />
              </Pressable>
              <Pressable style={styles.iconBtn} testID="lb-save">
                <Ionicons name="bookmark-outline" size={20} color="#FFF" />
              </Pressable>
            </View>
            <View style={styles.heroBody}>
              <View style={styles.chipsRow}>
                <View style={styles.liveBadge}>
                  <View style={styles.livePulse} />
                  <Text style={styles.liveBadgeTxt}>LIVE</Text>
                </View>
                <View style={styles.chip}>
                  <Ionicons name="school" size={11} color="#FFF" />
                  <Text style={styles.chipTxt}>{b.faculty_logo || 'AVISION'}</Text>
                </View>
                {b.discount_pct ? (
                  <View style={[styles.discountRibbon, { backgroundColor: b.accent || '#EF4444' }]}>
                    <Text style={styles.discountRibbonTxt}>{b.discount_pct}% OFF</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.batchLabel}>{b.batch_label}</Text>
              <Text style={styles.courseName}>{b.name}</Text>
              <Text style={styles.examName}>{b.exam_name}</Text>
              <Text style={styles.faculty}>{b.faculty}</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* Overview stats */}
        <View style={styles.statsRow}>
          <StatBox icon="videocam-outline" val={`${b.sessions_count}+`} lbl="Live Classes" />
          <StatBox icon="document-text-outline" val={`${b.mock_tests_count}+`} lbl="Mock Tests" />
          <StatBox icon="calendar-outline" val={b.duration} lbl="Duration" />
        </View>

        {/* Course overview */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Course Overview</Text>
          <View style={{ marginTop: 10, gap: 10 }}>
            <InfoRow icon="calendar" label="Batch Starts" value={b.start_date} />
            <InfoRow icon="language" label="Language" value={b.language} />
            <InfoRow icon="ribbon-outline" label="Eligibility" value={b.eligibility || 'Open for all'} />
            {b.offer_valid_till ? <InfoRow icon="flash" label="Offer" value={b.offer_valid_till} /> : null}
          </View>
        </View>

        {/* What's Included */}
        {b.features?.length ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>What's Included</Text>
            <View style={{ marginTop: 10, gap: 10 }}>
              {b.features.map((f: string, i: number) => (
                <View key={i} style={styles.feat}>
                  <View style={styles.checkChip}>
                    <Ionicons name="checkmark" size={12} color="#FFF" />
                  </View>
                  <Text style={styles.featTxt}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Faculty */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Faculty</Text>
          <Text style={styles.body}>{b.faculty}. Delivered live with Q&A and personal doubt-solving support.</Text>
        </View>

        {/* Live Schedule */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Live Schedule</Text>
          <View style={styles.schedule}>
            <Ionicons name="calendar" size={20} color={theme.colors.brand} />
            <View style={{ flex: 1 }}>
              <Text style={styles.schedTitle}>Kick-off: {b.start_date}</Text>
              <Text style={styles.schedSub}>Weekdays: 7:00 PM – 9:30 PM • Weekend Marathons: 10 AM – 1 PM</Text>
            </View>
          </View>
        </View>

        {/* FAQ */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>FAQ</Text>
          <View style={{ marginTop: 6 }}>
            <FaqRow q="Will I get access to recordings?" a="Yes, every live class is recorded and available inside the app for revision." />
            <FaqRow q="Is this course refundable?" a="You can request a full refund within 48 hours of enrolling if you haven't downloaded materials." />
            <FaqRow q="Are notes/PDFs included?" a="Yes, structured PDF notes are delivered daily along with recorded lessons." />
          </View>
        </View>
      </ScrollView>

      {/* Sticky Enroll CTA */}
      <SafeAreaView edges={['bottom']} style={styles.stickyBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.stickyPriceStrike}>₹{Number(b.price).toLocaleString('en-IN')}</Text>
          <View style={styles.stickyPriceRow}>
            <Text style={styles.stickyPriceOffer}>₹{Number(b.offer_price).toLocaleString('en-IN')}</Text>
            {b.discount_pct ? (
              <View style={styles.stickyDiscountChip}>
                <Text style={styles.stickyDiscountTxt}>{b.discount_pct}% OFF</Text>
              </View>
            ) : null}
          </View>
        </View>
        <Pressable style={styles.enrollBtn} testID="lb-enroll">
          <Ionicons name="rocket-outline" size={18} color="#FFF" />
          <Text style={styles.enrollBtnTxt}>{b.cta || 'Enroll Now'}</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function StatBox({ icon, val, lbl }: { icon: any; val: string; lbl: string }) {
  return (
    <View style={styles.statBox}>
      <View style={styles.statIcon}><Ionicons name={icon} size={16} color={theme.colors.brand} /></View>
      <Text style={styles.statVal}>{val}</Text>
      <Text style={styles.statLbl}>{lbl}</Text>
    </View>
  );
}
function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}><Ionicons name={icon} size={14} color={theme.colors.brand} /></View>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={{ flex: 1 }} />
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}
function FaqRow({ q, a }: { q: string; a: string }) {
  return (
    <View style={styles.faqRow}>
      <Text style={styles.faqQ}>Q. {q}</Text>
      <Text style={styles.faqA}>{a}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surfaceSecondary },
  loading: { flex: 1, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  hero: { paddingHorizontal: 16, paddingBottom: 20, paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0 },
  topRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 6, paddingBottom: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)', marginLeft: 6 },
  heroBody: { marginTop: 8 },
  chipsRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EF4444', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  livePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  liveBadgeTxt: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  chipTxt: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  discountRibbon: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  discountRibbonTxt: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  batchLabel: { color: '#FCD34D', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginTop: 14 },
  courseName: { color: '#FFF', fontSize: 26, fontWeight: '900', letterSpacing: -0.3, marginTop: 4 },
  examName: { color: 'rgba(255,255,255,0.95)', fontSize: 13, fontWeight: '600', marginTop: 4 },
  faculty: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', marginTop: 2 },
  // Stats
  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: -22 },
  statBox: { flex: 1, backgroundColor: theme.colors.surface, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, ...(theme.shadow.soft as object) },
  statIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  statVal: { fontSize: 15, fontWeight: '900', color: theme.colors.onSurface, marginTop: 8 },
  statLbl: { fontSize: 10.5, color: theme.colors.muted, marginTop: 2, fontWeight: '700', letterSpacing: 0.3 },
  // Cards
  card: { backgroundColor: theme.colors.surface, marginHorizontal: 16, borderRadius: 18, padding: 14, marginTop: 12, borderWidth: 1, borderColor: theme.colors.border },
  cardTitle: { fontSize: 16, fontWeight: '900', color: theme.colors.onSurface },
  body: { fontSize: 13.5, color: theme.colors.onSurfaceSecondary, marginTop: 8, lineHeight: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoIcon: { width: 24, height: 24, borderRadius: 8, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 12.5, color: theme.colors.muted, fontWeight: '700' },
  infoValue: { fontSize: 13, color: theme.colors.onSurface, fontWeight: '800' },
  feat: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkChip: { width: 20, height: 20, borderRadius: 10, backgroundColor: theme.colors.success, alignItems: 'center', justifyContent: 'center' },
  featTxt: { flex: 1, fontSize: 13, color: theme.colors.onSurface, fontWeight: '600' },
  schedule: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 10, backgroundColor: theme.colors.brandTertiary, padding: 12, borderRadius: 12 },
  schedTitle: { fontSize: 13, fontWeight: '900', color: theme.colors.onSurface },
  schedSub: { fontSize: 11.5, color: theme.colors.onSurfaceSecondary, marginTop: 2 },
  faqRow: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  faqQ: { fontSize: 13, fontWeight: '800', color: theme.colors.onSurface },
  faqA: { fontSize: 12.5, color: theme.colors.onSurfaceSecondary, marginTop: 4, lineHeight: 18 },
  // Sticky bar
  stickyBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 8 }
      : { elevation: 12 }),
  },
  stickyPriceStrike: { fontSize: 11, color: theme.colors.muted, textDecorationLine: 'line-through', fontWeight: '700' },
  stickyPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 2 },
  stickyPriceOffer: { fontSize: 20, fontWeight: '900', color: theme.colors.brand },
  stickyDiscountChip: { backgroundColor: theme.colors.success, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  stickyDiscountTxt: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  enrollBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.brand, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14 },
  enrollBtnTxt: { color: '#FFF', fontWeight: '900', fontSize: 14 },
});
