import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { CheatCard } from '@/components/cheat-card';
import { DayMeals } from '@/components/day-meals';
import { ExtrasCard } from '@/components/extras-card';
import { AppText, Screen } from '@/components/ui';
import { parseDateKey, useDayPlan } from '@/hooks/use-day-plan';
import { capitalizeFirst, formatLongDate, formatNumber } from '@/lib/format';
import { useAppStore } from '@/store/app-store';
import { Space, useColors } from '@/theme/colors';

export default function DayScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const { date } = useLocalSearchParams<{ date: string }>();
  const language = useAppStore((s) => s.language);
  const day = useDayPlan(date);
  if (!day) return null;

  const title = formatLongDate(parseDateKey(date), language);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/plan'))}
          hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color={c.wood} />
        </Pressable>
        <View style={styles.flex}>
          <AppText variant="title">{capitalizeFirst(title)}</AppText>
          <AppText color="textSecondary">
            {t('week.total')}: {formatNumber(Math.round(day.planned.kcal), language)} /{' '}
            {formatNumber(day.targets.calories, language)} kcal
          </AppText>
        </View>
      </View>
      {day.cheat || day.trim > 0 ? <CheatCard day={day} /> : null}
      <DayMeals date={date} />
      <ExtrasCard date={date} extras={day.extras} />
      {!day.cheat && day.trim === 0 ? <CheatCard day={day} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm },
});
