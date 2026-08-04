import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
  StatusBar as RNStatusBar,
  TextInput,
  Modal,
  Linking,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';
import { openRazorpayWeb } from '@/src/razorpay';

// Enable LayoutAnimation on Android for smooth expand/collapse
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const EXAM_PREVIEW_COUNT = 6;
const EXPAND_ANIM = LayoutAnimation.create(
  300,
  LayoutAnimation.Types.easeInEaseOut,
  LayoutAnimation.Properties.opacity,
);

type Cat = { id: string; name: string; icon: string; color: string; exam_count: number };
type Exam = {
  id: string;
  name: string;
  full_name: string;
  logo: string;
  color: string;
  category_id: string;
  tests_count: number;
  free_tests: number;
  languages: string[];
};
type Feature = { id: string; title: string; icon: string; iconLib: string; color: string; bg: string };
type Faq = { q: string; a: string };
type Plan = { id: string; label: string; months: number; price: number; mrp: number; discount_pct: number; popular: boolean };

const HERO_GRADIENT = ['#F97316', '#F59E0B', '#FBBF24'] as const;

export default function TestPrimeLanding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCat, setSelectedCat] = useState<string>('banking');
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<Cat[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('12m');
  const [ent, setEnt] = useState<any>(null);

  const [showAllHighlights, setShowAllHighlights] = useState(false);
  const [expandedFaqs, setExpandedFaqs] = useState<Record<number, boolean>>({});
  const [allFaqsOpen, setAllFaqsOpen] = useState(false);
  const [planPickerOpen, setPlanPickerOpen] = useState(false);
  const [choosePlanOpen, setChoosePlanOpen] = useState(false);
  const [activating, setActivating] = useState(false);
  const [examsExpanded, setExamsExpanded] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [bundle, en] = await Promise.all([
        api.tpLanding(selectedCat),
        user?.user_id ? api.tpEntitlement(user.user_id).catch(() => null) : Promise.resolve(null),
      ]);
      setCategories(bundle.categories || []);
      setExams(bundle.exams || []);
      setFeatures(bundle.features || []);
      setHighlights(bundle.highlights || []);
      setFaqs(bundle.faqs || []);
      setPlans(bundle.plans || []);
      setEnt(en);
    } catch (err) {
      console.warn('tp landing', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCat, user?.user_id]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filteredExams = useMemo(() => {
    if (!search.trim()) return exams;
    const q = search.trim().toLowerCase();
    return exams.filter(
      (e) => e.name.toLowerCase().includes(q) || (e.full_name || '').toLowerCase().includes(q),
    );
  }, [exams, search]);

  const topExams = examsExpanded ? filteredExams : filteredExams.slice(0, EXAM_PREVIEW_COUNT);
  const canExpand = filteredExams.length > EXAM_PREVIEW_COUNT;
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[plans.length - 1];
  const isPrime = !!ent?.is_prime;

  // Auto-collapse exams when category or search changes
  useEffect(() => {
    if (examsExpanded) {
      LayoutAnimation.configureNext(EXPAND_ANIM);
      setExamsExpanded(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCat, search]);

  const toggleExamsExpanded = () => {
    LayoutAnimation.configureNext(EXPAND_ANIM);
    setExamsExpanded((v) => !v);
  };

  const toggleFaq = (i: number) => {
    setExpandedFaqs((p) => ({ ...p, [i]: !p[i] }));
  };
  const toggleAllFaqs = () => {
    const next = !allFaqsOpen;
    setAllFaqsOpen(next);
    const map: Record<number, boolean> = {};
    faqs.forEach((_, i) => (map[i] = next));
    setExpandedFaqs(map);
  };

  const handleChoosePlan = async () => {
    if (!user?.user_id || !selectedPlan) return;
    try {
      setActivating(true);
      // 1. Create order on backend
      const order = await api.tpCreateOrder(user.user_id, selectedPlan.id);
      // 2. Open Razorpay checkout (Web + fallback)
      if (Platform.OS === 'web') {
        await openRazorpayWeb(order, {
          name: user.name || 'Aspirant',
          email: user.email || '',
          onSuccess: async (resp: any) => {
            try {
              const r = await api.tpVerifyPayment(user.user_id!, resp);
              setEnt(r.entitlement);
              setChoosePlanOpen(false);
            } catch (err) {
              console.warn('verify failed', err);
            } finally {
              setActivating(false);
            }
          },
          onFail: () => setActivating(false),
        });
      } else {
        // Native: fall back to activating with demo flow (react-native-razorpay requires dev build)
        const days = selectedPlan.months * 30;
        const r = await api.tpActivate(user.user_id, 'prime', days);
        setEnt(r);
        setChoosePlanOpen(false);
        setActivating(false);
      }
    } catch (e) {
      console.warn('choose plan', e);
      setActivating(false);
    }
  };

  const resetPrime = async () => {
    if (!user?.user_id) return;
    try {
      await api.tpReset(user.user_id);
      setEnt(null);
    } catch {}
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ============================= HERO ============================= */}
      <LinearGradient colors={HERO_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
        <SafeAreaView edges={['top']}>
          <View style={s.headerRow}>
            {router.canGoBack() ? (
              <Pressable onPress={() => router.back()} testID="tp-back" hitSlop={12} style={s.iconBtn}>
                <Ionicons name="chevron-back" size={22} color="#FFF" />
              </Pressable>
            ) : (
              <View style={s.iconBtn}>
                <MaterialCommunityIcons name="crown" size={20} color="#FCD34D" />
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 8 }}>
              <View style={s.brandChip}>
                <MaterialCommunityIcons name="crown" size={12} color="#B45309" />
                <Text style={s.brandChipTxt}>AVISION</Text>
              </View>
            </View>
            <Pressable
              onPress={() => router.push('/test-prime/history' as any)}
              testID="tp-history"
              hitSlop={12}
              style={[s.iconBtn, { marginRight: 6 }]}
            >
              <Ionicons name="time-outline" size={22} color="#FFF" />
            </Pressable>
            <Pressable
              onPress={() => router.push('/(tabs)/profile')}
              testID="tp-profile"
              hitSlop={12}
              style={s.iconBtn}
            >
              <Ionicons name="person-circle-outline" size={24} color="#FFF" />
            </Pressable>
          </View>

          <Text style={s.title}>TEST PRIME</Text>
          <Text style={s.tag}>One Pass. Every Exam. Unlimited Practice.</Text>

          <View style={s.searchWrap}>
            <Ionicons name="search-outline" size={16} color="#94A3B8" />
            <TextInput
              testID="tp-search"
              value={search}
              onChangeText={setSearch}
              placeholder="Search exam (SBI PO, CLAT, IPMAT...)"
              placeholderTextColor="#94A3B8"
              style={s.searchInput}
              returnKeyType="search"
            />
            {!!search && (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </Pressable>
            )}
          </View>

          {isPrime && (
            <View style={s.activeBar}>
              <Ionicons name="checkmark-circle" size={14} color="#065F46" />
              <Text style={s.activeBarTxt}>PRIME ACTIVE • {ent?.plan || 'Test Prime'}</Text>
              <View style={{ flex: 1 }} />
              <Pressable onPress={resetPrime} testID="tp-reset" hitSlop={8}>
                <Text style={s.linkTxt}>Reset</Text>
              </Pressable>
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator color="#F59E0B" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 140 + insets.bottom }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F59E0B" />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* ==================== CATEGORY TABS ==================== */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.catRow}
          >
            {categories.map((c) => {
              const active = c.id === selectedCat;
              return (
                <Pressable
                  key={c.id}
                  testID={`tp-cat-${c.id}`}
                  onPress={() => setSelectedCat(c.id)}
                  style={[
                    s.catChip,
                    active && { backgroundColor: c.color, borderColor: c.color },
                  ]}
                >
                  <Ionicons
                    name={c.icon as any}
                    size={14}
                    color={active ? '#FFF' : c.color}
                  />
                  <Text style={[s.catChipTxt, active && { color: '#FFF' }]}>{c.name}</Text>
                  {c.exam_count > 0 && (
                    <View style={[s.catCount, active && s.catCountActive]}>
                      <Text style={[s.catCountTxt, active && { color: '#FFF' }]}>
                        {c.exam_count}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ==================== EXAMS SECTION ==================== */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Exams</Text>
            <View style={s.card}>
              {topExams.map((e, idx) => {
                const isSelected = selectedExamId === e.id;
                return (
                  <Pressable
                    key={e.id}
                    testID={`tp-exam-${e.id}`}
                    onPress={() => {
                      setSelectedExamId(e.id);
                      router.push(`/test-prime/exam/${e.id}` as any);
                    }}
                    style={[
                      s.examRow,
                      idx < topExams.length - 1 && s.examRowDivider,
                      isSelected && s.examRowSelected,
                    ]}
                  >
                    <View
                      style={[
                        s.examLogo,
                        { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : `${e.color}15` },
                      ]}
                    >
                      <Text
                        style={[s.examLogoTxt, { color: isSelected ? '#FFF' : e.color }]}
                        numberOfLines={1}
                      >
                        {e.logo}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={s.langRow}>
                        {e.languages.slice(0, 2).map((l) => (
                          <View
                            key={l}
                            style={[
                              s.langChip,
                              isSelected && { backgroundColor: 'rgba(255,255,255,0.25)' },
                            ]}
                          >
                            <Text
                              style={[
                                s.langChipTxt,
                                isSelected && { color: '#FFF' },
                              ]}
                            >
                              {l}
                            </Text>
                          </View>
                        ))}
                      </View>
                      <Text
                        style={[s.examName, isSelected && { color: '#FFF' }]}
                        numberOfLines={2}
                      >
                        {e.name} 2026 Mock Test Series
                      </Text>
                      <Text style={s.examMeta}>
                        <Text
                          style={[
                            s.examMetaBold,
                            isSelected && { color: 'rgba(255,255,255,0.85)' },
                          ]}
                        >
                          {e.tests_count} Tests
                        </Text>
                        <Text
                          style={[
                            s.examFree,
                            isSelected && { color: '#A7F3D0' },
                          ]}
                        >
                          {'  '}+ {e.free_tests} Free Tests
                        </Text>
                      </Text>
                    </View>
                    <View style={[s.chevBtn, isSelected && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                      <Ionicons name="chevron-forward" size={16} color="#FFF" />
                    </View>
                  </Pressable>
                );
              })}
              {topExams.length === 0 && (
                <View style={s.emptyRow}>
                  <MaterialCommunityIcons
                    name="clipboard-search-outline"
                    size={40}
                    color="#94A3B8"
                  />
                  <Text style={s.emptyTxt}>No exams match your search.</Text>
                </View>
              )}
            </View>

            {canExpand && (
              <Pressable
                testID="tp-view-all"
                onPress={toggleExamsExpanded}
                style={s.viewAllBtn}
              >
                <Text style={s.viewAllTxt}>
                  {examsExpanded ? 'VIEW LESS' : `VIEW ALL (${filteredExams.length})`}
                </Text>
                <Ionicons
                  name={examsExpanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color="#2563EB"
                />
              </Pressable>
            )}
          </View>

          {/* ==================== SALIENT FEATURES ==================== */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Salient Features</Text>
            <View style={s.featGrid}>
              {features.map((f) => (
                <View key={f.id} style={s.featCard}>
                  <View style={[s.featIconWrap, { backgroundColor: f.bg }]}>
                    {f.iconLib === 'material' ? (
                      <MaterialCommunityIcons
                        name={f.icon as any}
                        size={22}
                        color={f.color}
                      />
                    ) : (
                      <Ionicons name={f.icon as any} size={22} color={f.color} />
                    )}
                  </View>
                  <Text style={s.featTxt} numberOfLines={2}>
                    {f.title}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* ==================== PRODUCT HIGHLIGHTS ==================== */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Product Highlights</Text>
            <View style={s.card}>
              {(showAllHighlights ? highlights : highlights.slice(0, 5)).map((h, i) => (
                <View key={i} style={s.highlightRow}>
                  <View style={s.checkWrap}>
                    <Ionicons name="checkmark" size={14} color="#2563EB" />
                  </View>
                  <Text style={s.highlightTxt}>{h}</Text>
                </View>
              ))}
              {highlights.length > 5 && (
                <Pressable
                  onPress={() => setShowAllHighlights((v) => !v)}
                  style={s.showMoreBtn}
                  testID="tp-show-more"
                >
                  <Text style={s.showMoreTxt}>
                    {showAllHighlights ? 'SHOW LESS' : 'SHOW MORE'}
                  </Text>
                  <Ionicons
                    name={showAllHighlights ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#2563EB"
                  />
                </Pressable>
              )}
            </View>
          </View>

          {/* ==================== FAQ ==================== */}
          <View style={s.section}>
            <View style={s.faqHead}>
              <Text style={s.sectionTitle}>FAQ</Text>
              <Pressable onPress={toggleAllFaqs} testID="tp-expand-all" hitSlop={8}>
                <Text style={s.expandAllTxt}>
                  {allFaqsOpen ? 'COLLAPSE ALL' : 'EXPAND ALL'}
                </Text>
              </Pressable>
            </View>
            <View style={s.card}>
              {faqs.map((f, i) => {
                const open = !!expandedFaqs[i];
                return (
                  <View key={i} style={[s.faqRow, i < faqs.length - 1 && s.faqDivider]}>
                    <Pressable
                      onPress={() => toggleFaq(i)}
                      style={s.faqQRow}
                      testID={`tp-faq-${i}`}
                    >
                      <Text style={s.faqQ} numberOfLines={open ? 0 : 3}>
                        <Text style={s.faqIdx}>{i + 1}. </Text>
                        {f.q}
                      </Text>
                      <Ionicons
                        name={open ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color="#94A3B8"
                        style={{ marginLeft: 8 }}
                      />
                    </Pressable>
                    {open && <Text style={s.faqA}>{f.a}</Text>}
                  </View>
                );
              })}
            </View>
          </View>

          {/* ==================== NEED ANY HELP ==================== */}
          <View style={s.section}>
            <Text style={[s.sectionTitle, { textAlign: 'center' }]}>Need any help?</Text>
            <View style={[s.card, { paddingTop: 8 }]}>
              <View style={s.supportIllus}>
                <MaterialCommunityIcons
                  name="face-agent"
                  size={72}
                  color="#0B4DB8"
                />
                <View style={s.supportBubble}>
                  <MaterialCommunityIcons name="chat-processing" size={14} color="#FFF" />
                </View>
              </View>

              <View style={s.supportBlock}>
                <View style={{ flex: 1 }}>
                  <Text style={s.supportTitle}>Get help with our 24×7 Support System</Text>
                  <Text style={s.supportMeta}>(Mon - Sat | 9:00am - 9:00pm)</Text>
                </View>
                <Pressable
                  style={s.supportBtn}
                  onPress={() => Linking.openURL('mailto:support@avisioninstitute.com')}
                  testID="tp-contact"
                >
                  <Text style={s.supportBtnTxt}>CONTACT US</Text>
                </Pressable>
              </View>

              <View style={[s.supportBlock, { borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.supportTitle}>Call us directly for purchase related queries</Text>
                  <Text style={s.supportMeta}>(Mon - Sat | 9:00am - 9:00pm)</Text>
                </View>
                <Pressable
                  style={s.supportBtn}
                  onPress={() => Linking.openURL('tel:+919000012345')}
                  testID="tp-call"
                >
                  <Text style={s.supportBtnTxt}>CALL NOW</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* ============ ADMIN + HISTORY ROW ============ */}
          <View style={[s.section, { flexDirection: 'row', gap: 10 }]}>
            <Pressable
              onPress={() => router.push('/test-prime/history' as any)}
              style={s.quickLink}
              testID="tp-quick-history"
            >
              <View style={[s.quickLinkIcon, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="time-outline" size={18} color="#2563EB" />
              </View>
              <Text style={s.quickLinkTitle}>Test History</Text>
              <Text style={s.quickLinkSub}>Your past attempts & retakes</Text>
            </Pressable>
            {(user?.email === 'admin@avision.com' || user?.email === 'test@avision.com' || (user as any)?.is_admin) && (
              <Pressable
                onPress={() => router.push('/test-prime/admin' as any)}
                style={s.quickLink}
                testID="tp-quick-admin"
              >
                <View style={[s.quickLinkIcon, { backgroundColor: '#F5F3FF' }]}>
                  <MaterialCommunityIcons name="shield-crown" size={18} color="#7C3AED" />
                </View>
                <Text style={s.quickLinkTitle}>Admin Console</Text>
                <Text style={s.quickLinkSub}>Manage questions & tests</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      )}

      {/* ==================== STICKY BOTTOM BAR ==================== */}
      {!!selectedPlan && (
        <View style={[s.stickyBar, { paddingBottom: 10 + insets.bottom }]}>
          <LinearGradient
            colors={['#0B1F4A', '#1E3A8A', '#312E81']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.stickyGrad}
          >
            {/* subtle premium overlay */}
            <View style={s.premiumGlow} />
            <View style={s.stickyRow}>
              <View style={{ flex: 1 }}>
                <View style={s.planTopRow}>
                  <View style={s.planIconRing}>
                    <MaterialCommunityIcons name="crown" size={13} color="#FCD34D" />
                  </View>
                  <Text style={s.planLbl}>Our Plans</Text>
                  <Pressable
                    onPress={() => setPlanPickerOpen(true)}
                    style={s.planPicker}
                    testID="tp-plan-picker"
                  >
                    <Text style={s.planPickerTxt}>{selectedPlan.label}</Text>
                    <Ionicons name="chevron-down" size={12} color="#FFF" />
                  </Pressable>
                </View>

                <View style={s.priceRow}>
                  <Text style={s.price}>₹{selectedPlan.price}</Text>
                  <View style={s.mrpCol}>
                    <Text style={s.mrp}>₹{selectedPlan.mrp}</Text>
                    <View style={s.discountPill}>
                      <MaterialCommunityIcons name="fire" size={10} color="#065F46" />
                      <Text style={s.discountTxt}>{selectedPlan.discount_pct}% OFF</Text>
                    </View>
                  </View>
                </View>

                <Pressable style={s.moreOffersBtn}>
                  <MaterialCommunityIcons name="tag-multiple" size={10} color="#FCD34D" />
                  <Text style={s.moreOffersTxt}>MORE OFFERS AVAILABLE</Text>
                </Pressable>
              </View>

              <Pressable
                style={({ pressed }) => [s.choosePlanWrap, pressed && s.choosePlanPressed]}
                onPress={() => setChoosePlanOpen(true)}
                testID="tp-choose-plan"
              >
                <LinearGradient
                  colors={['#F59E0B', '#F97316', '#EA580C']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.choosePlanBtn}
                >
                  <Text style={s.choosePlanTxt}>{isPrime ? 'RENEW' : 'BUY NOW'}</Text>
                  <View style={s.chooseArrow}>
                    <Ionicons name="arrow-forward" size={14} color="#EA580C" />
                  </View>
                </LinearGradient>
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* ==================== PLAN PICKER MODAL ==================== */}
      <Modal
        visible={planPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPlanPickerOpen(false)}
      >
        <Pressable style={s.modalBackdrop} onPress={() => setPlanPickerOpen(false)}>
          <Pressable style={[s.sheet, { paddingBottom: 20 + insets.bottom }]}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Select Validity</Text>
            {plans.map((p) => {
              const active = p.id === selectedPlanId;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    setSelectedPlanId(p.id);
                    setPlanPickerOpen(false);
                  }}
                  style={[s.planItem, active && s.planItemActive]}
                  testID={`tp-plan-${p.id}`}
                >
                  <View
                    style={[
                      s.radio,
                      active && { borderColor: '#F59E0B', backgroundColor: '#F59E0B' },
                    ]}
                  >
                    {active && <Ionicons name="checkmark" size={12} color="#FFF" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={s.planItemLbl}>{p.label}</Text>
                      {p.popular && (
                        <View style={s.popBadge}>
                          <Text style={s.popBadgeTxt}>POPULAR</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.planItemSub}>
                      ₹{p.price}   <Text style={s.planItemMrp}>₹{p.mrp}</Text>   
                      <Text style={s.planItemDisc}>{p.discount_pct}% off</Text>
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ==================== CHOOSE PLAN CONFIRM MODAL ==================== */}
      <Modal
        visible={choosePlanOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setChoosePlanOpen(false)}
      >
        <View style={s.confirmBackdrop}>
          <View style={s.confirmCard}>
            <View style={s.confirmIcon}>
              <MaterialCommunityIcons name="crown" size={36} color="#F59E0B" />
            </View>
            <Text style={s.confirmTitle}>Activate Test Prime?</Text>
            <Text style={s.confirmSub}>
              You’re about to unlock Test Prime for{' '}
              <Text style={{ fontWeight: '900', color: '#0F172A' }}>{selectedPlan?.label}</Text> at{' '}
              <Text style={{ fontWeight: '900', color: '#0F172A' }}>₹{selectedPlan?.price}</Text>.
              {'\n\n'}
              <Text style={{ fontSize: 11, color: '#94A3B8' }}>
                (Demo activation — no real payment)
              </Text>
            </Text>
            <View style={s.confirmBtnRow}>
              <Pressable
                style={[s.confirmBtn, s.confirmBtnGhost]}
                onPress={() => setChoosePlanOpen(false)}
                disabled={activating}
                testID="tp-confirm-cancel"
              >
                <Text style={s.confirmBtnGhostTxt}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[s.confirmBtn, s.confirmBtnPrimary]}
                onPress={handleChoosePlan}
                disabled={activating}
                testID="tp-confirm-activate"
              >
                {activating ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={s.confirmBtnPrimaryTxt}>Activate</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Hero
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 6 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  brandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  brandChipTxt: { color: '#B45309', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: '#FFF', fontSize: 32, fontWeight: '900', marginTop: 14, letterSpacing: 1.5 },
  tag: { color: 'rgba(255,255,255,0.92)', fontSize: 13, marginTop: 4, fontWeight: '600' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  searchInput: { flex: 1, fontSize: 13.5, color: '#0F172A', paddingVertical: 0 },
  activeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D1FAE5',
    padding: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  activeBarTxt: { color: '#065F46', fontSize: 12, fontWeight: '900' },
  linkTxt: { color: '#065F46', fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },

  // Category chips
  catRow: { paddingHorizontal: 16, paddingTop: 14, gap: 8 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: { shadowColor: '#0B4DB8', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  catChipTxt: { fontSize: 12.5, fontWeight: '800', color: '#0F172A' },
  catCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catCountActive: { backgroundColor: 'rgba(255,255,255,0.28)', borderColor: 'rgba(255,255,255,0.35)' },
  catCountTxt: { fontSize: 10.5, fontWeight: '900', color: '#0F172A' },

  // Section
  section: { paddingHorizontal: 16, marginTop: 22 },
  sectionTitle: { fontSize: 15.5, fontWeight: '900', color: '#0F172A', marginBottom: 10 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    ...Platform.select({
      ios: { shadowColor: '#0B4DB8', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10 },
      android: { elevation: 1 },
    }),
  },

  // Exam row
  examRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  examRowDivider: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  examRowSelected: {
    backgroundColor: '#2563EB',
    borderBottomColor: 'rgba(255,255,255,0.15)',
    ...Platform.select({
      ios: {
        shadowColor: '#2563EB',
        shadowOpacity: 0.28,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  examLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  examLogoTxt: { fontSize: 11, fontWeight: '900', letterSpacing: 0.4 },
  langRow: { flexDirection: 'row', gap: 6 },
  langChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  langChipTxt: { fontSize: 9, fontWeight: '800', color: '#64748B', letterSpacing: 0.5 },
  examName: { fontSize: 14.5, fontWeight: '800', color: '#0F172A', marginTop: 6 },
  examMeta: { marginTop: 4, fontSize: 12 },
  examMetaBold: { color: '#64748B', fontWeight: '700' },
  examFree: { color: '#059669', fontWeight: '700' },
  chevBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyRow: { alignItems: 'center', paddingVertical: 34, gap: 8 },
  emptyTxt: { fontSize: 12.5, color: '#94A3B8' },
  viewAllBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFF',
  },
  viewAllTxt: { color: '#2563EB', fontSize: 12.5, fontWeight: '900', letterSpacing: 1 },

  // Features grid
  featGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  featCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#0B4DB8', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  featIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  featTxt: { flex: 1, fontSize: 12, fontWeight: '700', color: '#0F172A', lineHeight: 16 },

  // Highlights
  highlightRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  checkWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  highlightTxt: { flex: 1, fontSize: 12.5, color: '#0F172A', lineHeight: 18, fontWeight: '500' },
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  showMoreTxt: { color: '#2563EB', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },

  // FAQ
  faqHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  expandAllTxt: { color: '#2563EB', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  faqRow: { paddingHorizontal: 14, paddingVertical: 12 },
  faqDivider: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  faqQRow: { flexDirection: 'row', alignItems: 'center' },
  faqQ: { flex: 1, fontSize: 13, fontWeight: '600', color: '#0F172A', lineHeight: 18 },
  faqIdx: { fontWeight: '900', color: '#0F172A' },
  faqA: { fontSize: 12.5, color: '#64748B', lineHeight: 18, marginTop: 8 },

  // Support
  supportIllus: { alignItems: 'center', paddingVertical: 16, position: 'relative' },
  supportBubble: {
    position: 'absolute',
    top: 12,
    right: '38%',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  supportTitle: { fontSize: 12.5, fontWeight: '700', color: '#0F172A', lineHeight: 17 },
  supportMeta: { fontSize: 11, color: '#94A3B8', marginTop: 2, fontWeight: '600' },
  supportBtn: {
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  supportBtnTxt: { color: '#2563EB', fontSize: 11, fontWeight: '900', letterSpacing: 0.4 },

  quickLink: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  quickLinkIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickLinkTitle: { fontSize: 13, fontWeight: '900', color: '#0F172A' },
  quickLinkSub: { fontSize: 10.5, fontWeight: '600', color: '#64748B', marginTop: 2 },

  // Sticky bar (premium redesign)
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  stickyGrad: {
    borderRadius: 20,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#1E3A8A', shadowOpacity: 0.32, shadowOffset: { width: 0, height: 10 }, shadowRadius: 20 },
      android: { elevation: 14 },
    }),
  },
  premiumGlow: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(252,211,77,0.15)',
  },
  stickyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  planIconRing: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(252,211,77,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(252,211,77,0.4)',
  },
  planLbl: { fontSize: 11.5, fontWeight: '700', color: 'rgba(255,255,255,0.85)', letterSpacing: 0.4 },
  planPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  planPickerTxt: { fontSize: 11, fontWeight: '900', color: '#FFF' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6 },
  price: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -0.5,
    ...Platform.select({
      ios: { textShadowColor: 'rgba(252,211,77,0.35)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 12 },
      android: {},
    }),
  },
  mrpCol: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mrp: { fontSize: 12, color: 'rgba(255,255,255,0.55)', textDecorationLine: 'line-through', fontWeight: '700' },
  discountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#A7F3D0',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  discountTxt: { color: '#065F46', fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  moreOffersBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: 'rgba(252,211,77,0.15)',
    borderRadius: 6,
  },
  moreOffersTxt: { color: '#FCD34D', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.5 },
  choosePlanWrap: {
    borderRadius: 999,
    ...Platform.select({
      ios: { shadowColor: '#F97316', shadowOpacity: 0.5, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14 },
      android: { elevation: 6 },
    }),
  },
  choosePlanPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.94,
  },
  choosePlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
  },
  choosePlanTxt: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 0.8 },
  chooseArrow: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal / sheet
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 15, fontWeight: '900', color: '#0F172A', marginBottom: 10 },
  planItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  planItemActive: { borderColor: '#F59E0B', backgroundColor: '#FEF3C7' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planItemLbl: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  planItemSub: { fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: '600' },
  planItemMrp: { textDecorationLine: 'line-through', color: '#94A3B8' },
  planItemDisc: { color: '#059669', fontWeight: '900' },
  popBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  popBadgeTxt: { color: '#FFF', fontSize: 8.5, fontWeight: '900', letterSpacing: 0.4 },

  // Confirm modal
  confirmBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  confirmCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, alignItems: 'center', width: '100%', maxWidth: 380 },
  confirmIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  confirmTitle: { fontSize: 17, fontWeight: '900', color: '#0F172A', marginBottom: 8 },
  confirmSub: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 19 },
  confirmBtnRow: { flexDirection: 'row', gap: 10, marginTop: 22, alignSelf: 'stretch' },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  confirmBtnGhost: { borderWidth: 1, borderColor: '#E2E8F0' },
  confirmBtnGhostTxt: { color: '#0F172A', fontSize: 13, fontWeight: '800' },
  confirmBtnPrimary: { backgroundColor: '#DC2626' },
  confirmBtnPrimaryTxt: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
});
