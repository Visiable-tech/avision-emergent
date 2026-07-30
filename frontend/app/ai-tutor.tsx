import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';

const SESSION_ID = 'avision-tutor-v1';

const QUICK_PROMPTS = [
  'Which exam suits me?',
  'Explain Percentages simply',
  'How to crack SSC CGL?',
  'Best strategy for UPSC Prelims',
];

type Msg = { role: 'user' | 'assistant'; content: string };

export default function AITutor() {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    api.aiHistory(SESSION_ID).then((r) => {
      if (r?.messages?.length) {
        setMessages(r.messages.map((m: any) => ({ role: m.role, content: m.content })));
      }
    }).catch(() => {});
  }, []);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setInput('');
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      const res: any = await api.aiChat(SESSION_ID, msg, 'tutor');
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I could not connect right now. Please try again.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <SafeAreaView edges={['top']} style={s.head}>
        <LinearGradient colors={[theme.colors.brand, theme.colors.brandDark]} style={StyleSheet.absoluteFill} />
        <View style={s.headRow}>
          <Pressable testID="close-tutor" style={s.iconBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={22} color="#FFF" />
          </Pressable>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={s.title}>AI Tutor</Text>
            <Text style={s.subtitle}>Powered by Claude Sonnet 4.5</Text>
          </View>
          <Pressable
            testID="reset-tutor"
            style={s.iconBtn}
            onPress={async () => { await api.aiReset(SESSION_ID); setMessages([]); }}
          >
            <Ionicons name="refresh" size={18} color="#FFF" />
          </Pressable>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 && (
            <View style={s.welcome}>
              <View style={s.welcomeIcon}>
                <Ionicons name="sparkles" size={28} color={theme.colors.brand} />
              </View>
              <Text style={s.welcomeTitle}>Hi! I'm your AI Tutor</Text>
              <Text style={s.welcomeSub}>Ask me anything about competitive exams, doubts, strategy, or which exam suits you best.</Text>
              <View style={s.prompts}>
                {QUICK_PROMPTS.map((p) => (
                  <Pressable key={p} testID={`prompt-${p}`} style={s.prompt} onPress={() => send(p)}>
                    <Ionicons name="flash-outline" size={13} color={theme.colors.brand} />
                    <Text style={s.promptTxt}>{p}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
          {messages.map((m, i) => (
            <View key={i} style={[s.bubbleWrap, m.role === 'user' ? s.bubbleRight : s.bubbleLeft]}>
              {m.role === 'assistant' && (
                <View style={s.aiBadge}>
                  <Ionicons name="sparkles" size={12} color="#FFF" />
                </View>
              )}
              <View style={[s.bubble, m.role === 'user' ? s.bubbleUser : s.bubbleAI]}>
                <Text style={[s.bubbleTxt, m.role === 'user' && { color: '#FFF' }]}>{m.content}</Text>
              </View>
            </View>
          ))}
          {loading && (
            <View style={s.bubbleLeft}>
              <View style={s.aiBadge}><Ionicons name="sparkles" size={12} color="#FFF" /></View>
              <View style={[s.bubble, s.bubbleAI]}>
                <ActivityIndicator size="small" color={theme.colors.brand} />
              </View>
            </View>
          )}
        </ScrollView>

        <View style={s.inputBar}>
          <TextInput
            testID="tutor-input"
            style={s.input}
            placeholder="Ask a doubt or type a question..."
            placeholderTextColor={theme.colors.mutedLight}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={800}
          />
          <Pressable testID="tutor-send" style={[s.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]} disabled={!input.trim() || loading} onPress={() => send()}>
            <Ionicons name="arrow-up" size={20} color="#FFF" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  head: { paddingBottom: 12 },
  headRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 4 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 1 },
  welcome: { alignItems: 'center', paddingTop: 40 },
  welcomeIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  welcomeTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.onSurface },
  welcomeSub: { fontSize: 13, color: theme.colors.muted, textAlign: 'center', marginTop: 6, paddingHorizontal: 20, lineHeight: 19 },
  prompts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 24, justifyContent: 'center' },
  prompt: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: theme.colors.brandTertiary, borderWidth: 1, borderColor: 'rgba(11,77,184,0.15)' },
  promptTxt: { fontSize: 12, color: theme.colors.brand, fontWeight: '600' },
  bubbleWrap: { marginBottom: 12, flexDirection: 'row', gap: 6 },
  bubbleLeft: { alignItems: 'flex-start', flexDirection: 'row' },
  bubbleRight: { justifyContent: 'flex-end' },
  aiBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleUser: { backgroundColor: theme.colors.brand, borderBottomRightRadius: 4 },
  bubbleAI: { backgroundColor: theme.colors.surfaceSecondary, borderBottomLeftRadius: 4 },
  bubbleTxt: { fontSize: 14, lineHeight: 20, color: theme.colors.onSurface },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border, backgroundColor: '#FFF' },
  input: { flex: 1, maxHeight: 100, minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: theme.colors.surfaceSecondary, borderRadius: 22, fontSize: 14, color: theme.colors.onSurface },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center' },
});
