import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/src/AuthContext';
import { api } from '@/src/api';
import { theme } from '@/src/theme';

const NAV: any[] = [
  { path: '/admin', label: 'Dashboard', icon: 'grid' },

  { section: 'Identity' },
  { path: '/admin/students', label: 'Students', icon: 'people' },
  { path: '/admin/centres', label: 'Centres (legacy)', icon: 'business' },
  { path: '/admin/centres-v2', label: 'Centre Management', icon: 'storefront' },
  { path: '/admin/franchise', label: 'Franchise Master', icon: 'business-outline' },

  { section: 'Academic' },
  { path: '/admin/exam-categories', label: 'Exam Categories', icon: 'trophy' },
  { path: '/admin/exams', label: 'Exams', icon: 'ribbon' },
  { path: '/admin/subjects', label: 'Subjects', icon: 'book' },
  { path: '/admin/chapters', label: 'Chapters', icon: 'list' },
  { path: '/admin/lessons', label: 'Lessons', icon: 'play-circle' },

  { section: 'Catalog' },
  { path: '/admin/products', label: 'Products', icon: 'cube' },
  { path: '/admin/live-courses', label: 'Live Courses', icon: 'radio' },
  { path: '/admin/video-courses', label: 'Video Courses', icon: 'videocam' },
  { path: '/admin/test-prime', label: 'Test Prime', icon: 'clipboard' },
  { path: '/admin/faculty', label: 'Faculty Master', icon: 'school' },

  { section: 'Learning Content' },
  { path: '/admin/question-bank', label: 'Question Bank', icon: 'help-circle' },
  { path: '/admin/study-material', label: 'Study Material', icon: 'document-text' },
  { path: '/admin/current-affairs', label: 'Current Affairs', icon: 'newspaper' },
  { path: '/admin/digital-notes', label: 'Digital Notes', icon: 'reader' },
  { path: '/admin/previous-papers', label: 'Previous Papers', icon: 'file-tray-full' },

  { section: 'Commerce' },
  { path: '/admin/orders', label: 'Orders', icon: 'receipt' },
  { path: '/admin/payments', label: 'Payments', icon: 'card' },
  { path: '/admin/coupons', label: 'Coupons', icon: 'pricetag' },
  { path: '/admin/entitlements', label: 'Entitlements', icon: 'shield-checkmark' },
  { path: '/admin/enroll', label: 'Manual Enroll', icon: 'add-circle' },

  { section: 'Content & CMS' },
  { path: '/admin/banners', label: 'Home Banners', icon: 'image' },
  { path: '/admin/promo-banners', label: 'Promo Banners', icon: 'megaphone' },
  { path: '/admin/notifications', label: 'Notifications', icon: 'notifications' },
  { path: '/admin/testimonials', label: 'Testimonials', icon: 'star' },
  { path: '/admin/results', label: 'Results', icon: 'medal' },
  { path: '/admin/faqs', label: 'FAQs', icon: 'help-buoy' },
  { path: '/admin/cms/website', label: 'Website CMS', icon: 'globe' },
  { path: '/admin/cms/app', label: 'App CMS', icon: 'phone-portrait' },

  { section: 'Analytics & Ops' },
  { path: '/admin/reports', label: 'Reports & Analytics', icon: 'stats-chart' },
  { path: '/admin/settings/status', label: 'System Status', icon: 'pulse' },
  { path: '/admin/settings/database', label: 'Database', icon: 'server' },
  { path: '/admin/settings/integration', label: 'Integration Test', icon: 'flash' },
];

export default function AdminLayout() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  const isAdmin = Array.isArray(user?.roles) && user!.roles.includes('admin');
  const path = '/' + segments.join('/');
  const isLoginRoute = path === '/admin/login' || path.startsWith('/admin/login');

  // Send super_admin heartbeat every 60s
  useEffect(() => {
    if (Platform.OS !== 'web' || !isAdmin) return;
    const send = () => { api.heartbeat('super_admin', '1.0.0').catch(() => {}); };
    send();
    const t = setInterval(send, 60_000);
    return () => clearInterval(t);
  }, [isAdmin]);

  useEffect(() => {
    if (loading) return;
    if (Platform.OS !== 'web') return;
    if (!user && !isLoginRoute) {
      router.replace('/admin/login');
      return;
    }
    if (user && !isAdmin && !isLoginRoute) {
      router.replace('/admin/login');
    }
  }, [user, loading, isAdmin, isLoginRoute, router]);

  // Native — show gate
  if (Platform.OS !== 'web') {
    return (
      <View style={s.nativeGate}>
        <Ionicons name="desktop" size={40} color={theme.colors.mutedLight} />
        <Text style={s.nativeGateTxt}>Admin panel is available only on the web.</Text>
        <Text style={s.nativeGateSub}>Please open the app in your desktop browser.</Text>
        <Pressable onPress={() => router.replace('/(tabs)')} style={s.backHome}>
          <Text style={s.backHomeTxt}>Back to app</Text>
        </Pressable>
      </View>
    );
  }

  // Login route — full-screen, no chrome
  if (isLoginRoute) {
    return <Slot />;
  }

  // Not admin yet — show a light loader (redirect useEffect will handle)
  if (!user || !isAdmin) {
    return (
      <View style={s.loadingWrap}>
        <Text style={s.loadingTxt}>Checking admin access…</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.sidebar}>
        <View style={s.brand}>
          <View style={s.brandBadge}><Text style={s.brandBadgeTxt}>AV</Text></View>
          <View>
            <Text style={s.brandTitle}>AVISION ONE</Text>
            <Text style={s.brandSub}>Super Admin</Text>
          </View>
        </View>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {NAV.map((n: any, i: number) => {
            if (n.section) {
              return <Text key={`sec-${i}`} style={s.section}>{n.section}</Text>;
            }
            const active = path === n.path || (n.path !== '/admin' && path.startsWith(n.path));
            return (
              <Pressable
                key={n.path}
                onPress={() => router.push(n.path as any)}
                style={[s.navItem, active && s.navItemActive]}
              >
                <Ionicons name={n.icon as any} size={16} color={active ? '#FFF' : theme.colors.onSurfaceTertiary} />
                <Text style={[s.navTxt, active && { color: '#FFF' }]} numberOfLines={1}>{n.label}</Text>
                {n.soon ? <View style={s.soonPill}><Text style={s.soonPillTxt}>soon</Text></View> : null}
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={s.userBox}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{(user.name || 'A').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.userName} numberOfLines={1}>{user.name || 'Admin'}</Text>
            <Text style={s.userMeta} numberOfLines={1}>{user.email}</Text>
          </View>
          <Pressable onPress={() => { signOut(); router.replace('/admin/login'); }} hitSlop={8}>
            <Ionicons name="log-out-outline" size={18} color={theme.colors.muted} />
          </Pressable>
        </View>
      </View>
      <View style={s.main}>
        <Slot />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: theme.colors.surfaceSecondary },
  sidebar: {
    width: 240,
    backgroundColor: theme.colors.surface,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, marginBottom: 12 },
  brandBadge: { width: 38, height: 38, borderRadius: 10, backgroundColor: theme.colors.brand, alignItems: 'center', justifyContent: 'center' },
  brandBadgeTxt: { color: '#FFF', fontWeight: '900', letterSpacing: 1, fontSize: 13 },
  brandTitle: { fontSize: 13, fontWeight: '900', color: theme.colors.onSurface, letterSpacing: 0.5 },
  brandSub: { fontSize: 10.5, color: theme.colors.muted, fontWeight: '700', marginTop: 2 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, marginBottom: 1 },
  navItemActive: { backgroundColor: theme.colors.brand },
  navTxt: { flex: 1, fontSize: 12.5, fontWeight: '700', color: theme.colors.onSurfaceTertiary },
  section: { fontSize: 9.5, fontWeight: '900', color: theme.colors.mutedLight, letterSpacing: 1, textTransform: 'uppercase', marginTop: 12, marginBottom: 4, paddingHorizontal: 10 },
  soonPill: { backgroundColor: theme.colors.surfaceSecondary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  soonPillTxt: { fontSize: 8.5, fontWeight: '900', color: theme.colors.mutedLight, letterSpacing: 0.5 },
  userBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderTopWidth: 1, borderTopColor: theme.colors.divider, marginTop: 8, paddingTop: 12 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.colors.brandTertiary, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { color: theme.colors.brand, fontWeight: '900', fontSize: 13 },
  userName: { fontSize: 12, fontWeight: '900', color: theme.colors.onSurface },
  userMeta: { fontSize: 10, color: theme.colors.muted, marginTop: 1, fontWeight: '600' },
  main: { flex: 1 },

  nativeGate: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: theme.colors.surface, gap: 10 },
  nativeGateTxt: { fontSize: 15, fontWeight: '900', color: theme.colors.onSurface, textAlign: 'center', marginTop: 8 },
  nativeGateSub: { fontSize: 12.5, color: theme.colors.muted, fontWeight: '700', textAlign: 'center' },
  backHome: { marginTop: 12, backgroundColor: theme.colors.brand, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  backHomeTxt: { color: '#FFF', fontWeight: '900', fontSize: 13 },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface },
  loadingTxt: { color: theme.colors.muted, fontWeight: '700', fontSize: 13 },
});
