import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
          fontSize: 11,
          fontWeight: '600',
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
          const icons: Record<string, any> = {
            index: focused ? 'home' : 'home-outline',
            courses: focused ? 'play-circle' : 'play-circle-outline',
            tests: focused ? 'document-text' : 'document-text-outline',
            'current-affairs': focused ? 'newspaper' : 'newspaper-outline',
            profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name] || 'ellipse-outline'} size={focused ? 26 : 24} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: t('home'), tabBarButtonTestID: 'tab-home' }} />
      <Tabs.Screen name="courses" options={{ title: t('courses'), tabBarButtonTestID: 'tab-courses' }} />
      <Tabs.Screen name="tests" options={{ title: t('tests'), tabBarButtonTestID: 'tab-tests' }} />
      <Tabs.Screen name="current-affairs" options={{ title: t('affairs'), tabBarButtonTestID: 'tab-affairs' }} />
      <Tabs.Screen name="profile" options={{ title: t('profile'), tabBarButtonTestID: 'tab-profile' }} />
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
