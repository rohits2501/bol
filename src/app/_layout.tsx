import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F4EFE6' } }} />;
}
