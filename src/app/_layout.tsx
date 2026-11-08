import '@/i18n';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Celebration } from '@/components/celebration';
import { useCommunitySync } from '@/hooks/use-community-sync';
import { useHydrated } from '@/store/app-store';
import { useUiStore } from '@/store/ui-store';
import { useColors } from '@/theme/colors';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hydrated = useHydrated();
  useCommunitySync();
  const celebrating = useUiStore((s) => s.celebrating);
  const stopCelebrating = useUiStore((s) => s.stopCelebrating);
  const c = useColors();

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync();
  }, [hydrated]);

  // Wait until saved data is loaded so we know whether to show onboarding.
  if (!hydrated) return null;

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="plan-choice" />
        <Stack.Screen name="preferences" />
        <Stack.Screen name="day/[date]" />
        <Stack.Screen name="add-food" options={{ presentation: 'modal' }} />
        <Stack.Screen name="shopping" />
        <Stack.Screen name="shopping-settings" />
      </Stack>
      {celebrating ? <Celebration onDone={stopCelebrating} /> : null}
    </>
  );
}
