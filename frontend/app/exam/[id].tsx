import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';

const TABS = ['Overview', 'Eligibility', 'Salary', 'Syllabus', 'Pattern', 'Books', 'Strategy', 'Cutoffs', 'PYQ', 'Roadmap', 'FAQs'] as const;

export default function ExamDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<string>('Overview');

  useEffect(() => { if (id) api.examDetail(id).then(setData); }, [id]);

  if (!data) return <View style={{ flex: 1, backgroundColor: '#FFF' }} />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <SafeAreaView edges={['top']} style={s.hero}>
        <LinearGradient colors={[theme.colors.brand, theme.colors.brandDark]} style={StyleSheet.absoluteFill} />
        <View style={s.heroTop}>
          <Pressable testID="back-btn" style={s.iconBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </Pressable>
          <Pressable style={s.iconBtn} testID="bookmark-btn">
            <Ionicons name="bookmark-outline" size={20} color="#FFF" />
          </Pressable>
        </View>
        <View style={s.heroBody}>
          <Text style={s.examName}>{data.name}</Text>
          <Text style={s.examTag}>Complete preparation hub</Text>
          <View style={s.heroStats}>
            <View style={s.heroStat}><Ionicons name="cash-outline" size={13} color="#FFF" /><Text style={s.heroStatTxt}>{data.salary.split(' ')[0]}</Text></View>
            <View style={s.heroStat}><Ionicons name="person-outline" size={13} color="#FFF" /><Text style={s.heroStatTxt}>{data.age_limit.split(' ')[0]}y</Text></View>
            <View style={s.heroStat}><Ionicons name="document-text-outline" size={13} color="#FFF" /><Text style={s.heroStatTxt}>{data.selection_process.length} stages</Text></View>
          </View>
        </View>
      </SafeAreaView>

      <View style={s.tabsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {TABS.map((t) => (
            <Pressable key={t} testID={`tab-${t}`} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
              <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>{t}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {tab === 'Overview' && (
          <View>
            <Section title="About the Exam" body={data.overview} />
            <InfoRow label="Age Limit" value={data.age_limit} />
            <InfoRow label="Salary Range" value={data.salary} />
            <Section title="Selection Process">
              {data.selection_process.map((sp: string, i: number) => (
                <View key={i} style={s.stepRow}>
                  <View style={s.stepNum}><Text style={s.stepNumTxt}>{i + 1}</Text></View>
                  <Text style={s.stepTxt}>{sp}</Text>
                </View>
              ))}
            </Section>
            <Section title="Latest Notifications">
              {data.notifications.map((n: any, i: number) => (
                <View key={i} style={s.notif}>
                  <Ionicons name="notifications-outline" size={16} color={theme.colors.brand} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.notifTitle}>{n.title}</Text>
                    <Text style={s.notifDate}>{n.date}</Text>
                  </View>
                </View>
              ))}
            </Section>
          </View>
        )}
        {tab === 'Eligibility' && (
          <Section title="Eligibility Criteria">
            {data.eligibility.map((e: string, i: number) => <Bullet key={i} text={e} />)}
          </Section>
        )}
        {tab === 'Salary' && (
          <>
            <Section title="Salary & Benefits" body={data.salary} />
            <View style={s.salaryCard}>
              <Ionicons name="cash" size={28} color={theme.colors.gold} />
              <Text style={s.salaryVal}>{data.salary}</Text>
              <Text style={s.salarySub}>Plus DA, HRA, allowances & pension</Text>
            </View>
          </>
        )}
        {tab === 'Syllabus' && (
          <View>
            {data.syllabus.map((sub: any) => (
              <View key={sub.subject} style={s.subj}>
                <Text style={s.subjName}>{sub.subject}</Text>
                {sub.topics.map((t: string, i: number) => <Bullet key={i} text={t} />)}
              </View>
            ))}
          </View>
        )}
        {tab === 'Pattern' && <Section title="Exam Pattern" body={data.pattern} />}
        {tab === 'Books' && (
          <Section title="Recommended Books">
            {data.books.map((b: string, i: number) => (
              <View key={i} style={s.bookRow}>
                <Ionicons name="book" size={18} color={theme.colors.gold} />
                <Text style={s.bookTxt}>{b}</Text>
              </View>
            ))}
          </Section>
        )}
        {tab === 'Strategy' && <Section title="Preparation Strategy" body={data.strategy} />}
        {tab === 'Cutoffs' && (
          <Section title="Previous Year Cutoffs">
            <View style={s.tableHead}>
              <Text style={[s.cell, s.cellHead, { flex: 0.8 }]}>Year</Text>
              <Text style={[s.cell, s.cellHead]}>Gen</Text>
              <Text style={[s.cell, s.cellHead]}>OBC</Text>
              <Text style={[s.cell, s.cellHead]}>SC</Text>
              <Text style={[s.cell, s.cellHead]}>ST</Text>
            </View>
            {data.cutoffs.map((c: any) => (
              <View key={c.year} style={s.tableRow}>
                <Text style={[s.cell, { flex: 0.8, fontWeight: '700' }]}>{c.year}</Text>
                <Text style={s.cell}>{c.general}</Text>
                <Text style={s.cell}>{c.obc}</Text>
                <Text style={s.cell}>{c.sc}</Text>
                <Text style={s.cell}>{c.st}</Text>
              </View>
            ))}
          </Section>
        )}
        {tab === 'PYQ' && (
          <Section title="Previous Year Papers">
            {data.previous_papers.map((p: any) => (
              <Pressable key={p.year} style={s.pyqRow}>
                <Ionicons name="document-text" size={20} color={theme.colors.brand} />
                <Text style={s.pyqTxt}>{data.name} - {p.year}</Text>
                <Ionicons name="download-outline" size={18} color={theme.colors.brand} />
              </Pressable>
            ))}
          </Section>
        )}
        {tab === 'Roadmap' && (
          <Section title="6-Month Roadmap">
            {data.roadmap.map((r: string, i: number) => (
              <View key={i} style={s.roadRow}>
                <View style={s.roadDot}><Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>{i + 1}</Text></View>
                <Text style={s.roadTxt}>{r}</Text>
              </View>
            ))}
          </Section>
        )}
        {tab === 'FAQs' && (
          <Section title="Frequently Asked Questions">
            {data.faqs.map((f: any, i: number) => (
              <View key={i} style={s.faq}>
                <Text style={s.faqQ}>{f.q}</Text>
                <Text style={s.faqA}>{f.a}</Text>
              </View>
            ))}
          </Section>
        )}
      </ScrollView>

      <View style={s.ctaBar}>
        <Pressable testID="start-prep-btn" style={s.cta} onPress={() => router.push('/planner')}>
          <Ionicons name="sparkles" size={18} color="#FFF" />
          <Text style={s.ctaTxt}>Start AI Preparation</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Section({ title, body, children }: any) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={s.secTitle}>{title}</Text>
      {body ? <Text style={s.secBody}>{body}</Text> : null}
      {children}
    </View>
  );
}
function Bullet({ text }: { text: string }) {
  return <View style={s.bullet}><View style={s.bulletDot} /><Text style={s.bulletTxt}>{text}</Text></View>;
}
function InfoRow({ label, value }: { label: string; value: string }) {
  return <View style={s.info}><Text style={s.infoLbl}>{label}</Text><Text style={s.infoVal}>{value}</Text></View>;
}

const s = StyleSheet.create({
  hero: { paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 4 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  heroBody: { paddingHorizontal: 20, paddingTop: 16 },
  examName: { color: '#FFF', fontSize: 26, fontWeight: '800' },
  examTag: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },
  heroStats: { flexDirection: 'row', gap: 8, marginTop: 14 },
  heroStat: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  heroStatTxt: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  tabsWrap: { height: 56, backgroundColor: '#FFF', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border, justifyContent: 'center' },
  tab: { height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: theme.colors.surfaceSecondary, justifyContent: 'center', flexShrink: 0 },
  tabActive: { backgroundColor: theme.colors.brand },
  tabTxt: { fontSize: 12, fontWeight: '700', color: theme.colors.onSurfaceSecondary },
  tabTxtActive: { color: '#FFF' },
  secTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.onSurface, marginBottom: 8 },
  secBody: { fontSize: 14, color: theme.colors.onSurfaceSecondary, lineHeight: 20 },
  info: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: theme.colors.surfaceSecondary, padding: 12, borderRadius: 12, marginBottom: 8 },
  infoLbl: { fontSize: 13, color: theme.colors.muted, fontWeight: '600' },
  infoVal: { fontSize: 13, color: theme.colors.onSurface, fontWeight: '700', flex: 1, textAlign: 'right' },
  stepRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center' },
  stepNumTxt: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  stepTxt: { flex: 1, fontSize: 13, color: theme.colors.onSurfaceSecondary, lineHeight: 20 },
  notif: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: theme.colors.brandTertiary, borderRadius: 12, marginTop: 8 },
  notifTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.onSurface },
  notifDate: { fontSize: 11, color: theme.colors.muted, marginTop: 2 },
  salaryCard: { alignItems: 'center', padding: 22, backgroundColor: theme.colors.goldTint, borderRadius: 20 },
  salaryVal: { fontSize: 20, fontWeight: '800', color: theme.colors.gold, marginTop: 8 },
  salarySub: { fontSize: 12, color: theme.colors.onSurfaceSecondary, marginTop: 6 },
  bullet: { flexDirection: 'row', gap: 10, marginTop: 8 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.brand, marginTop: 8 },
  bulletTxt: { flex: 1, fontSize: 13, color: theme.colors.onSurfaceSecondary, lineHeight: 19 },
  subj: { backgroundColor: theme.colors.surfaceSecondary, padding: 14, borderRadius: 14, marginBottom: 10 },
  subjName: { fontSize: 15, fontWeight: '800', color: theme.colors.brand, marginBottom: 4 },
  bookRow: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, backgroundColor: theme.colors.goldTint, borderRadius: 12, marginTop: 8 },
  bookTxt: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.colors.onSurface },
  tableHead: { flexDirection: 'row', paddingVertical: 10, backgroundColor: theme.colors.brand, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  cell: { flex: 1, textAlign: 'center', fontSize: 13, color: theme.colors.onSurfaceSecondary },
  cellHead: { color: '#FFF', fontWeight: '800' },
  pyqRow: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, backgroundColor: theme.colors.brandTertiary, borderRadius: 12, marginTop: 8 },
  pyqTxt: { flex: 1, fontSize: 13, fontWeight: '700', color: theme.colors.onSurface },
  roadRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 10 },
  roadDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.gold, alignItems: 'center', justifyContent: 'center' },
  roadTxt: { flex: 1, fontSize: 13, color: theme.colors.onSurfaceSecondary, lineHeight: 19 },
  faq: { padding: 14, backgroundColor: theme.colors.surfaceSecondary, borderRadius: 14, marginTop: 8 },
  faqQ: { fontSize: 13, fontWeight: '800', color: theme.colors.onSurface },
  faqA: { fontSize: 12, color: theme.colors.onSurfaceSecondary, marginTop: 6, lineHeight: 18 },
  ctaBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#FFF', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
  cta: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 16, backgroundColor: theme.colors.brand },
  ctaTxt: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
