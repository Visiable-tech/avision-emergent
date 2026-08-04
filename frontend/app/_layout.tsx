import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, LogBox, StatusBar, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useIconFonts } from '@/src/hooks/use-icon-fonts';
import { AuthProvider, useAuth } from '@/src/AuthContext';
import { I18nProvider, useI18n } from '@/src/i18n';
import { CategoryProvider, useCategory } from '@/src/CategoryContext';
import { theme } from '@/src/theme';

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

function useProtectedRoute() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === 'auth';
    const inAdminGroup = segments[0] === 'admin';
    if (!user && !inAuthGroup && !inAdminGroup) {
      router.replace('/auth/welcome');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);
}

// Bridge — sync category & language from logged-in user
function AuthBridge({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { setCategoryId } = useCategory();
  const { setLang, lang } = useI18n();

  useEffect(() => {
    if (user?.category_id) setCategoryId(user.category_id, false);
    if (user?.language && user.language !== lang) setLang(user.language as any, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.category_id, user?.language]);

  return <>{children}</>;
}

function RootStack() {
  useProtectedRoute();
  const { loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.brand} size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="exam/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="course/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="ai-tutor" options={{ presentation: 'modal' }} />
      <Stack.Screen name="planner" options={{ presentation: 'modal' }} />
      <Stack.Screen name="quiz" options={{ presentation: 'card' }} />
      <Stack.Screen name="daily-challenge/[subject]" options={{ presentation: 'card' }} />
      <Stack.Screen name="job-alerts" options={{ presentation: 'card' }} />
      <Stack.Screen name="live/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="admin" />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => { if (loaded || error) { SplashScreen.hideAsync(); } }, [loaded, error]);
  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <I18nProvider>
          <CategoryProvider>
            <AuthProvider>
              <AuthBridge>
                <RootStack />
              </AuthBridge>
            </AuthProvider>
          </CategoryProvider>
        </I18nProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
