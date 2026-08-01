import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { theme } from '@/src/theme';
import { useI18n } from '@/src/i18n';

export default function TabsLayout() {
  const { t } = useI18n();
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.brand,
        tabBarInactiveTintColor: theme.colors.mutedLight,
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '700',
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
          height: Platform.OS === 'ios' ? 84 : 68,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 8,
        },
        tabBarBackground: () => (
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill}>
            <View style={styles.tabBg} />
          </BlurView>
        ),
        tabBarIcon: ({ color, focused }) => {
          if (route.name === 'index') {
            return <Ionicons name={focused ? 'home' : 'home-outline'} size={focused ? 26 : 24} color={color} />;
          }
          if (route.name === 'courses') {
            return <MaterialCommunityIcons name={focused ? 'play-box-multiple' : 'play-box-multiple-outline'} size={focused ? 26 : 24} color={color} />;
          }
          if (route.name === 'tests') {
            return <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={focused ? 26 : 24} color={color} />;
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
      <Tabs.Screen name="tests" options={{ title: t('test'), tabBarButtonTestID: 'tab-tests' }} />
      <Tabs.Screen name="live-class" options={{ title: t('liveClass'), tabBarButtonTestID: 'tab-live-class' }} />
      <Tabs.Screen name="profile" options={{ title: t('profile'), tabBarButtonTestID: 'tab-profile' }} />
      {/* Kept but hidden – reachable via deep links */}
      <Tabs.Screen name="current-affairs" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBg: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(11,77,184,0.12)',
  },
});
