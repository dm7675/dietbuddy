import { Redirect, Tabs } from 'expo-router';

import { WoodTabBar } from '@/components/wood-tab-bar';
import { useAppStore } from '@/store/app-store';

export default function TabsLayout() {
  const profile = useAppStore((s) => s.profile);
  const pace = useAppStore((s) => s.pace);

  // First launch: ask the questions, then pick a pace.
  if (!profile) return <Redirect href="/onboarding" />;
  if (!pace) return <Redirect href="/plan-choice" />;

  return (
    <Tabs tabBar={(props) => <WoodTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="plan" />
      <Tabs.Screen name="scan" />
      <Tabs.Screen name="track" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
