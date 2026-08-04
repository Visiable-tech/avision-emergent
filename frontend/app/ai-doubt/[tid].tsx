import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  StatusBar as RNStatusBar,
  KeyboardAvoidingView,
  Alert,
  Image as RNImage,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { streamAiDoubt } from '@/src/aiDoubtStream';

type Msg = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  has_image?: boolean;
  image_base64?: string | null;
  ts: string;
  _streaming?: boolean;
};

const SUBJECT_META: Record<string, { label: string; color: string; icon: string }> = {
  quant: { label: 'Quantitative Aptitude', color: '#EF4444', icon: 'calculator' },
  reasoning: { label: 'Reasoning', color: '#7C3AED', icon: 'extension-puzzle' },
  english: { label: 'English', color: '#0B4DB8', icon: 'book' },
  gs: { label: 'General Studies', color: '#059669', icon: 'earth' },
  banking: { label: 'Banking Awareness', color: '#F59E0B', icon: 'briefcase' },
  'current-affairs': { label: 'Current Affairs', color: '#DB2777', icon: 'newspaper' },
  general: { label: 'General', color: theme.colors.brand, icon: 'help-circle' },
};

export default function AiDoubtChat() {
  const { tid } = useLocalSearchParams<{ tid: string }>();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [thread, setThread] = useState<any>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const abortRef = useRef<null | (() => void)>(null);

  const load = useCallback(async () => {
    if (!tid) return;
    try {
      const r = await api.aiThreadDetail(tid);
      setThread(r.thread);
      setMessages(r.messages || []);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 60);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [tid]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const pickImage = async () => {
    try {
      // Ask permission (media library)
      const perm = await ImagePicker.getMediaLibraryPermissionsAsync();
      let status = perm.status;
      let canAsk = perm.canAskAgain;
      if (status !== 'granted' && canAsk) {
        const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
        status = req.status;
        canAsk = req.canAskAgain;
      }
      if (status !== 'granted') {
        Alert.alert('Photos access needed', 'Enable Photos access in Settings to attach a question image.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: true,
        quality: 0.6,
        allowsEditing: false,
      });
      if (res.canceled) return;
      const asset = res.assets?.[0];
      if (asset?.base64) {
        setImageBase64(asset.base64);
        setImageUri(asset.uri);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to pick image');
    }
  };

  const clearImage = () => {
    setImageBase64(null);
    setImageUri(null);
  };

  const send = async () => {
    const text = input.trim();
    if (!text && !imageBase64) return;
    if (sending) return;

    setSending(true);

    const now = new Date().toISOString();
    const userMsg: Msg = {
      id: `local-${Date.now()}-u`,
      role: 'user',
      content: text,
      has_image: !!imageBase64,
      image_base64: imageBase64,
      ts: now,
    };
    const assistantMsg: Msg = {
      id: `local-${Date.now()}-a`,
      role: 'assistant',
      content: '',
      ts: now,
      _streaming: true,
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    const capturedImage = imageBase64;
    clearImage();

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);

    if (Platform.OS === 'web') {
      // Use SSE stream on web
      abortRef.current = await streamAiDoubt(
        tid!,
        text,
        capturedImage,
        (delta) => {
          setMessages((prev) => {
            const c = [...prev];
            const last = c[c.length - 1];
            if (last?._streaming) last.content += delta;
            return c;
          });
          scrollRef.current?.scrollToEnd({ animated: false });
        },
        () => {
          setMessages((prev) => {
            const c = [...prev];
            const last = c[c.length - 1];
            if (last?._streaming) last._streaming = false;
            return c;
          });
          setSending(false);
        },
        (err) => {
          setMessages((prev) => {
            const c = [...prev];
            const last = c[c.length - 1];
            if (last?._streaming) {
              last.content = last.content || `Error: ${err}`;
              last._streaming = false;
            }
            return c;
          });
          setSending(false);
        },
      );
    } else {
      // Native fallback: non-streaming REST call
      try {
        const r = await api.aiSendMessage(tid!, text, capturedImage);
        setMessages((prev) => {
          const c = [...prev];
          const last = c[c.length - 1];
          if (last?._streaming) {
            last.content = r.assistant_message?.content || 'No response.';
            last.id = r.assistant_message?.id || last.id;
            last._streaming = false;
          }
          return c;
        });
      } catch (e: any) {
        setMessages((prev) => {
          const c = [...prev];
          const last = c[c.length - 1];
          if (last?._streaming) {
            last.content = `Error: ${e?.message || 'failed'}`;
            last._streaming = false;
          }
          return c;
        });
      } finally {
        setSending(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      abortRef.current?.();
    };
  }, []);

  const meta = SUBJECT_META[thread?.subject || 'general'] || SUBJECT_META.general;

  if (loading || !thread) {
    return (
      <View style={s.loading}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={theme.colors.brand} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <LinearGradient colors={[meta.color, meta.color + 'CC']} style={s.header}>
          <SafeAreaView edges={['top']}>
            <View style={s.headRow}>
              <Pressable onPress={() => router.back()} style={s.iconBtn} testID="aid-chat-back">
                <Ionicons name="chevron-back" size={22} color="#FFF" />
              </Pressable>
              <View style={s.tutorAv}>
                <MaterialCommunityIcons name="robot-happy" size={20} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.title} numberOfLines={1}>Avision AI Tutor</Text>
                <Text style={s.sub} numberOfLines={1}>
                  {meta.label} • Claude Sonnet 4.6
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  Alert.alert('Delete conversation?', 'This action cannot be undone.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete', style: 'destructive',
                      onPress: async () => {
                        try {
                          await api.aiDeleteThread(tid!);
                          router.back();
                        } catch (e: any) {
                          Alert.alert('Error', e?.message || 'Failed');
                        }
                      },
                    },
                  ])
                }
                style={s.iconBtn}
                hitSlop={10}
                testID="aid-chat-delete"
              >
                <Ionicons name="trash-outline" size={18} color="#FFF" />
              </Pressable>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 12, paddingBottom: 24, gap: 10 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.length === 0 ? (
            <View style={s.emptyChat}>
              <MaterialCommunityIcons name="robot-outline" size={44} color={theme.colors.mutedLight} />
              <Text style={s.emptyTxt}>Ask your first question below</Text>
              <Text style={s.emptySub}>You can also attach a photo of a question.</Text>
            </View>
          ) : (
            messages.map((m) => <ChatMessage key={m.id} m={m} accent={meta.color} />)
          )}
        </ScrollView>

        {imageUri ? (
          <View style={s.attachBar}>
            <RNImage source={{ uri: imageUri }} style={s.attachThumb} />
            <Text style={s.attachTxt} numberOfLines={1}>Photo attached</Text>
            <Pressable onPress={clearImage} hitSlop={10}>
              <Ionicons name="close-circle" size={22} color={theme.colors.error} />
            </Pressable>
          </View>
        ) : null}

        <SafeAreaView edges={['bottom']} style={s.inputBar}>
          <Pressable onPress={pickImage} style={s.attachBtn} disabled={sending} testID="aid-attach">
            <Ionicons name="image" size={18} color={theme.colors.brand} />
          </Pressable>
          <TextInput
            testID="aid-input"
            style={s.input}
            placeholder="Ask your doubt…"
            placeholderTextColor={theme.colors.mutedLight}
            value={input}
            onChangeText={setInput}
            multiline
            editable={!sending}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Pressable
            onPress={send}
            style={[s.sendBtn, (sending || (!input.trim() && !imageBase64)) && { opacity: 0.4 }]}
            disabled={sending || (!input.trim() && !imageBase64)}
            testID="aid-send"
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={16} color="#FFF" />
            )}
          </Pressable>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

function ChatMessage({ m, accent }: { m: Msg; accent: string }) {
  const isMe = m.role === 'user';
  return (
    <View style={[s.row, isMe && { flexDirection: 'row-reverse' }]}>
      <View style={[s.av, isMe ? { backgroundColor: theme.colors.gold } : { backgroundColor: accent }]}>
        {isMe ? (
          <Text style={s.avTxt}>Y</Text>
        ) : (
          <MaterialCommunityIcons name="robot" size={14} color="#FFF" />
        )}
      </View>
      <View style={[s.bubble, isMe ? { backgroundColor: theme.colors.brand } : { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border }]}>
        {m.has_image && m.image_base64 ? (
          <RNImage source={{ uri: `data:image/jpeg;base64,${m.image_base64}` }} style={s.bubbleImg} />
        ) : m.has_image ? (
          <View style={s.imgChip}>
            <Ionicons name="image" size={11} color={isMe ? '#FFF' : theme.colors.muted} />
            <Text style={[s.imgChipTxt, isMe && { color: '#FFF' }]}>Image attached</Text>
          </View>
        ) : null}
        {m.content ? (
          <MarkdownText content={m.content} isMe={isMe} />
        ) : m._streaming ? (
          <ActivityIndicator size="small" color={isMe ? '#FFF' : accent} />
        ) : null}
        {m._streaming && m.content ? (
          <Text style={[s.streamCursor, isMe && { color: '#FFF' }]}>▌</Text>
        ) : null}
      </View>
    </View>
  );
}

/** Lightweight markdown renderer — handles headings (##/###), **bold**, bullets (-), and code (\`code\`) */
function MarkdownText({ content, isMe }: { content: string; isMe: boolean }) {
  const lines = content.split('\n');
  const nodes: any[] = [];
  lines.forEach((line, li) => {
    const trimmed = line.trim();
    if (!trimmed) {
      nodes.push(<View key={`sp-${li}`} style={{ height: 6 }} />);
      return;
    }
    let style: any = [s.body, isMe && { color: '#FFF' }];
    let prefix = '';
    if (trimmed.startsWith('### ')) {
      style = [s.h3, isMe && { color: '#FFF' }];
      line = trimmed.slice(4);
    } else if (trimmed.startsWith('## ')) {
      style = [s.h2, isMe && { color: '#FFF' }];
      line = trimmed.slice(3);
    } else if (trimmed.startsWith('# ')) {
      style = [s.h1, isMe && { color: '#FFF' }];
      line = trimmed.slice(2);
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      prefix = '•  ';
      line = trimmed.slice(2);
    } else if (/^\d+\.\s/.test(trimmed)) {
      const idx = trimmed.split('.')[0];
      prefix = `${idx}.  `;
      line = trimmed.replace(/^\d+\.\s/, '');
    } else if (trimmed.startsWith('> ')) {
      style = [s.quote, isMe && { color: 'rgba(255,255,255,0.9)', borderLeftColor: 'rgba(255,255,255,0.5)' }];
      line = trimmed.slice(2);
    } else if (trimmed.startsWith('---')) {
      nodes.push(<View key={`hr-${li}`} style={[s.hr, isMe && { backgroundColor: 'rgba(255,255,255,0.35)' }]} />);
      return;
    }
    nodes.push(
      <Text key={li} style={style}>
        {prefix}
        {parseInline(line, isMe)}
      </Text>,
    );
  });
  return <View>{nodes}</View>;
}

function parseInline(text: string, isMe: boolean): any[] {
  // Handle **bold** and `code`
  const parts: any[] = [];
  let remaining = text;
  let key = 0;
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(remaining)) !== null) {
    if (m.index > last) parts.push(remaining.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) {
      parts.push(
        <Text key={`b${key++}`} style={{ fontWeight: '900', color: isMe ? '#FFF' : theme.colors.brand }}>
          {tok.slice(2, -2)}
        </Text>,
      );
    } else {
      parts.push(
        <Text
          key={`c${key++}`}
          style={{
            fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }) as string,
            fontSize: 12,
            backgroundColor: isMe ? 'rgba(255,255,255,0.15)' : theme.colors.surfaceSecondary,
            paddingHorizontal: 4,
            borderRadius: 4,
          }}
        >
          {tok.slice(1, -1)}
        </Text>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < remaining.length) parts.push(remaining.slice(last));
  return parts;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surfaceSecondary },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface },
  header: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 0) : 0 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  tutorAv: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.22)' },
  title: { color: '#FFF', fontSize: 15, fontWeight: '900' },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600', marginTop: 2 },

  emptyChat: { alignItems: 'center', paddingVertical: 60 },
  emptyTxt: { fontSize: 14, fontWeight: '800', color: theme.colors.onSurface, marginTop: 12 },
  emptySub: { fontSize: 12, color: theme.colors.muted, marginTop: 4 },

  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  av: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  avTxt: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  bubble: { maxWidth: '82%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  bubbleImg: { width: 220, height: 160, borderRadius: 10, marginBottom: 6, backgroundColor: '#000' },
  imgChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  imgChipTxt: { fontSize: 10, color: theme.colors.muted, fontWeight: '700' },
  streamCursor: { color: theme.colors.brand, fontWeight: '900' },

  h1: { fontSize: 16, fontWeight: '900', color: theme.colors.onSurface, marginVertical: 4 },
  h2: { fontSize: 14.5, fontWeight: '900', color: theme.colors.onSurface, marginVertical: 4 },
  h3: { fontSize: 13.5, fontWeight: '900', color: theme.colors.onSurface, marginVertical: 3 },
  body: { fontSize: 13.5, color: theme.colors.onSurface, lineHeight: 20 },
  quote: { fontSize: 13, color: theme.colors.onSurfaceSecondary, lineHeight: 20, fontStyle: 'italic', paddingLeft: 10, borderLeftWidth: 3, borderLeftColor: theme.colors.brand + '55', marginLeft: 2 },
  hr: { height: 1, backgroundColor: theme.colors.border, marginVertical: 6 },

  attachBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border },
  attachThumb: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#000' },
  attachTxt: { flex: 1, fontSize: 12, color: theme.colors.onSurface, fontWeight: '700' },

  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border },
  attachBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minHeight: 42, maxHeight: 120, borderRadius: 18, backgroundColor: theme.colors.surfaceSecondary, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13.5, color: theme.colors.onSurface },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center' },
});
