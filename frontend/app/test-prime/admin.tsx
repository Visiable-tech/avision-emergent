import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  StatusBar as RNStatusBar,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';

const SUBJECTS = ['quant', 'reasoning', 'english', 'gk', 'science', 'legal', 'math'];

type Tab = 'overview' | 'questions' | 'tests';

export default function AdminHub() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Guard
  const isAdmin = !!user && (user.is_admin || user.email === 'admin@avision.com' || user.email === 'test@avision.com');

  const loadStats = useCallback(async () => {
    try {
      const s = await api.tpAdminStats();
      setStats(s);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) loadStats();
  }, [isAdmin, loadStats]);

  if (!isAdmin) {
    return (
      <View style={s.gate}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView edges={['top']}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={s.gateBack}>
            <Ionicons name="chevron-back" size={22} color="#0F172A" />
          </Pressable>
        </SafeAreaView>
        <View style={s.gateContent}>
          <View style={s.gateIcon}>
            <MaterialCommunityIcons name="shield-lock" size={40} color="#DC2626" />
          </View>
          <Text style={s.gateTitle}>Admin only</Text>
          <Text style={s.gateSub}>
            This area is restricted to authorised administrators. Please sign in with an admin account.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={['#0F172A', '#1E293B']} style={s.hero}>
        <SafeAreaView edges={['top']}>
          <View style={s.headRow}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={s.iconBtn} testID="adm-back">
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </Pressable>
            <View style={{ flex: 1, marginHorizontal: 8 }}>
              <Text style={s.title}>Test Prime Admin</Text>
              <Text style={s.sub}>Manage question bank and tests</Text>
            </View>
            <View style={s.badge}>
              <MaterialCommunityIcons name="shield-check" size={12} color="#FCD34D" />
              <Text style={s.badgeTxt}>ADMIN</Text>
            </View>
          </View>

          <View style={s.tabRow}>
            {(['overview', 'questions', 'tests'] as Tab[]).map((t) => (
              <Pressable key={t} onPress={() => setTab(t)} style={[s.tab, tab === t && s.tabActive]} testID={`adm-tab-${t}`}>
                <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>{t[0].toUpperCase() + t.slice(1)}</Text>
              </Pressable>
            ))}
          </View>
        </SafeAreaView>
      </LinearGradient>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#2563EB" size="large" /></View>
      ) : (
        <View style={{ flex: 1 }}>
          {tab === 'overview' && <OverviewPanel stats={stats} onRefresh={loadStats} />}
          {tab === 'questions' && <QuestionsPanel onChange={loadStats} />}
          {tab === 'tests' && <TestsPanel onChange={loadStats} />}
        </View>
      )}
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

// ============ Overview panel ============
function OverviewPanel({ stats, onRefresh }: any) {
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={s.statGrid}>
        <StatCard icon="library" color="#2563EB" val={stats?.curated_questions ?? 0} lbl="Curated Questions" />
        <StatCard icon="add-circle" color="#10B981" val={stats?.admin_questions ?? 0} lbl="Admin Questions" />
        <StatCard icon="document-text" color="#F59E0B" val={stats?.curated_tests ?? 0} lbl="Curated Tests" />
        <StatCard icon="add-circle" color="#8B5CF6" val={stats?.admin_tests ?? 0} lbl="Admin Tests" />
      </View>
      <View style={s.statGrid}>
        <StatCard icon="analytics" color="#DC2626" val={stats?.total_attempts ?? 0} lbl="Total Attempts" wide />
        <StatCard icon="checkmark-circle" color="#059669" val={stats?.submitted_attempts ?? 0} lbl="Submitted" wide />
      </View>

      <View style={s.helpCard}>
        <MaterialCommunityIcons name="information-outline" size={18} color="#2563EB" />
        <Text style={s.helpTxt}>
          Curated content ships built-in and is read-only. Admin-created questions and tests are stored in the database and can be edited or deleted from the tabs above.
        </Text>
      </View>

      <Pressable onPress={onRefresh} style={s.refreshBtn} testID="adm-refresh">
        <Ionicons name="refresh" size={14} color="#0F172A" />
        <Text style={s.refreshTxt}>Refresh Stats</Text>
      </Pressable>
    </ScrollView>
  );
}

// ============ Questions panel ============
function QuestionsPanel({ onChange }: any) {
  const [subject, setSubject] = useState<string>('quant');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editor, setEditor] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.tpAdminQuestions(subject, undefined, search.trim() || undefined);
      setItems(r.items || []);
    } catch {}
    setLoading(false);
  }, [subject, search]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => setEditor({ subject, topic: '', text: '', options: ['', '', '', ''], correct: 0, difficulty: 'Medium', explanation: '' });
  const openEdit = (q: any) => setEditor({ ...q });

  const save = async () => {
    if (!editor) return;
    if (!editor.text.trim() || editor.options.some((o: string) => !o.trim())) {
      Alert.alert('Missing data', 'Please fill in question text and all 4 options.');
      return;
    }
    try {
      if (editor.id && editor.source === 'admin') {
        await api.tpAdminUpdateQuestion(editor.id, {
          subject: editor.subject, topic: editor.topic, text: editor.text,
          options: editor.options, correct: editor.correct,
          difficulty: editor.difficulty, explanation: editor.explanation,
        });
      } else {
        await api.tpAdminCreateQuestion({
          subject: editor.subject, topic: editor.topic || 'Mixed Topics',
          text: editor.text, options: editor.options, correct: editor.correct,
          difficulty: editor.difficulty, explanation: editor.explanation,
        });
      }
      setEditor(null);
      await load();
      onChange?.();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Try again');
    }
  };

  const del = (q: any) => {
    Alert.alert('Delete?', `Remove "${q.text.slice(0, 60)}..."?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.tpAdminDeleteQuestion(q.id);
            await load();
            onChange?.();
          } catch {}
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={s.toolBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 12 }}>
          {SUBJECTS.map((sub) => (
            <Pressable
              key={sub}
              onPress={() => setSubject(sub)}
              style={[s.subChip, subject === sub && s.subChipActive]}
              testID={`adm-sub-${sub}`}
            >
              <Text style={[s.subChipTxt, subject === sub && { color: '#FFF' }]}>{sub}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={14} color="#94A3B8" />
        <TextInput
          testID="adm-q-search"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={load}
          placeholder="Search question text"
          placeholderTextColor="#94A3B8"
          style={s.searchInput}
        />
        <Pressable onPress={openNew} style={s.plusBtn} testID="adm-q-new">
          <Ionicons name="add" size={18} color="#FFF" />
        </Pressable>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#2563EB" /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={s.hint}>{items.length} questions</Text>
          {items.map((q, i) => (
            <View key={`${q.id}-${i}`} style={s.qCard}>
              <View style={s.qMetaRow}>
                <View
                  style={[
                    s.qBadge,
                    { backgroundColor: q.source === 'admin' ? '#EDE9FE' : '#EFF6FF' },
                  ]}
                >
                  <Text
                    style={[
                      s.qBadgeTxt,
                      { color: q.source === 'admin' ? '#7C3AED' : '#2563EB' },
                    ]}
                  >
                    {q.source === 'admin' ? 'CUSTOM' : 'CURATED'}
                  </Text>
                </View>
                <Text style={s.qMeta}>{q.subject} · {q.topic} · {q.difficulty}</Text>
              </View>
              <Text style={s.qText} numberOfLines={2}>{q.text}</Text>
              <View style={s.qActions}>
                {q.source === 'admin' ? (
                  <>
                    <Pressable onPress={() => openEdit(q)} style={s.actGhost}>
                      <Ionicons name="pencil" size={13} color="#2563EB" />
                      <Text style={s.actGhostTxt}>Edit</Text>
                    </Pressable>
                    <Pressable onPress={() => del(q)} style={[s.actGhost, { borderColor: '#FCA5A5' }]}>
                      <Ionicons name="trash" size={13} color="#DC2626" />
                      <Text style={[s.actGhostTxt, { color: '#DC2626' }]}>Delete</Text>
                    </Pressable>
                  </>
                ) : (
                  <Text style={s.readOnlyTxt}>Read-only (part of curated bank)</Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <QuestionEditor value={editor} onCancel={() => setEditor(null)} onSave={save} onChange={setEditor} />
    </View>
  );
}

// ============ Question editor modal ============
function QuestionEditor({ value, onCancel, onSave, onChange }: any) {
  const insets = useSafeAreaInsets();
  if (!value) return null;
  const setF = (k: string, v: any) => onChange({ ...value, [k]: v });
  const setOpt = (i: number, v: string) => {
    const opts = [...value.options];
    opts[i] = v;
    onChange({ ...value, options: opts });
  };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <View style={s.modalBg}>
        <View style={[s.modalSheet, { paddingBottom: 20 + insets.bottom }]}>
          <View style={s.sheetHandle} />
          <View style={s.editorHead}>
            <Text style={s.editorTitle}>{value.id ? 'Edit Question' : 'New Question'}</Text>
            <Pressable onPress={onCancel} hitSlop={10}><Ionicons name="close" size={22} color="#0F172A" /></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            <Label t="Subject" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {SUBJECTS.map((sub) => (
                <Pressable
                  key={sub}
                  onPress={() => setF('subject', sub)}
                  style={[s.subChip, value.subject === sub && s.subChipActive]}
                >
                  <Text style={[s.subChipTxt, value.subject === sub && { color: '#FFF' }]}>{sub}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Label t="Topic" />
            <TextInput
              placeholder="e.g. Percentage"
              placeholderTextColor="#94A3B8"
              value={value.topic}
              onChangeText={(v) => setF('topic', v)}
              style={s.input}
              testID="adm-topic"
            />

            <Label t="Question" />
            <TextInput
              multiline
              placeholder="Enter question text…"
              placeholderTextColor="#94A3B8"
              value={value.text}
              onChangeText={(v) => setF('text', v)}
              style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]}
              testID="adm-qtext"
            />

            <Label t="Options — tap radio to mark correct" />
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={s.optRow}>
                <Pressable onPress={() => setF('correct', i)} style={[s.optRadio, value.correct === i && s.optRadioOn]}>
                  {value.correct === i && <View style={s.optRadioIn} />}
                </Pressable>
                <Text style={s.optLetter}>{String.fromCharCode(65 + i)}.</Text>
                <TextInput
                  value={value.options[i] || ''}
                  onChangeText={(v) => setOpt(i, v)}
                  placeholder={`Option ${i + 1}`}
                  placeholderTextColor="#94A3B8"
                  style={[s.input, { flex: 1, marginTop: 0 }]}
                  testID={`adm-opt-${i}`}
                />
              </View>
            ))}

            <Label t="Difficulty" />
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {['Easy', 'Medium', 'Hard'].map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setF('difficulty', d)}
                  style={[s.diffChip, value.difficulty === d && s.diffChipActive]}
                >
                  <Text style={[s.diffChipTxt, value.difficulty === d && { color: '#FFF' }]}>{d}</Text>
                </Pressable>
              ))}
            </View>

            <Label t="Explanation (optional)" />
            <TextInput
              multiline
              value={value.explanation}
              onChangeText={(v) => setF('explanation', v)}
              placeholder="Solution walk-through…"
              placeholderTextColor="#94A3B8"
              style={[s.input, { minHeight: 60, textAlignVertical: 'top' }]}
              testID="adm-explain"
            />
          </ScrollView>

          <View style={s.modalActions}>
            <Pressable onPress={onCancel} style={[s.mBtn, s.mBtnGhost]} testID="adm-cancel">
              <Text style={s.mBtnGhostTxt}>Cancel</Text>
            </Pressable>
            <Pressable onPress={onSave} style={[s.mBtn, s.mBtnPrimary]} testID="adm-save">
              <Text style={s.mBtnPrimaryTxt}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============ Tests panel ============
function TestsPanel({ onChange }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [editor, setEditor] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.tpAdminTests(undefined, search.trim() || undefined);
      setItems((r.items || []).slice(0, 60));
    } catch {}
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openNew = () =>
    setEditor({ name: '', exam_id: 'sbi-po', type: 'full-mock', is_free: false, duration_min: 60, questions: 100, marks: 100 });

  const create = async () => {
    if (!editor) return;
    if (!editor.name.trim()) {
      Alert.alert('Missing name', 'Please provide a test name.');
      return;
    }
    try {
      await api.tpAdminCreateTest({
        name: editor.name, exam_id: editor.exam_id, type: editor.type,
        is_free: editor.is_free, duration_min: Number(editor.duration_min),
        questions: Number(editor.questions), marks: Number(editor.marks),
      });
      setEditor(null);
      await load();
      onChange?.();
    } catch (e: any) {
      Alert.alert('Create failed', e?.message || 'Try again');
    }
  };

  const del = (t: any) => {
    Alert.alert('Delete?', `Remove "${t.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.tpAdminDeleteTest(t.id);
            await load();
            onChange?.();
          } catch {}
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={14} color="#94A3B8" />
        <TextInput
          testID="adm-t-search"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={load}
          placeholder="Search test name"
          placeholderTextColor="#94A3B8"
          style={s.searchInput}
        />
        <Pressable onPress={openNew} style={s.plusBtn} testID="adm-t-new">
          <Ionicons name="add" size={18} color="#FFF" />
        </Pressable>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color="#2563EB" /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <Text style={s.hint}>Showing {items.length} of many — refine your search</Text>
          {items.map((t, i) => (
            <View key={`${t.id}-${i}`} style={s.qCard}>
              <View style={s.qMetaRow}>
                <View
                  style={[
                    s.qBadge,
                    { backgroundColor: t.source === 'admin' ? '#EDE9FE' : '#EFF6FF' },
                  ]}
                >
                  <Text
                    style={[
                      s.qBadgeTxt,
                      { color: t.source === 'admin' ? '#7C3AED' : '#2563EB' },
                    ]}
                  >
                    {t.source === 'admin' ? 'CUSTOM' : 'CURATED'}
                  </Text>
                </View>
                <Text style={s.qMeta}>{t.exam_name} · {t.type} · {t.questions}Q · {t.duration_min}m</Text>
              </View>
              <Text style={s.qText} numberOfLines={2}>{t.name}</Text>
              {t.source === 'admin' && (
                <View style={s.qActions}>
                  <Pressable onPress={() => del(t)} style={[s.actGhost, { borderColor: '#FCA5A5' }]}>
                    <Ionicons name="trash" size={13} color="#DC2626" />
                    <Text style={[s.actGhostTxt, { color: '#DC2626' }]}>Delete</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      <TestEditor value={editor} onCancel={() => setEditor(null)} onSave={create} onChange={setEditor} />
    </View>
  );
}

function TestEditor({ value, onCancel, onSave, onChange }: any) {
  const insets = useSafeAreaInsets();
  if (!value) return null;
  const setF = (k: string, v: any) => onChange({ ...value, [k]: v });
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <View style={s.modalBg}>
        <View style={[s.modalSheet, { paddingBottom: 20 + insets.bottom }]}>
          <View style={s.sheetHandle} />
          <View style={s.editorHead}>
            <Text style={s.editorTitle}>New Test</Text>
            <Pressable onPress={onCancel} hitSlop={10}><Ionicons name="close" size={22} color="#0F172A" /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
            <Label t="Test name" />
            <TextInput style={s.input} value={value.name} onChangeText={(v) => setF('name', v)} placeholder="e.g. SBI PO Weekend Mock 12" placeholderTextColor="#94A3B8" testID="adm-t-name" />
            <Label t="Exam ID" />
            <TextInput style={s.input} value={value.exam_id} onChangeText={(v) => setF('exam_id', v)} placeholder="e.g. sbi-po, ssc-cgl, clat" placeholderTextColor="#94A3B8" testID="adm-t-exam" />
            <Label t="Type" />
            <TextInput style={s.input} value={value.type} onChangeText={(v) => setF('type', v)} placeholder="full-mock | sectional | pyq | speed | topic" placeholderTextColor="#94A3B8" testID="adm-t-type" />
            <Label t="Questions" />
            <TextInput style={s.input} value={String(value.questions)} onChangeText={(v) => setF('questions', v)} keyboardType="numeric" testID="adm-t-qs" />
            <Label t="Marks" />
            <TextInput style={s.input} value={String(value.marks)} onChangeText={(v) => setF('marks', v)} keyboardType="numeric" testID="adm-t-marks" />
            <Label t="Duration (minutes)" />
            <TextInput style={s.input} value={String(value.duration_min)} onChangeText={(v) => setF('duration_min', v)} keyboardType="numeric" testID="adm-t-dur" />
            <Pressable onPress={() => setF('is_free', !value.is_free)} style={s.freeToggle} testID="adm-t-free">
              <View style={[s.check, value.is_free && s.checkOn]}>
                {value.is_free && <Ionicons name="checkmark" size={12} color="#FFF" />}
              </View>
              <Text style={s.freeTxt}>Make this a Free test (unlocked without Prime)</Text>
            </Pressable>
          </ScrollView>
          <View style={s.modalActions}>
            <Pressable onPress={onCancel} style={[s.mBtn, s.mBtnGhost]}><Text style={s.mBtnGhostTxt}>Cancel</Text></Pressable>
            <Pressable onPress={onSave} style={[s.mBtn, s.mBtnPrimary]} testID="adm-t-create"><Text style={s.mBtnPrimaryTxt}>Create Test</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function StatCard({ icon, color, val, lbl, wide }: any) {
  return (
    <View style={[s.stat, wide && { flex: 1 }]}>
      <View style={[s.statIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={s.statVal}>{val}</Text>
      <Text style={s.statLbl}>{lbl}</Text>
    </View>
  );
}

function Label({ t }: any) {
  return <Text style={s.label}>{t}</Text>;
}

const s = StyleSheet.create({
  hero: { paddingHorizontal: 12, paddingBottom: 0, paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0 },
  headRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 4 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  title: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.4 },
  sub: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(252,211,77,0.18)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeTxt: { color: '#FCD34D', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.5 },

  tabRow: { flexDirection: 'row', marginTop: 12, gap: 4, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 999, padding: 4, marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: 'center' },
  tabActive: { backgroundColor: '#FFF' },
  tabTxt: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  tabTxtActive: { color: '#0F172A' },

  gate: { flex: 1, backgroundColor: '#F8FAFC' },
  gateBack: { padding: 16, alignSelf: 'flex-start' },
  gateContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  gateIcon: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  gateTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  gateSub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 8, lineHeight: 20 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  statGrid: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  stat: { flex: 1, backgroundColor: '#FFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#EEF2F7' },
  statIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statVal: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginTop: 8 },
  statLbl: { fontSize: 10.5, color: '#64748B', marginTop: 2, fontWeight: '700' },

  helpCard: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#EFF6FF', borderRadius: 12, marginTop: 4 },
  helpTxt: { flex: 1, fontSize: 12, color: '#1E3A8A', lineHeight: 17, fontWeight: '500' },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1' },
  refreshTxt: { color: '#0F172A', fontSize: 12, fontWeight: '800' },

  toolBar: { paddingVertical: 10, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEF2F7' },
  subChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  subChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  subChipTxt: { fontSize: 11.5, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase' },

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginTop: 10, backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A', paddingVertical: 0 },
  plusBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },

  hint: { fontSize: 11, color: '#94A3B8', fontWeight: '700', marginBottom: 6, marginTop: 4 },
  qCard: { backgroundColor: '#FFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#EEF2F7', marginTop: 8 },
  qMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  qBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  qBadgeTxt: { fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  qMeta: { fontSize: 10.5, color: '#64748B', fontWeight: '700' },
  qText: { fontSize: 12.5, color: '#0F172A', lineHeight: 17, fontWeight: '600', marginTop: 4 },
  qActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actGhost: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#93C5FD' },
  actGhostTxt: { fontSize: 11, fontWeight: '900', color: '#2563EB' },
  readOnlyTxt: { fontSize: 10.5, color: '#94A3B8', fontStyle: 'italic', fontWeight: '600' },

  // Editor
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 10, maxHeight: '92%' },
  sheetHandle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', marginBottom: 12 },
  editorHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  editorTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  label: { fontSize: 11, fontWeight: '800', color: '#64748B', letterSpacing: 0.4, marginTop: 12, marginBottom: 6, textTransform: 'uppercase' },
  input: { backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', padding: 10, fontSize: 13, color: '#0F172A' },

  optRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  optRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  optRadioOn: { borderColor: '#10B981', backgroundColor: '#10B981' },
  optRadioIn: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF' },
  optLetter: { fontSize: 12, fontWeight: '900', color: '#64748B' },
  diffChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  diffChipActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  diffChipTxt: { fontSize: 11.5, fontWeight: '800', color: '#0F172A' },
  freeToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 10, backgroundColor: '#F8FAFC', borderRadius: 10 },
  check: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: '#10B981', borderColor: '#10B981' },
  freeTxt: { fontSize: 12, color: '#0F172A', fontWeight: '700', flex: 1 },

  modalActions: { flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  mBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  mBtnGhost: { borderWidth: 1, borderColor: '#E2E8F0' },
  mBtnGhostTxt: { color: '#0F172A', fontSize: 13, fontWeight: '800' },
  mBtnPrimary: { backgroundColor: '#2563EB' },
  mBtnPrimaryTxt: { color: '#FFF', fontSize: 13, fontWeight: '900' },
});
