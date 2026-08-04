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
  KeyboardAvoidingView,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';
import { useAuth } from '@/src/AuthContext';
import { connectClassroom, ClassroomWs, WsEvent } from '@/src/classroomWs';

type ChatMsg = {
  id: string;
  user_id: string;
  user_name: string;
  message: string;
  ts: string;
};

export default function LiveClassroom() {
  const { sid } = useLocalSearchParams<{ sid: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'chat' | 'poll' | 'hands'>('chat');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [msg, setMsg] = useState('');
  const [wsState, setWsState] = useState<'connecting' | 'open' | 'closed'>('connecting');
  const [online, setOnline] = useState(0);
  const [handRaised, setHandRaised] = useState(false);
  const [handList, setHandList] = useState<any[]>([]);
  const [poll, setPoll] = useState<any>(null);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  const [isInstructor, setIsInstructor] = useState(false);
  const wsRef = useRef<ClassroomWs | null>(null);
  const chatRef = useRef<ScrollView>(null);

  // Load session + chat history + hand raises + role
  const load = useCallback(async () => {
    if (!sid) return;
    setLoading(true);
    try {
      const s = await api.lcSession(sid);
      setSession(s);
      setHandRaised(!!s.hand_raised);
      setOnline(s.participants_online || 0);
      setPoll(s.active_poll || null);
      if (s.active_poll && user) {
        const voters = s.active_poll.voters || {};
        setMyVote(voters[user.user_id] || null);
      }
      const history = await api.lcChat(sid, 100);
      setMessages(history.messages || []);
      const hr = await api.lcHandRaises(sid);
      setHandList(hr.hand_raises || []);
      try {
        const me = await api.lcMyRole();
        setIsInstructor(!!me.is_instructor);
      } catch { /* ignore */ }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [sid, user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // WebSocket lifecycle
  useEffect(() => {
    if (!sid || !session) return;
    let cancel = false;
    (async () => {
      const ws = await connectClassroom(sid, {
        onOpen: () => !cancel && setWsState('open'),
        onClose: () => !cancel && setWsState('closed'),
        onEvent: (e: WsEvent) => {
          if (cancel) return;
          switch (e.type) {
            case 'welcome':
            case 'presence':
              setOnline((e as any).online || 0);
              break;
            case 'chat':
              setMessages((prev) => [...prev, e as any]);
              setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 50);
              break;
            case 'hand_raise': {
              const hr = e as any;
              setHandList((prev) => {
                const filtered = prev.filter((h) => h.user_id !== hr.user_id);
                return hr.active ? [{ user_id: hr.user_id, user_name: hr.user_name, updated_at: hr.ts }, ...filtered] : filtered;
              });
              break;
            }
            case 'poll_new':
              setPoll((e as any).poll);
              setMyVote(null);
              setTab('poll');
              break;
            case 'poll_update':
              setPoll((e as any).poll);
              break;
            case 'poll_close':
              setPoll((prev: any) => (prev ? { ...(e as any).poll } : prev));
              break;
          }
        },
      });
      if (!cancel) wsRef.current = ws;
    })();
    return () => {
      cancel = true;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [sid, session?.session_id]);  // eslint-disable-line react-hooks/exhaustive-deps

  const sendChat = useCallback(() => {
    const m = msg.trim();
    if (!m || !wsRef.current?.isOpen()) return;
    wsRef.current.send({ type: 'chat', message: m });
    setMsg('');
  }, [msg]);

  const toggleHand = useCallback(async () => {
    try {
      const r = await api.lcToggleHandRaise(sid!);
      setHandRaised(!!r.hand_raised);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed');
    }
  }, [sid]);

  const votePoll = useCallback(async (option_id: string) => {
    if (!poll || myVote) return;
    setMyVote(option_id);
    try {
      const upd = await api.lcVotePoll(poll.id, option_id);
      setPoll(upd);
    } catch (e: any) {
      setMyVote(null);
      Alert.alert('Vote failed', e?.message || 'Please try again.');
    }
  }, [poll, myVote]);

  const isLive = session?.status === 'live';

  if (loading || !session) {
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Video player */}
        <View style={s.player}>
          {videoOn && session.video_url ? (
            Platform.OS === 'web' ? (
              <View style={StyleSheet.absoluteFillObject}>
                {/* @ts-ignore */}
                <iframe
                  src={`${session.video_url}?autoplay=1&rel=0`}
                  width="100%"
                  height="100%"
                  frameBorder={0}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  style={{ border: 0 }}
                />
              </View>
            ) : (
              <WebView
                source={{ uri: `${session.video_url}?autoplay=1&rel=0` }}
                style={{ flex: 1, backgroundColor: '#000' }}
                allowsFullscreenVideo
                javaScriptEnabled
              />
            )
          ) : (
            <>
              <Image source={{ uri: session.banner_image }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
              <LinearGradient colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFillObject} />
              <Pressable style={s.playBig} onPress={() => setVideoOn(true)} testID="cls-play">
                <Ionicons name={isLive ? 'radio' : 'play'} size={32} color={theme.colors.brand} />
              </Pressable>
            </>
          )}

          {/* Top bar */}
          <SafeAreaView edges={['top']} style={s.topBar}>
            <Pressable style={s.iconBtn} onPress={() => router.back()} hitSlop={10} testID="cls-back">
              <Ionicons name="chevron-back" size={22} color="#FFF" />
            </Pressable>
            {isLive ? (
              <View style={s.liveBadge}>
                <View style={s.pulse} />
                <Text style={s.liveTxt}>LIVE</Text>
              </View>
            ) : (
              <View style={s.statusChip}>
                <Text style={s.statusTxt}>{session.status?.toUpperCase()}</Text>
              </View>
            )}
            <View style={s.onlineChip}>
              <Ionicons name="people" size={11} color="#FFF" />
              <Text style={s.onlineTxt}>{online} online</Text>
            </View>
            <View style={{ flex: 1 }} />
            <View style={[s.wsDot, wsState === 'open' ? { backgroundColor: '#10B981' } : wsState === 'closed' ? { backgroundColor: '#EF4444' } : { backgroundColor: '#F59E0B' }]} />
          </SafeAreaView>

          {/* Bottom overlay */}
          <View style={s.videoBottom}>
            <Text style={s.videoTitle} numberOfLines={1}>{session.subject} • {session.topic}</Text>
            <Text style={s.videoFac} numberOfLines={1}>{session.faculty_name}</Text>
          </View>
        </View>

        {/* Action bar */}
        <View style={s.actionsBar}>
          <ActionBtn
            icon={handRaised ? 'hand-left' : 'hand-left-outline'}
            label={handRaised ? 'Lowered' : 'Raise Hand'}
            active={handRaised}
            onPress={toggleHand}
            testID="cls-hand"
          />
          {isInstructor ? (
            <ActionBtn
              icon="stats-chart-outline"
              label="New Poll"
              onPress={() => setCreatingPoll(true)}
              testID="cls-newpoll"
            />
          ) : (
            <ActionBtn
              icon="megaphone-outline"
              label="Ask Doubt"
              onPress={() => router.push('/ai-doubt')}
              testID="cls-doubt"
            />
          )}
          <ActionBtn icon="document-text-outline" label="Notes" onPress={() => {}} testID="cls-notes" />
          <ActionBtn icon="bookmark-outline" label="Save" onPress={() => {}} testID="cls-save" />
        </View>

        {/* Tabs */}
        <View style={s.tabs}>
          <TabBtn
            active={tab === 'chat'}
            onPress={() => setTab('chat')}
            icon="chatbubbles"
            label="Chat"
            count={messages.length}
            testID="tab-chat"
          />
          <TabBtn
            active={tab === 'poll'}
            onPress={() => setTab('poll')}
            icon="stats-chart"
            label="Poll"
            count={poll?.total_votes}
            testID="tab-poll"
          />
          <TabBtn
            active={tab === 'hands'}
            onPress={() => setTab('hands')}
            icon="hand-left"
            label="Hands"
            count={handList.length}
            testID="tab-hands"
          />
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>
          {tab === 'chat' && (
            <ChatPane
              chatRef={chatRef}
              messages={messages}
              currentUserId={user?.user_id}
              msg={msg}
              setMsg={setMsg}
              onSend={sendChat}
              canSend={wsState === 'open'}
            />
          )}
          {tab === 'poll' && (
            <PollPane
              poll={poll}
              myVote={myVote}
              onVote={votePoll}
              onCreate={() => setCreatingPoll(true)}
              canCreate={isInstructor}
            />
          )}
          {tab === 'hands' && <HandsPane hands={handList} />}
        </View>

        <PollComposeModal
          visible={creatingPoll}
          onClose={() => setCreatingPoll(false)}
          onSubmit={async (q, opts) => {
            try {
              await api.lcCreatePoll(sid!, q, opts);
              setCreatingPoll(false);
              setTab('poll');
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Poll failed');
            }
          }}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

/* ---------- Sub-components ---------- */

function ActionBtn({ icon, label, onPress, active, testID }: any) {
  return (
    <Pressable
      style={[s.actionBtn, active && s.actionBtnActive]}
      onPress={onPress}
      testID={testID}
    >
      <Ionicons name={icon} size={18} color={active ? '#FFF' : theme.colors.brand} />
      <Text style={[s.actionLbl, active && { color: '#FFF' }]}>{label}</Text>
    </Pressable>
  );
}

function TabBtn({ active, onPress, icon, label, count, testID }: any) {
  return (
    <Pressable style={[s.tab, active && s.tabActive]} onPress={onPress} testID={testID}>
      <Ionicons name={icon} size={14} color={active ? theme.colors.brand : theme.colors.muted} />
      <Text style={[s.tabTxt, active && s.tabTxtActive]}>{label}</Text>
      {typeof count === 'number' && count > 0 ? (
        <View style={s.tabCount}>
          <Text style={s.tabCountTxt}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function ChatPane({ chatRef, messages, currentUserId, msg, setMsg, onSend, canSend }: any) {
  useEffect(() => {
    setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 60);
  }, [messages.length, chatRef]);
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={chatRef}
        contentContainerStyle={{ padding: 12, paddingBottom: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="chatbubbles-outline" size={40} color={theme.colors.mutedLight} />
            <Text style={s.emptyTxt}>Be the first to say hi 👋</Text>
          </View>
        ) : (
          messages.map((m: ChatMsg) => (
            <ChatRow key={m.id} m={m} isMe={m.user_id === currentUserId} />
          ))
        )}
      </ScrollView>
      <SafeAreaView edges={['bottom']} style={s.inputBar}>
        <TextInput
          testID="chat-input"
          style={s.input}
          placeholder={canSend ? 'Type a message…' : 'Connecting…'}
          placeholderTextColor={theme.colors.mutedLight}
          value={msg}
          editable={canSend}
          onChangeText={setMsg}
          onSubmitEditing={onSend}
          returnKeyType="send"
        />
        <Pressable
          style={[s.sendBtn, (!msg.trim() || !canSend) && { opacity: 0.4 }]}
          disabled={!msg.trim() || !canSend}
          onPress={onSend}
          testID="chat-send"
        >
          <Ionicons name="send" size={16} color="#FFF" />
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function ChatRow({ m, isMe }: { m: ChatMsg; isMe: boolean }) {
  const time = new Date(m.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return (
    <View style={[s.chatRow, isMe && { flexDirection: 'row-reverse' }]}>
      <View style={[s.chatAv, isMe && { backgroundColor: theme.colors.gold }]}>
        <Text style={s.chatAvTxt}>{(m.user_name || '?')[0]}</Text>
      </View>
      <View style={[s.chatBubble, isMe && s.chatBubbleMine]}>
        {!isMe ? <Text style={s.chatUser}>{m.user_name}</Text> : null}
        <Text style={[s.chatMsg, isMe && { color: '#FFF' }]}>{m.message}</Text>
        <Text style={[s.chatTime, isMe && { color: 'rgba(255,255,255,0.7)' }]}>{time}</Text>
      </View>
    </View>
  );
}

function PollPane({ poll, myVote, onVote, onCreate, canCreate }: any) {
  if (!poll) {
    return (
      <View style={s.empty}>
        <Ionicons name="stats-chart-outline" size={40} color={theme.colors.mutedLight} />
        <Text style={s.emptyTxt}>No active poll</Text>
        <Text style={s.emptySub}>
          {canCreate ? 'Launch a poll for your students.' : 'Instructor will launch a poll shortly.'}
        </Text>
        {canCreate ? (
          <Pressable style={s.newPollBtn} onPress={onCreate} testID="poll-launch">
            <Ionicons name="add" size={14} color="#FFF" />
            <Text style={s.newPollTxt}>Launch a Poll</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }
  const total = poll.total_votes || poll.options.reduce((a: number, o: any) => a + o.votes, 0);
  return (
    <ScrollView contentContainerStyle={{ padding: 14 }}>
      <View style={s.pollHead}>
        <View style={s.pollLbl}>
          <Text style={s.pollLblTxt}>POLL</Text>
        </View>
        <Text style={s.pollTotal}>{total} vote{total === 1 ? '' : 's'}</Text>
      </View>
      <Text style={s.pollQ}>{poll.question}</Text>
      <View style={{ marginTop: 12, gap: 10 }}>
        {poll.options.map((o: any) => {
          const pct = total > 0 ? Math.round((o.votes / total) * 100) : 0;
          const mine = myVote === o.id;
          const disabled = !!myVote || poll.status !== 'open';
          return (
            <Pressable
              key={o.id}
              onPress={() => !disabled && onVote(o.id)}
              style={[s.pollOpt, mine && s.pollOptMine, disabled && !mine && { opacity: 0.85 }]}
              disabled={disabled}
              testID={`poll-opt-${o.id}`}
            >
              <View style={[s.pollFill, { width: `${pct}%` }, mine && { backgroundColor: theme.colors.brand + '33' }]} />
              <View style={s.pollOptHead}>
                <View style={[s.pollRadio, mine && { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand }]}>
                  {mine ? <Ionicons name="checkmark" size={12} color="#FFF" /> : null}
                </View>
                <Text style={[s.pollOptTxt, mine && { color: theme.colors.brand, fontWeight: '900' }]}>{o.text}</Text>
                <Text style={s.pollPct}>{pct}%</Text>
              </View>
              <Text style={s.pollVotes}>{o.votes} vote{o.votes === 1 ? '' : 's'}</Text>
            </Pressable>
          );
        })}
      </View>
      {poll.status === 'closed' ? (
        <View style={s.pollClosed}>
          <Ionicons name="lock-closed" size={12} color={theme.colors.muted} />
          <Text style={s.pollClosedTxt}>Poll closed</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function HandsPane({ hands }: { hands: any[] }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 14 }}>
      {hands.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="hand-left-outline" size={40} color={theme.colors.mutedLight} />
          <Text style={s.emptyTxt}>No hands raised</Text>
          <Text style={s.emptySub}>Students who raise their hand appear here.</Text>
        </View>
      ) : (
        hands.map((h) => (
          <View key={h.user_id} style={s.handRow}>
            <View style={s.handAv}>
              <Text style={s.handAvTxt}>{(h.user_name || '?')[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.handName}>{h.user_name}</Text>
              <Text style={s.handTime}>
                {new Date(h.updated_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <Ionicons name="hand-left" size={18} color={theme.colors.warning} />
          </View>
        ))
      )}
    </ScrollView>
  );
}

function PollComposeModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (q: string, opts: string[]) => void;
}) {
  const [q, setQ] = useState('');
  const [opts, setOpts] = useState<string[]>(['', '']);

  useEffect(() => {
    if (!visible) {
      setQ('');
      setOpts(['', '']);
    }
  }, [visible]);

  const canSubmit = q.trim().length > 3 && opts.filter((o) => o.trim().length > 0).length >= 2;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalBg}>
        <View style={s.modal}>
          <View style={s.modalHead}>
            <Text style={s.modalTitle}>Launch a Poll</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={theme.colors.onSurface} />
            </Pressable>
          </View>
          <TextInput
            testID="poll-q"
            style={s.modalInput}
            placeholder="Poll question"
            placeholderTextColor={theme.colors.mutedLight}
            value={q}
            onChangeText={setQ}
          />
          {opts.map((o, i) => (
            <View key={i} style={s.modalOptRow}>
              <TextInput
                testID={`poll-opt-input-${i}`}
                style={[s.modalInput, { flex: 1 }]}
                placeholder={`Option ${i + 1}`}
                placeholderTextColor={theme.colors.mutedLight}
                value={o}
                onChangeText={(v) => {
                  const c = [...opts];
                  c[i] = v;
                  setOpts(c);
                }}
              />
              {opts.length > 2 && (
                <Pressable onPress={() => setOpts(opts.filter((_, j) => j !== i))} style={s.modalOptRemove}>
                  <Ionicons name="close" size={16} color={theme.colors.error} />
                </Pressable>
              )}
            </View>
          ))}
          {opts.length < 5 && (
            <Pressable onPress={() => setOpts([...opts, ''])} style={s.modalAddOpt} testID="poll-add-opt">
              <Ionicons name="add" size={14} color={theme.colors.brand} />
              <Text style={s.modalAddOptTxt}>Add option</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => canSubmit && onSubmit(q.trim(), opts.map((o) => o.trim()).filter(Boolean))}
            disabled={!canSubmit}
            style={[s.modalSubmit, !canSubmit && { opacity: 0.5 }]}
            testID="poll-submit"
          >
            <Ionicons name="megaphone" size={16} color="#FFF" />
            <Text style={s.modalSubmitTxt}>Launch Poll</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surfaceSecondary },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface },

  player: { height: 240, backgroundColor: '#111', overflow: 'hidden' },
  playBig: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -32,
    marginTop: -32,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  liveTxt: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  statusChip: { backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusTxt: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  onlineChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  onlineTxt: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  wsDot: { width: 8, height: 8, borderRadius: 4 },
  videoBottom: { position: 'absolute', bottom: 12, left: 12, right: 12 },
  videoTitle: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  videoFac: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600', marginTop: 2 },

  actionsBar: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 10, backgroundColor: theme.colors.brandTertiary },
  actionBtnActive: { backgroundColor: theme.colors.brand },
  actionLbl: { fontSize: 11, fontWeight: '800', color: theme.colors.brand },

  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 10, backgroundColor: theme.colors.surfaceSecondary },
  tabActive: { backgroundColor: theme.colors.brandTertiary },
  tabTxt: { fontSize: 12, fontWeight: '800', color: theme.colors.muted },
  tabTxtActive: { color: theme.colors.brand },
  tabCount: { backgroundColor: theme.colors.brand, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  tabCountTxt: { color: '#FFF', fontSize: 10, fontWeight: '900' },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50, gap: 6 },
  emptyTxt: { fontSize: 14, fontWeight: '800', color: theme.colors.onSurface, marginTop: 10 },
  emptySub: { fontSize: 12, color: theme.colors.muted },
  newPollBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: theme.colors.brand, marginTop: 12 },
  newPollTxt: { color: '#FFF', fontWeight: '900', fontSize: 12 },

  // Chat
  chatRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 10 },
  chatAv: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center' },
  chatAvTxt: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  chatBubble: { maxWidth: '78%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  chatBubbleMine: { backgroundColor: theme.colors.brand, borderColor: theme.colors.brand },
  chatUser: { fontSize: 11, fontWeight: '900', color: theme.colors.brand },
  chatMsg: { fontSize: 13, color: theme.colors.onSurface, marginTop: 3, lineHeight: 18 },
  chatTime: { fontSize: 10, color: theme.colors.mutedLight, marginTop: 3, alignSelf: 'flex-end' },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border },
  input: { flex: 1, height: 42, borderRadius: 21, backgroundColor: theme.colors.surfaceSecondary, paddingHorizontal: 14, fontSize: 13, color: theme.colors.onSurface },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center' },

  // Poll
  pollHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pollLbl: { backgroundColor: theme.colors.brand, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pollLblTxt: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  pollTotal: { fontSize: 12, fontWeight: '800', color: theme.colors.muted },
  pollQ: { fontSize: 16, fontWeight: '900', color: theme.colors.onSurface, marginTop: 10, lineHeight: 22 },
  pollOpt: { position: 'relative', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, backgroundColor: theme.colors.surfaceSecondary, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
  pollOptMine: { borderColor: theme.colors.brand, backgroundColor: theme.colors.brandTertiary },
  pollFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: theme.colors.brand + '18' },
  pollOptHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pollRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: theme.colors.mutedLight, alignItems: 'center', justifyContent: 'center' },
  pollOptTxt: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.colors.onSurface },
  pollPct: { fontSize: 13, fontWeight: '900', color: theme.colors.brand },
  pollVotes: { fontSize: 11, color: theme.colors.muted, fontWeight: '700', marginLeft: 32, marginTop: 4 },
  pollClosed: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, alignSelf: 'center' },
  pollClosedTxt: { fontSize: 11, color: theme.colors.muted, fontWeight: '700' },

  // Hands
  handRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 8 },
  handAv: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.colors.warning, alignItems: 'center', justifyContent: 'center' },
  handAvTxt: { color: '#FFF', fontWeight: '900', fontSize: 13 },
  handName: { fontSize: 13, fontWeight: '900', color: theme.colors.onSurface },
  handTime: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '700', marginTop: 2 },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { backgroundColor: theme.colors.surface, padding: 18, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '900', color: theme.colors.onSurface },
  modalInput: { backgroundColor: theme.colors.surfaceSecondary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10, fontSize: 13.5, color: theme.colors.onSurface, borderWidth: 1, borderColor: theme.colors.border },
  modalOptRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  modalOptRemove: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  modalAddOpt: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.colors.brandTertiary, marginBottom: 14 },
  modalAddOptTxt: { color: theme.colors.brand, fontSize: 12, fontWeight: '800' },
  modalSubmit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: theme.colors.brand },
  modalSubmitTxt: { color: '#FFF', fontSize: 14, fontWeight: '900' },
});
