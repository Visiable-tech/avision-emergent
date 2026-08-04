import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { theme } from '@/src/theme';
import { useI18n } from '@/src/i18n';
import { api } from '@/src/api';

export default function TabsLayout() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  // Send student_app heartbeat every 60s so Super Admin System Status shows "connected"
  useEffect(() => {
    const send = () => { api.heartbeat('student_app', '1.0.0').catch(() => {}); };
    send();
    const t = setInterval(send, 60_000);
    return () => clearInterval(t);
  }, []);

  // Minimum visible bottom padding so labels sit above system nav bar even on
  // devices that report bottom inset = 0 (e.g. some emulators / older Android).
  const BOTTOM_INSET = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 16);
  const BAR_CORE_HEIGHT = 60; // icon + label
  const BAR_HEIGHT = BAR_CORE_HEIGHT + BOTTOM_INSET;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: theme.colors.brand,
        tabBarInactiveTintColor: theme.colors.mutedLight,
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '700',
          marginBottom: 0,
        },
        tabBarItemStyle: {
          paddingTop: 6,
        },
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: BAR_HEIGHT,
          paddingTop: 8,
          paddingBottom: BOTTOM_INSET,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: 'rgba(11,77,184,0.10)',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          backgroundColor: '#FFFFFF',
          // Material shadow
          ...Platform.select({
            ios: {
              shadowColor: '#0B4DB8',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.08,
              shadowRadius: 12,
            },
            android: {
              elevation: 12,
            },
            default: {},
          }),
        },
        tabBarIcon: ({ color, focused }) => {
          if (route.name === 'index') {
            return <Ionicons name={focused ? 'home' : 'home-outline'} size={focused ? 26 : 24} color={color} />;
          }
          if (route.name === 'courses') {
            return <MaterialCommunityIcons name={focused ? 'play-box-multiple' : 'play-box-multiple-outline'} size={focused ? 26 : 24} color={color} />;
          }
          if (route.name === 'tests') {
            return <MaterialCommunityIcons name={focused ? 'crown' : 'crown-outline'} size={focused ? 26 : 24} color={color} />;
          }
          if (route.name === 'live-class') {
            return <MaterialCommunityIcons name={focused ? 'video-wireless' : 'video-wireless-outline'} size={focused ? 26 : 24} color={color} />;
          }
          if (route.name === 'profile') {
            return <Ionicons name={focused ? 'person' : 'person-outline'} size={focused ? 26 : 24} color={color} />;
          }
          return <Ionicons name="ellipse-outline" size={24} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: t('home'), tabBarButtonTestID: 'tab-home' }} />
      <Tabs.Screen name="courses" options={{ title: t('videoCourse'), tabBarButtonTestID: 'tab-courses' }} />
      <Tabs.Screen name="tests" options={{ title: 'Test Prime', tabBarButtonTestID: 'tab-test-prime' }} />
      <Tabs.Screen name="live-class" options={{ title: t('liveClass'), tabBarButtonTestID: 'tab-live-class' }} />
      <Tabs.Screen name="profile" options={{ title: t('profile'), tabBarButtonTestID: 'tab-profile' }} />
      {/* Kept but hidden – reachable via deep links */}
      <Tabs.Screen name="current-affairs" options={{ href: null }} />
    </Tabs>
  );
}
