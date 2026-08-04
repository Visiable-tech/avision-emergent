import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';
import { openRazorpayWeb } from '@/src/razorpay';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Coupon = {
  code: string;
  discount_pct: number;
  discount_inr: number;
  final_price: number;
  desc?: string;
};

export default function VideoCourseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openSubjectIdx, setOpenSubjectIdx] = useState<number | null>(0);
  const [openChapterIds, setOpenChapterIds] = useState<Record<string, boolean>>({});
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState<Coupon | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const d = await api.vcDetail(id);
      setCourse(d);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load course');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSubject = (idx: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenSubjectIdx(openSubjectIdx === idx ? null : idx);
  };
  const toggleChapter = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenChapterIds((p) => ({ ...p, [id]: !p[id] }));
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    if (!user) {
      Alert.alert('Login Required', 'Please login to apply coupons.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/auth/login') },
      ]);
      return;
    }
    setCouponBusy(true);
    try {
      const r = await api.vcValidateCoupon(couponCode.trim(), course.offer_price);
      setCouponApplied(r);
    } catch (e: any) {
      Alert.alert('Invalid Coupon', e?.message || 'Please try a different code');
    } finally {
      setCouponBusy(false);
    }
  };

  const removeCoupon = () => {
    setCouponApplied(null);
    setCouponCode('');
  };

  const finalPrice = couponApplied?.final_price ?? course?.offer_price ?? 0;
  const savedTotal = (course?.price || 0) - finalPrice;

  const onEnroll = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to enroll.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/auth/login') },
      ]);
      return;
    }
    if (course?.is_enrolled) {
      router.push('/video-courses/my');
      return;
    }
    setEnrolling(true);
    try {
      const order = await api.vcCreateOrder(id!, couponApplied?.code);
      if (Platform.OS === 'web') {
        await openRazorpayWeb(
          {
            key_id: order.key_id,
            order_id: order.order_id,
            amount: order.amount,
            currency: order.currency,
            plan: { label: course.name, price: Math.round(order.amount / 100) },
            receipt: order.receipt,
          },
          {
            name: user?.name || 'Student',
            email: user?.email || '',
            onSuccess: async (resp: any) => {
              try {
                await api.vcVerify(id!, resp);
                Alert.alert('Enrolled Successfully', `You are now enrolled in ${course.name}!`, [
                  { text: 'Go to My Courses', onPress: () => router.replace('/video-courses/my') },
                ]);
                load();
              } catch (e: any) {
                Alert.alert('Payment verification failed', e?.message || 'Please contact support.');
              }
            },
            onFail: () => setEnrolling(false),
          },
        );
      } else {
        Alert.alert(
          'Native Payment',
          'Razorpay native checkout requires a dev build. For preview testing, use free enroll?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setEnrolling(false) },
            {
              text: 'Free Enroll (demo)',
              onPress: async () => {
                try {
                  await api.vcFreeEnroll(id!);
                  Alert.alert('Enrolled', 'Demo enrollment created.', [
                    { text: 'Go to My Courses', onPress: () => router.replace('/video-courses/my') },
                  ]);
                  load();
                } catch (e: any) {
                  Alert.alert('Error', e?.message || 'Enroll failed');
                }
              },
            },
          ],
        );
      }
    } catch (e: any) {
      Alert.alert('Order Error', e?.message || 'Could not create order');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <View style={s.loading}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }
  if (!course) {
    return (
      <View style={s.loading}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="alert-circle-outline" size={44} color={theme.colors.mutedLight} />
        <Text style={{ color: theme.colors.muted, marginTop: 10 }}>Course not found.</Text>
        <Pressable onPress={() => router.back()} style={s.backBtnEmpty}>
          <Text style={s.backBtnEmptyTxt}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const gradient = course.gradient || [theme.colors.brand, theme.colors.brandDark];
  const isEnrolled = !!course.is_enrolled;

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* HERO */}
        <LinearGradient colors={gradient} style={s.hero}>
          <Image source={{ uri: course.banner_image }} style={[StyleSheet.absoluteFillObject, { opacity: 0.22 }]} contentFit="cover" />
          <SafeAreaView edges={['top']}>
            <View style={s.topRow}>
              <Pressable onPress={() => router.back()} hitSlop={10} style={s.iconBtn} testID="vc-detail-back">
                <Ionicons name="chevron-back" size={24} color="#FFF" />
              </Pressable>
              <View style={{ flex: 1 }} />
              <Pressable style={s.iconBtn} testID="vc-share">
                <Ionicons name="share-social-outline" size={20} color="#FFF" />
              </Pressable>
              <Pressable style={s.iconBtn} testID="vc-save">
                <Ionicons name="bookmark-outline" size={20} color="#FFF" />
              </Pressable>
            </View>
            <View style={s.heroBody}>
              <View style={s.chipsRow}>
                <View style={s.vodBadge}>
                  <Ionicons name="videocam" size={11} color="#FFF" />
                  <Text style={s.vodBadgeTxt}>VIDEO COURSE</Text>
                </View>
                {course.discount_pct ? (
                  <View style={s.discRibbon}>
                    <Text style={s.discRibbonTxt}>{course.discount_pct}% OFF</Text>
                  </View>
                ) : null}
                {isEnrolled ? (
                  <View style={s.enrolledChip}>
                    <Ionicons name="checkmark-circle" size={12} color="#FFF" />
                    <Text style={s.enrolledChipTxt}>ENROLLED</Text>
                  </View>
                ) : null}
              </View>
              <Text style={s.courseName}>{course.name}</Text>
              <Text style={s.examName}>{course.exam_name}</Text>
              <View style={s.metaRow}>
                <View style={s.metaChip}>
                  <Ionicons name="language" size={11} color="#FFF" />
                  <Text style={s.metaChipTxt}>{course.language}</Text>
                </View>
                <View style={s.metaChip}>
                  <Ionicons name="time" size={11} color="#FFF" />
                  <Text style={s.metaChipTxt}>{course.validity_months} months validity</Text>
                </View>
                <View style={s.metaChip}>
                  <Ionicons name="star" size={11} color="#FCD34D" />
                  <Text style={s.metaChipTxt}>{course.rating} • {course.students?.toLocaleString('en-IN')}+</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* STATS overlap */}
        <View style={s.statsRow}>
          <StatBox icon="play-circle" val={`${course.video_count}+`} lbl="HD Videos" />
          <StatBox icon="help-circle" val={`${(course.practice_qs_count / 1000).toFixed(0)}k+`} lbl="Practice Qs" />
          <StatBox icon="library" val={`${course.subject_count}`} lbl="Subjects" />
        </View>

        {/* WHAT'S INCLUDED */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>What&apos;s Included</Text>
            <Text style={s.cardSub}>Full-featured video course</Text>
          </View>
          <View style={s.featGrid}>
            {(course.features || []).map((f: any, i: number) => (
              <View key={i} style={s.featCell}>
                <View style={s.featIcon}>
                  <Ionicons name={f.icon} size={20} color={theme.colors.brand} />
                </View>
                <Text style={s.featLbl}>{f.label}</Text>
                <Text style={s.featSub}>{f.sub}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* CURRICULUM */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Course Curriculum</Text>
            <Text style={s.cardSub}>{course.subject_count} subjects • {course.video_count}+ videos</Text>
          </View>
          {(course.curriculum || []).map((sub: any, si: number) => {
            const open = openSubjectIdx === si;
            return (
              <View key={sub.key} style={s.subject}>
                <Pressable onPress={() => toggleSubject(si)} style={s.subjectHead} testID={`vc-sub-${sub.key}`}>
                  <View style={s.subjectIcon}>
                    <Ionicons name="book" size={16} color={theme.colors.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.subjectName}>{sub.subject}</Text>
                    <Text style={s.subjectMeta}>{sub.total_chapters} chapters • {sub.total_videos} videos • {sub.total_hours}h</Text>
                  </View>
                  <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.muted} />
                </Pressable>
                {open && (
                  <View style={s.chapters}>
                    {sub.chapters.map((ch: any) => {
                      const chOpen = !!openChapterIds[ch.id];
                      return (
                        <View key={ch.id} style={s.chapter}>
                          <Pressable
                            onPress={() => toggleChapter(ch.id)}
                            style={s.chapterHead}
                            disabled={!ch.lectures?.length}
                          >
                            <View style={s.chapterDot} />
                            <View style={{ flex: 1 }}>
                              <Text style={s.chapterName}>{ch.name}</Text>
                              <Text style={s.chapterMeta}>{ch.video_count} videos</Text>
                            </View>
                            {ch.lectures?.length ? (
                              <Ionicons name={chOpen ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.mutedLight} />
                            ) : (
                              <Ionicons name="lock-closed" size={13} color={theme.colors.mutedLight} />
                            )}
                          </Pressable>
                          {chOpen && ch.lectures?.length ? (
                            <View style={s.lectures}>
                              {ch.lectures.map((lec: any, li: number) => (
                                <View key={lec.id} style={s.lecture}>
                                  <View style={s.lecIcon}>
                                    {lec.is_free ? (
                                      <Ionicons name="play-circle" size={20} color={theme.colors.brand} />
                                    ) : (
                                      <Ionicons name="lock-closed" size={14} color={theme.colors.mutedLight} />
                                    )}
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <Text style={s.lecTitle} numberOfLines={1}>{li + 1}. {lec.title}</Text>
                                    <Text style={s.lecMeta}>{lec.duration}</Text>
                                  </View>
                                  {lec.is_free ? (
                                    <View style={s.freePill}>
                                      <Text style={s.freePillTxt}>FREE</Text>
                                    </View>
                                  ) : null}
                                </View>
                              ))}
                            </View>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* FACULTY */}
        {course.faculty_images?.length ? (
          <View style={s.card}>
            <View style={s.cardHead}>
              <Text style={s.cardTitle}>Meet Your Faculty</Text>
              <Text style={s.cardSub}>Learn from top India educators</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, gap: 12 }}>
              {course.faculty_images.map((url: string, i: number) => (
                <View key={i} style={s.facCard}>
                  <Image source={{ uri: url }} style={s.facImg} contentFit="cover" />
                  <Text style={s.facName}>Faculty {i + 1}</Text>
                  <Text style={s.facRole}>Expert Educator</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* COUPON */}
        {!isEnrolled ? (
          <View style={s.card}>
            <View style={s.cardHead}>
              <Text style={s.cardTitle}>Have a coupon?</Text>
              <Text style={s.cardSub}>Apply a code to unlock extra savings</Text>
            </View>
            {couponApplied ? (
              <View style={s.couponApplied}>
                <View style={s.couponAppliedIcon}>
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.couponAppliedCode}>{couponApplied.code} applied</Text>
                  <Text style={s.couponAppliedDesc}>You save ₹{couponApplied.discount_inr.toLocaleString('en-IN')} ({couponApplied.discount_pct}% off)</Text>
                </View>
                <Pressable onPress={removeCoupon} hitSlop={10}>
                  <Ionicons name="close-circle" size={22} color={theme.colors.muted} />
                </Pressable>
              </View>
            ) : (
              <View style={s.couponRow}>
                <TextInput
                  style={s.couponInput}
                  placeholder="Enter coupon code"
                  placeholderTextColor={theme.colors.mutedLight}
                  value={couponCode}
                  onChangeText={(t) => setCouponCode(t.toUpperCase())}
                  autoCapitalize="characters"
                  testID="vc-coupon-input"
                />
                <Pressable onPress={applyCoupon} style={s.couponBtn} disabled={couponBusy || !couponCode.trim()} testID="vc-coupon-apply">
                  {couponBusy ? <ActivityIndicator color="#FFF" /> : <Text style={s.couponBtnTxt}>Apply</Text>}
                </Pressable>
              </View>
            )}
            <View style={s.couponHints}>
              {['AVISION25', 'FIRST50', 'STUDENT15'].map((c) => (
                <Pressable key={c} onPress={() => setCouponCode(c)} style={s.couponHint}>
                  <Ionicons name="pricetag" size={11} color={theme.colors.brand} />
                  <Text style={s.couponHintTxt}>{c}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* STICKY PRICE BAR */}
      <SafeAreaView edges={['bottom']} style={s.stickyBarWrap}>
        <View style={s.stickyBar}>
          {isEnrolled ? (
            <>
              <View style={{ flex: 1 }}>
                <Text style={s.enrolledTitle}>You&apos;re enrolled</Text>
                <Text style={s.enrolledSub}>Continue where you left off</Text>
              </View>
              <Pressable style={s.enrollBtn} onPress={onEnroll} testID="vc-continue-learning">
                <Text style={s.enrollBtnTxt}>Start Learning</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFF" />
              </Pressable>
            </>
          ) : (
            <>
              <View style={{ flex: 1 }}>
                <View style={s.priceLine}>
                  <Text style={s.priceStrike}>₹{course.price.toLocaleString('en-IN')}</Text>
                  {savedTotal > 0 ? (
                    <View style={s.savePill}>
                      <Text style={s.savePillTxt}>SAVE ₹{savedTotal.toLocaleString('en-IN')}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={s.priceMain}>₹{finalPrice.toLocaleString('en-IN')}</Text>
              </View>
              <Pressable style={s.enrollBtn} onPress={onEnroll} disabled={enrolling} testID="vc-buy-now">
                {enrolling ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Text style={s.enrollBtnTxt}>Buy Now</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFF" />
                  </>
                )}
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function StatBox({ icon, val, lbl }: { icon: any; val: string; lbl: string }) {
  return (
    <View style={s.statBox}>
      <Ionicons name={icon} size={18} color={theme.colors.brand} />
      <Text style={s.statVal}>{val}</Text>
      <Text style={s.statLbl}>{lbl}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surfaceSecondary },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceSecondary },
  backBtnEmpty: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: theme.colors.brand, borderRadius: 12 },
  backBtnEmptyTxt: { color: '#FFF', fontWeight: '900' },

  // HERO
  hero: { paddingHorizontal: 16, paddingBottom: 60 },
  topRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 4, gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroBody: { marginTop: 20 },
  chipsRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' },
  vodBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  vodBadgeTxt: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  discRibbon: { backgroundColor: '#F59E0B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  discRibbonTxt: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  enrolledChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.success, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  enrolledChipTxt: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  courseName: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: -0.4, lineHeight: 30 },
  examName: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700', marginTop: 6 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  metaChipTxt: { color: '#FFF', fontSize: 11.5, fontWeight: '700' },

  // STATS overlap
  statsRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: -36, marginBottom: 4 },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 14, backgroundColor: theme.colors.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, gap: 4 },
  statVal: { fontSize: 15, fontWeight: '900', color: theme.colors.onSurface },
  statLbl: { fontSize: 10, color: theme.colors.muted, fontWeight: '700' },

  // Card
  card: { backgroundColor: theme.colors.surface, marginHorizontal: 16, marginTop: 14, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, paddingBottom: 14, overflow: 'hidden' },
  cardHead: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '900', color: theme.colors.onSurface, letterSpacing: -0.2 },
  cardSub: { fontSize: 11.5, color: theme.colors.muted, fontWeight: '700', marginTop: 2 },

  // Features
  featGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  featCell: { width: '25%', alignItems: 'center', paddingVertical: 10, gap: 3 },
  featIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  featLbl: { fontSize: 11.5, fontWeight: '900', color: theme.colors.onSurface, marginTop: 4 },
  featSub: { fontSize: 9.5, color: theme.colors.muted, fontWeight: '700', textAlign: 'center' },

  // Curriculum
  subject: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
  subjectHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  subjectIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  subjectName: { fontSize: 14, fontWeight: '900', color: theme.colors.onSurface },
  subjectMeta: { fontSize: 11, color: theme.colors.muted, fontWeight: '700', marginTop: 2 },
  chapters: { paddingHorizontal: 14, paddingBottom: 8, gap: 2 },
  chapter: { paddingLeft: 46 },
  chapterHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  chapterDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.brand },
  chapterName: { fontSize: 13, fontWeight: '700', color: theme.colors.onSurface },
  chapterMeta: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '700', marginTop: 1 },
  lectures: { paddingLeft: 16, paddingBottom: 6, gap: 4 },
  lecture: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  lecIcon: { width: 28, alignItems: 'center' },
  lecTitle: { fontSize: 12.5, fontWeight: '700', color: theme.colors.onSurface },
  lecMeta: { fontSize: 10, color: theme.colors.muted, fontWeight: '700', marginTop: 1 },
  freePill: { backgroundColor: theme.colors.success, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  freePillTxt: { color: '#FFF', fontSize: 9, fontWeight: '900' },

  // Faculty
  facCard: { width: 140, backgroundColor: theme.colors.surfaceSecondary, borderRadius: 12, padding: 10, alignItems: 'center' },
  facImg: { width: 72, height: 72, borderRadius: 36, marginBottom: 8, borderWidth: 3, borderColor: '#FFF' },
  facName: { fontSize: 12.5, fontWeight: '900', color: theme.colors.onSurface },
  facRole: { fontSize: 10, color: theme.colors.muted, fontWeight: '700' },

  // Coupon
  couponRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, marginTop: 4 },
  couponInput: { flex: 1, height: 44, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, paddingHorizontal: 14, fontSize: 13, fontWeight: '700', color: theme.colors.onSurface, backgroundColor: theme.colors.surfaceSecondary },
  couponBtn: { paddingHorizontal: 20, height: 44, borderRadius: 12, backgroundColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center' },
  couponBtnTxt: { color: '#FFF', fontSize: 13, fontWeight: '900' },
  couponApplied: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', marginHorizontal: 14, padding: 12, borderRadius: 12 },
  couponAppliedIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.success, alignItems: 'center', justifyContent: 'center' },
  couponAppliedCode: { fontSize: 13, fontWeight: '900', color: theme.colors.onSurface },
  couponAppliedDesc: { fontSize: 11, color: theme.colors.success, fontWeight: '800', marginTop: 2 },
  couponHints: { flexDirection: 'row', gap: 6, paddingHorizontal: 14, marginTop: 10, flexWrap: 'wrap' },
  couponHint: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.brandTertiary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  couponHintTxt: { fontSize: 11, fontWeight: '900', color: theme.colors.brand },

  // Sticky bar
  stickyBarWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border },
  stickyBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  priceLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceStrike: { fontSize: 12, color: theme.colors.muted, textDecorationLine: 'line-through', fontWeight: '700' },
  savePill: { backgroundColor: theme.colors.warning, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  savePillTxt: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  priceMain: { fontSize: 22, fontWeight: '900', color: theme.colors.brand, letterSpacing: -0.4 },
  enrolledTitle: { fontSize: 13, fontWeight: '900', color: theme.colors.onSurface },
  enrolledSub: { fontSize: 11, color: theme.colors.muted, fontWeight: '700', marginTop: 2 },
  enrollBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.brand, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 14 },
  enrollBtnTxt: { color: '#FFF', fontSize: 14, fontWeight: '900' },
});
