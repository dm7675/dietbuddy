import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { BudgetCard } from '@/components/budget-card';
import { SLOT_ICON } from '@/components/meal-card';
import { AppText, Card, Screen } from '@/components/ui';
import { TAB_BAR_HEIGHT } from '@/components/wood-tab-bar';
import { TEMPLATE_BY_ID } from '@/data/meal-templates';
import { dateKey, useDayPlan } from '@/hooks/use-day-plan';
import { addDays } from '@/lib/nutrition';
import { capitalizeFirst, formatLongDate, formatMoney, formatNumber } from '@/lib/format';
import { MEAL_SLOTS, sumNutrients } from '@/lib/meal-generator';
import { useAppStore } from '@/store/app-store';
import { Space, useColors } from '@/theme/colors';

export default function PlanTab() {
  const { t } = useTranslation();
  const start = new Date();
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  return (
    <Screen bottomInset={TAB_BAR_HEIGHT}>
      <AppText variant="title">{t('week.title')}</AppText>
      <BudgetCard />
      {days.map((d, i) => (
        <DayRow key={dateKey(d)} date={d} index={i} />
      ))}
    </Screen>
  );
}

function DayRow({ date, index }: { date: Date; index: number }) {
  const { t } = useTranslation();
  const c = useColors();
  const language = useAppStore((s) => s.language);
  const key = dateKey(date);
  const day = useDayPlan(key);
  if (!day) return null;

  const title =
    index === 0 ? t('week.today') : index === 1 ? t('week.tomorrow') : capitalizeFirst(formatLongDate(date, language));

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/day/[date]', params: { date: key } })}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <Card>
        <View style={styles.row}>
          <AppText variant="heading" style={styles.flex}>
            {title}
            {day.cheat ? ' 🎉' : ''}
          </AppText>
          <AppText variant="label" color="primaryDark">
            {formatNumber(Math.round(day.planned.kcal), language)} kcal · {formatMoney(day.plannedCost, language)}
          </AppText>
          <Ionicons name="chevron-forward" size={20} color={c.textSecondary} />
        </View>
        {MEAL_SLOTS.map((slot) => {
          const meal = day.eaten[slot] ?? day.meals[slot];
          const items = meal?.items ?? [];
          const name = meal ? TEMPLATE_BY_ID[meal.templateId]?.name[language] : '—';
          return (
            <View key={slot} style={styles.row}>
              <Ionicons name={SLOT_ICON[slot]} size={16} color={c.wood} />
              <AppText variant="caption" style={styles.flex} numberOfLines={1}>
                {name}
              </AppText>
              {day.eaten[slot] ? <Ionicons name="checkmark-circle" size={16} color={c.primary} /> : null}
              <AppText variant="caption" color="textSecondary">
                {Math.round(sumNutrients(items).kcal)}
              </AppText>
            </View>
          );
        })}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
});
