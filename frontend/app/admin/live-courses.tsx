import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { theme } from '@/src/theme';

// Live Courses admin = Products filtered by type=live_course
export default function AdminLiveCourses() {
  const router = useRouter();
  useEffect(() => { router.replace('/admin/products?type=live_course'); }, [router]);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={theme.colors.brand} />
    </View>
  );
}
