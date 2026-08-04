import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { theme } from '@/src/theme';

export default function AdminTestPrime() {
  const router = useRouter();
  useEffect(() => { router.replace('/admin/products?type=test_series'); }, [router]);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={theme.colors.brand} />
    </View>
  );
}
