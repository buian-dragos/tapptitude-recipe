import { useEffect } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';

export default function Index() {
  useEffect(() => {
    // Redirect to login screen on mount
    router.replace('/login' as any);
  }, []);

  return <View />;
}
