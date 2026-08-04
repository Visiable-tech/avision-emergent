import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { theme } from '@/src/theme';

export default function AdminVideoCourses() {
  const router = useRouter();
  useEffect(() => { router.replace('/admin/products?type=video_course'); }, [router]);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={theme.colors.brand} />
    </View>
  );
}
