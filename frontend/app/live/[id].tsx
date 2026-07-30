import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '@/src/theme';
import { api } from '@/src/api';

const INITIAL_CHAT = [
  { u: 'Priya', m: 'Sir, please explain question 12 again 🙏' },
  { u: 'Rahul', m: 'The audio is crystal clear today, great!' },
  { u: 'Anjali', m: 'Doubt: Is DA included in CTC?' },
];

export default function Live() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [live, setLive] = useState<any>(null);
  const [chat, setChat] = useState(INITIAL_CHAT);
  const [msg, setMsg] = useState('');
  const [handRaised, setHandRaised] = useState(false);

  useEffect(() => { api.liveClasses().then((r) => setLive(r.classes.find((c: any) => c.id === id))); }, [id]);
  if (!live) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={s.playerWrap}>
        <Image source={{ uri: live.thumbnail }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView edges={['top']} style={s.playerHead}>
          <Pressable testID="live-back" style={s.iconBtn} onPress={() => router.back()}><Ionicons name="chevron-back" size={22} color="#FFF" /></Pressable>
          {live.status === 'live' && (
            <View style={s.liveTag}><View style={s.liveDot} /><Text style={s.liveTagTxt}>LIVE • {live.students} watching</Text></View>
          )}
          <Pressable style={s.iconBtn} testID="live-share"><Ionicons name="share-outline" size={20} color="#FFF" /></Pressable>
        </SafeAreaView>
        <View style={s.playCenter}><View style={s.playBtn}><Ionicons name="play" size={30} color={theme.colors.brand} /></View></View>
        <View style={s.instructorTag}>
          <View style={s.instAvatar}><Text style={s.instAv}>{live.instructor[0]}</Text></View>
          <View>
            <Text style={s.instName}>{live.instructor}</Text>
            <Text style={s.instTime}>{live.time}</Text>
          </View>
        </View>
      </View>

      <View style={s.bottom}>
        <Text style={s.title}>{live.title}</Text>
        <View style={s.actions}>
          {[
            { id: 'hand', icon: (handRaised ? 'hand-left' : 'hand-left-outline') as any, label: 'Raise', on: () => setHandRaised(!handRaised), active: handRaised },
            { id: 'poll', icon: 'stats-chart-outline' as any, label: 'Polls' },
            { id: 'notes', icon: 'document-outline' as any, label: 'Notes' },
            { id: 'bookmark', icon: 'bookmark-outline' as any, label: 'Save' },
          ].map((a) => (
            <Pressable key={a.id} testID={`live-action-${a.id}`} style={[s.action, a.active && s.actionActive]} onPress={a.on}>
              <Ionicons name={a.icon} size={18} color={a.active ? '#FFF' : theme.colors.brand} />
              <Text style={[s.actionTxt, a.active && { color: '#FFF' }]}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={s.chatSection}>
          <Text style={s.chatTitle}>Live Chat</Text>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView style={s.chatList} contentContainerStyle={{ paddingVertical: 8 }}>
              {chat.map((c, i) => (
                <View key={i} style={s.chatRow}>
                  <View style={s.chatAv}><Text style={s.chatAvT}>{c.u[0]}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.chatUser}>{c.u}</Text>
                    <Text style={s.chatMsg}>{c.m}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={s.chatInputBar}>
              <TextInput
                testID="live-chat-input"
                style={s.chatInput}
                placeholder="Type a message..."
                placeholderTextColor={theme.colors.mutedLight}
                value={msg}
                onChangeText={setMsg}
              />
              <Pressable
                testID="live-chat-send"
                style={[s.chatSend, !msg.trim() && { opacity: 0.4 }]}
                disabled={!msg.trim()}
                onPress={() => { setChat([...chat, { u: 'You', m: msg.trim() }]); setMsg(''); }}
              >
                <Ionicons name="send" size={16} color="#FFF" />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  playerWrap: { height: 260, backgroundColor: '#111' },
  playerHead: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingTop: 4 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  liveTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.live, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  liveTagTxt: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  playCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  playBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center' },
  instructorTag: { position: 'absolute', bottom: 14, left: 16, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  instAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.gold, alignItems: 'center', justifyContent: 'center' },
  instAv: { color: '#FFF', fontWeight: '800' },
  instName: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  instTime: { color: 'rgba(255,255,255,0.75)', fontSize: 10 },
  bottom: { flex: 1, backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -18, paddingTop: 16, paddingHorizontal: 16 },
  title: { fontSize: 17, fontWeight: '800', color: theme.colors.onSurface },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  action: { flex: 1, flexDirection: 'column', alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 14, backgroundColor: theme.colors.brandTertiary },
  actionActive: { backgroundColor: theme.colors.brand },
  actionTxt: { fontSize: 11, fontWeight: '700', color: theme.colors.brand },
  chatSection: { flex: 1, marginTop: 16 },
  chatTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.onSurface, marginBottom: 8 },
  chatList: { flex: 1 },
  chatRow: { flexDirection: 'row', gap: 8, paddingVertical: 8 },
  chatAv: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center' },
  chatAvT: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  chatUser: { fontSize: 12, fontWeight: '800', color: theme.colors.brand },
  chatMsg: { fontSize: 13, color: theme.colors.onSurface, marginTop: 2 },
  chatInputBar: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 20 : 10 },
  chatInput: { flex: 1, height: 42, borderRadius: 21, backgroundColor: theme.colors.surfaceSecondary, paddingHorizontal: 14, fontSize: 13, color: theme.colors.onSurface },
  chatSend: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center' },
});
