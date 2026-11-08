import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useColors } from '@/theme/colors';

import type { IconName } from './ui';

const TABS: Record<string, { icon: IconName; iconActive: IconName; label: string }> = {
  index: { icon: 'today-outline', iconActive: 'today', label: 'tabs.today' },
  plan: { icon: 'calendar-outline', iconActive: 'calendar', label: 'tabs.plan' },
  scan: { icon: 'camera', iconActive: 'camera', label: 'tabs.scan' },
  track: { icon: 'stats-chart-outline', iconActive: 'stats-chart', label: 'tabs.track' },
  me: { icon: 'person-outline', iconActive: 'person', label: 'tabs.me' },
};

export const TAB_BAR_HEIGHT = 68;

/** Wooden bottom navigation with a raised receipt-scan button in the middle. */
export function WoodTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const c = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: c.wood, borderTopColor: c.woodDark, paddingBottom: insets.bottom },
      ]}>
      <WoodGrain color={c.woodGrain} />
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const tab = TABS[route.name];
          if (!tab) return null;
          const focused = state.index === index;
          const onPress = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };

          if (route.name === 'scan') {
            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityLabel={t(tab.label)}
                onPress={onPress}
                style={styles.item}>
                <View style={[styles.scanButton, { backgroundColor: c.primary, borderColor: c.woodDark }]}>
                  <Ionicons name="camera" size={30} color={c.textOnPrimary} />
                </View>
              </Pressable>
            );
          }

          const color = focused ? c.woodTextActive : c.woodText;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              onPress={onPress}
              style={styles.item}>
              <Ionicons name={focused ? tab.iconActive : tab.icon} size={24} color={color} />
              <Text numberOfLines={1} style={[styles.label, { color, fontWeight: focused ? '800' : '600' }]}>
                {t(tab.label)}
              </Text>
              <View style={[styles.dot, { backgroundColor: focused ? c.woodTextActive : 'transparent' }]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** A few soft curved lines that read as wood grain. */
function WoodGrain({ color }: { color: string }) {
  return (
    <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 400 100" pointerEvents="none">
      <Path d="M0 18 C 80 10, 140 30, 220 20 S 340 8, 400 22" stroke={color} strokeWidth={2} fill="none" />
      <Path d="M0 42 C 60 52, 160 34, 240 46 S 360 56, 400 40" stroke={color} strokeWidth={1.5} fill="none" />
      <Path d="M0 68 C 90 60, 170 80, 250 66 S 350 60, 400 72" stroke={color} strokeWidth={2} fill="none" />
      <Path d="M0 90 C 70 84, 150 96, 230 88 S 330 82, 400 92" stroke={color} strokeWidth={1.2} fill="none" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: 3, borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'visible' },
  row: { flexDirection: 'row', height: TAB_BAR_HEIGHT, alignItems: 'center', maxWidth: 640, width: '100%', alignSelf: 'center' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { fontSize: 11 },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
  scanButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
});
