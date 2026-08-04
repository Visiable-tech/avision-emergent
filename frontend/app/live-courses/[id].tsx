import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  StatusBar as RNStatusBar,
  Alert,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';
import { openRazorpayWeb } from '@/src/razorpay';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function LiveCourseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [showDemo, setShowDemo] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const d = await api.liveCourseDetail(id);
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

  const onEnroll = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to enroll.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/auth/login') },
      ]);
      return;
    }
    if (course?.is_enrolled) {
      router.push('/live-courses/my-courses');
      return;
    }
    setEnrolling(true);
    try {
      const order = await api.liveCourseCreateOrder(id!);
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
                await api.liveCourseVerify(id!, resp);
                Alert.alert('Enrolled Successfully', `You are now enrolled in ${course.name}!`, [
                  { text: 'View My Courses', onPress: () => router.replace('/live-courses/my-courses') },
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
        // Native: Razorpay native SDK requires a dev build. For preview / Expo Go,
        // offer instant free enrollment (dev helper) so Phase 2 can be tested.
        Alert.alert(
          'Native Payment',
          'Razorpay native checkout requires a dev build. For preview testing, use free enroll?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setEnrolling(false) },
            {
              text: 'Free Enroll (demo)',
              onPress: async () => {
                try {
                  await api.liveCourseFreeEnroll(id!);
                  Alert.alert('Enrolled', 'Demo enrollment created.', [
                    { text: 'My Courses', onPress: () => router.replace('/live-courses/my-courses') },
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

  const openFaq = (i: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenFaqIdx(openFaqIdx === i ? null : i);
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
        <Pressable onPress={() => router.back()} style={s.enrollBtn}>
          <Text style={s.enrollBtnTxt}>Go Back</Text>
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
        {/* Hero */}
        <LinearGradient colors={gradient} style={s.hero}>
          <Image source={{ uri: course.banner_image }} style={[StyleSheet.absoluteFillObject, { opacity: 0.22 }]} contentFit="cover" />
          <SafeAreaView edges={['top']}>
            <View style={s.topRow}>
              <Pressable onPress={() => router.back()} hitSlop={10} style={s.iconBtn} testID="lc-detail-back">
                <Ionicons name="chevron-back" size={24} color="#FFF" />
              </Pressable>
              <View style={{ flex: 1 }} />
              <Pressable style={s.iconBtn} testID="lc-share">
                <Ionicons name="share-social-outline" size={20} color="#FFF" />
              </Pressable>
              <Pressable style={s.iconBtn} testID="lc-save">
                <Ionicons name="bookmark-outline" size={20} color="#FFF" />
              </Pressable>
            </View>
            <View style={s.heroBody}>
              <View style={s.chipsRow}>
                <View style={s.liveBadge}>
                  <View style={s.livePulse} />
                  <Text style={s.liveBadgeTxt}>LIVE</Text>
                </View>
                {course.discount_pct ? (
                  <View style={[s.discRibbon, { backgroundColor: course.accent || '#F59E0B' }]}>
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
              <Text style={s.batchLabel}>{course.batch_label}</Text>
              <Text style={s.courseName}>{course.name}</Text>
              <Text style={s.examName}>{course.exam_name}</Text>
              <View style={s.langRow}>
                <View style={s.langChip}>
                  <Ionicons name="language" size={11} color="#FFF" />
                  <Text style={s.langChipTxt}>{course.language}</Text>
                </View>
                <View style={s.langChip}>
                  <Ionicons name="calendar" size={11} color="#FFF" />
                  <Text style={s.langChipTxt}>Starts {course.start_date_short}</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        {/* Stats overlap */}
        <View style={s.statsRow}>
          <StatBox icon="videocam-outline" val={`${course.sessions_count}+`} lbl="Live Classes" />
          <StatBox icon="document-text-outline" val={`${course.mock_tests_count}+`} lbl="Mock Tests" />
          <StatBox icon="time-outline" val={course.duration} lbl="Duration" />
        </View>

        {/* Demo Video */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Watch a Demo Class</Text>
            <Text style={s.cardSub}>Get a feel of teaching style</Text>
          </View>
          <Pressable
            onPress={() => setShowDemo(true)}
            style={s.videoWrap}
            testID="lc-demo-play"
          >
            {showDemo ? (
              Platform.OS === 'web' ? (
                <View style={StyleSheet.absoluteFillObject}>
                  {/* @ts-ignore - iframe works on web */}
                  <iframe
                    src={`${course.demo_video_url}?autoplay=1&rel=0`}
                    width="100%"
                    height="100%"
                    frameBorder={0}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    style={{ border: 0, borderRadius: 16 }}
                  />
                </View>
              ) : (
                <WebView
                  source={{ uri: `${course.demo_video_url}?autoplay=1&rel=0` }}
                  style={{ flex: 1, backgroundColor: '#000' }}
                  allowsFullscreenVideo
                  javaScriptEnabled
                />
              )
            ) : (
              <>
                <Image source={{ uri: course.banner_image }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                <LinearGradient colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.55)']} style={StyleSheet.absoluteFillObject} />
                <View style={s.playBtn}>
                  <Ionicons name="play" size={30} color={theme.colors.brand} />
                </View>
                <View style={s.demoTag}>
                  <Ionicons name="play-circle" size={12} color="#FFF" />
                  <Text style={s.demoTagTxt}>FREE DEMO CLASS</Text>
                </View>
              </>
            )}
          </Pressable>
        </View>

        {/* Faculty */}
        {course.faculties?.length ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>Meet Your Faculty</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingTop: 10, paddingRight: 4 }}
            >
              {course.faculties.map((f: any) => (
                <Pressable
                  key={f.id}
                  onPress={() => router.push(`/live-courses/faculty/${f.id}`)}
                  style={s.facCard}
                  testID={`lc-faculty-${f.id}`}
                >
                  <Image source={{ uri: f.avatar }} style={s.facAvatar} contentFit="cover" />
                  <Text style={s.facName} numberOfLines={1}>{f.name}</Text>
                  <Text style={s.facTitle} numberOfLines={2}>{f.title}</Text>
                  <View style={s.facMetaRow}>
                    <Ionicons name="star" size={10} color={theme.colors.gold} />
                    <Text style={s.facMetaTxt}>{f.rating}</Text>
                    <Text style={s.facDot}>•</Text>
                    <Text style={s.facMetaTxt}>{f.experience_years}y</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* What's Included */}
        {course.features?.length ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>{`What's Included`}</Text>
            <View style={{ marginTop: 10, gap: 10 }}>
              {course.features.map((f: string, i: number) => (
                <View key={i} style={s.feat}>
                  <View style={s.checkChip}>
                    <Ionicons name="checkmark" size={12} color="#FFF" />
                  </View>
                  <Text style={s.featTxt}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Curriculum */}
        {course.curriculum?.length ? (
          <View style={s.card}>
            <View style={s.cardHead}>
              <Text style={s.cardTitle}>Curriculum</Text>
              <Text style={s.cardSub}>{course.curriculum.length} subjects</Text>
            </View>
            <View style={{ marginTop: 10, gap: 10 }}>
              {course.curriculum.map((c: any, i: number) => (
                <CurriculumRow key={i} idx={i + 1} c={c} />
              ))}
            </View>
          </View>
        ) : null}

        {/* Live Schedule */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Live Schedule</Text>
          <View style={{ marginTop: 10, gap: 8 }}>
            <SchedRow icon="calendar" title="Batch Starts" value={course.start_date} />
            <SchedRow icon="time" title="Weekdays" value={course.schedule?.weekdays || 'Mon-Fri 7-9:30 PM'} />
            <SchedRow icon="sunny" title="Weekend Marathons" value={course.schedule?.weekend || 'Sat-Sun 10 AM - 1 PM'} />
            <SchedRow icon="help-circle" title="Doubt Session" value={course.schedule?.doubt_session || 'Sunday 5:00 PM'} />
          </View>
        </View>

        {/* Testimonials */}
        {course.testimonials?.length ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>What Students Say</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingTop: 10, paddingRight: 4 }}
            >
              {course.testimonials.map((t: any, i: number) => (
                <View key={i} style={s.testCard}>
                  <View style={s.testRating}>
                    {Array.from({ length: t.rating || 5 }).map((_, j) => (
                      <Ionicons key={j} name="star" size={12} color={theme.colors.gold} />
                    ))}
                  </View>
                  <Text style={s.testTxt}>{`"${t.text}"`}</Text>
                  <View style={s.testFooter}>
                    <View style={s.testAv}>
                      <Text style={s.testAvTxt}>{t.avatar || t.name?.[0]}</Text>
                    </View>
                    <View>
                      <Text style={s.testName}>{t.name}</Text>
                      <Text style={s.testBatch}>Batch {t.batch}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* FAQ */}
        {course.faqs?.length ? (
          <View style={s.card}>
            <Text style={s.cardTitle}>Frequently Asked</Text>
            <View style={{ marginTop: 6 }}>
              {course.faqs.map((f: any, i: number) => (
                <Pressable key={i} onPress={() => openFaq(i)} style={s.faqRow} testID={`lc-faq-${i}`}>
                  <View style={s.faqHead}>
                    <Text style={s.faqQ}>{f.q}</Text>
                    <Ionicons
                      name={openFaqIdx === i ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={theme.colors.muted}
                    />
                  </View>
                  {openFaqIdx === i ? <Text style={s.faqA}>{f.a}</Text> : null}
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Sticky CTA */}
      <SafeAreaView edges={['bottom']} style={s.sticky}>
        <View style={{ flex: 1 }}>
          <Text style={s.priceStrike}>₹{Number(course.price).toLocaleString('en-IN')}</Text>
          <View style={s.priceLine}>
            <Text style={s.priceMain}>₹{Number(course.offer_price).toLocaleString('en-IN')}</Text>
            {course.discount_pct ? (
              <View style={s.discBadge}>
                <Text style={s.discBadgeTxt}>{course.discount_pct}% OFF</Text>
              </View>
            ) : null}
          </View>
        </View>
        <Pressable
          onPress={onEnroll}
          disabled={enrolling}
          style={[s.enrollBtn, isEnrolled && { backgroundColor: theme.colors.success }, enrolling && { opacity: 0.7 }]}
          testID="lc-enroll"
        >
          {enrolling ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <>
              <Ionicons name={isEnrolled ? 'checkmark-circle' : 'rocket-outline'} size={18} color="#FFF" />
              <Text style={s.enrollBtnTxt}>{isEnrolled ? 'Go to Course' : course.cta || 'Enroll Now'}</Text>
            </>
          )}
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function StatBox({ icon, val, lbl }: { icon: any; val: string; lbl: string }) {
  return (
    <View style={s.statBox}>
      <View style={s.statIcon}>
        <Ionicons name={icon} size={16} color={theme.colors.brand} />
      </View>
      <Text style={s.statVal}>{val}</Text>
      <Text style={s.statLbl}>{lbl}</Text>
    </View>
  );
}

function CurriculumRow({ idx, c }: { idx: number; c: any }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable
      onPress={() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOpen((v) => !v);
      }}
      style={s.currRow}
    >
      <View style={s.currHead}>
        <View style={s.currIdx}>
          <Text style={s.currIdxTxt}>{idx}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.currTitle}>{c.subject}</Text>
          <Text style={s.currSub}>
            {c.hours}h • {c.topics?.length || 0} topics
          </Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.muted} />
      </View>
      {open && c.topics?.length ? (
        <View style={s.currTopics}>
          {c.topics.map((t: string, i: number) => (
            <View key={i} style={s.currTopic}>
              <View style={s.currDot} />
              <Text style={s.currTopicTxt}>{t}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

function SchedRow({ icon, title, value }: { icon: any; title: string; value: string }) {
  return (
    <View style={s.schedRow}>
      <View style={s.schedIcon}>
        <Ionicons name={icon} size={14} color={theme.colors.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.schedTitle}>{title}</Text>
        <Text style={s.schedVal}>{value}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surfaceSecondary },
  loading: { flex: 1, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 6, paddingBottom: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginLeft: 6,
  },
  heroBody: { marginTop: 8 },
  chipsRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EF4444',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  livePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  liveBadgeTxt: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  discRibbon: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  discRibbonTxt: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  enrolledChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.success,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  enrolledChipTxt: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  batchLabel: { color: '#FCD34D', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginTop: 14 },
  courseName: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: -0.3, marginTop: 4 },
  examName: { color: 'rgba(255,255,255,0.95)', fontSize: 13, fontWeight: '600', marginTop: 4 },
  langRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  langChipTxt: { color: '#FFF', fontSize: 11, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: -22 },
  statBox: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...(theme.shadow.soft as object),
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: theme.colors.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statVal: { fontSize: 15, fontWeight: '900', color: theme.colors.onSurface, marginTop: 8 },
  statLbl: { fontSize: 10.5, color: theme.colors.muted, marginTop: 2, fontWeight: '700', letterSpacing: 0.3 },

  card: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: '900', color: theme.colors.onSurface },
  cardSub: { fontSize: 11, color: theme.colors.muted, fontWeight: '700' },

  // Demo video
  videoWrap: { height: 200, borderRadius: 16, overflow: 'hidden', marginTop: 10, backgroundColor: '#111' },
  playBtn: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -32,
    marginTop: -32,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  demoTagTxt: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  // Faculty
  facCard: {
    width: 130,
    padding: 10,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  facAvatar: { width: 64, height: 64, borderRadius: 32 },
  facName: { fontSize: 12.5, fontWeight: '900', color: theme.colors.onSurface, marginTop: 8, textAlign: 'center' },
  facTitle: { fontSize: 10, fontWeight: '600', color: theme.colors.muted, textAlign: 'center', marginTop: 2, height: 26 },
  facMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 },
  facMetaTxt: { fontSize: 10, fontWeight: '800', color: theme.colors.onSurfaceSecondary },
  facDot: { color: theme.colors.mutedLight, fontSize: 10 },

  // Features
  feat: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkChip: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featTxt: { flex: 1, fontSize: 13, color: theme.colors.onSurface, fontWeight: '600' },

  // Curriculum
  currRow: { backgroundColor: theme.colors.surfaceSecondary, borderRadius: 12, padding: 10 },
  currHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  currIdx: { width: 26, height: 26, borderRadius: 13, backgroundColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center' },
  currIdxTxt: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  currTitle: { fontSize: 13, fontWeight: '900', color: theme.colors.onSurface },
  currSub: { fontSize: 11, color: theme.colors.muted, fontWeight: '700', marginTop: 2 },
  currTopics: { marginTop: 10, marginLeft: 36, gap: 6 },
  currTopic: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  currDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.colors.brand },
  currTopicTxt: { fontSize: 12, color: theme.colors.onSurfaceSecondary, fontWeight: '600' },

  // Schedule
  schedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.surfaceSecondary, padding: 10, borderRadius: 12 },
  schedIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  schedTitle: { fontSize: 11, fontWeight: '700', color: theme.colors.muted },
  schedVal: { fontSize: 12.5, fontWeight: '800', color: theme.colors.onSurface, marginTop: 2 },

  // Testimonials
  testCard: {
    width: 260,
    padding: 12,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  testRating: { flexDirection: 'row', gap: 2 },
  testTxt: { fontSize: 12.5, color: theme.colors.onSurface, marginTop: 8, lineHeight: 18, fontStyle: 'italic' },
  testFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  testAv: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center' },
  testAvTxt: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  testName: { fontSize: 12, fontWeight: '900', color: theme.colors.onSurface },
  testBatch: { fontSize: 10, color: theme.colors.muted, fontWeight: '700', marginTop: 1 },

  // FAQ
  faqRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  faqQ: { fontSize: 13, fontWeight: '800', color: theme.colors.onSurface, flex: 1 },
  faqA: { fontSize: 12.5, color: theme.colors.onSurfaceSecondary, marginTop: 8, lineHeight: 18 },

  // Sticky
  sticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 8 }
      : { elevation: 12 }),
  },
  priceStrike: { fontSize: 11, color: theme.colors.muted, textDecorationLine: 'line-through', fontWeight: '700' },
  priceLine: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 2 },
  priceMain: { fontSize: 22, fontWeight: '900', color: theme.colors.brand, letterSpacing: -0.3 },
  discBadge: { backgroundColor: theme.colors.success, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  discBadgeTxt: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  enrollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.brand,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 14,
  },
  enrollBtnTxt: { color: '#FFF', fontWeight: '900', fontSize: 14 },
});
