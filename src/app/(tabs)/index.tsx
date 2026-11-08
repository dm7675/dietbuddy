import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { CalorieRing } from '@/components/calorie-ring';
import { CheatCard } from '@/components/cheat-card';
import { DayMeals } from '@/components/day-meals';
import { ExtrasCard } from '@/components/extras-card';
import { GapTips } from '@/components/nutrient-panels';
import { AppText, Card, ProgressBar, Screen, type IconName } from '@/components/ui';
import { TAB_BAR_HEIGHT } from '@/components/wood-tab-bar';
import { dateKey, useDayPlan } from '@/hooks/use-day-plan';
import { useCurrentPlan } from '@/hooks/use-plan';
import { capitalizeFirst, formatLongDate, formatMoney, formatNumber } from '@/lib/format';
import { useAppStore } from '@/store/app-store';
import { Space, useColors } from '@/theme/colors';

function greetingKey(hour: number) {
  if (hour < 12) return 'today.morning';
  if (hour < 18) return 'today.afternoon';
  return 'today.evening';
}

export default function Today() {
  const { t } = useTranslation();
  const c = useColors();
  const language = useAppStore((s) => s.language);
  const current = useCurrentPlan();
  const today = dateKey();
  const day = useDayPlan(today);
  if (!current || !day) return null;

  const { profile } = current;
  const targets = day.targets; // today's targets (cheat day / balancing aware)
  const now = new Date();
  const eaten = day.eatenTotals;
  const fmt = (n: number) => formatNumber(Math.round(n), language);

  return (
    <Screen bottomInset={TAB_BAR_HEIGHT}>
      <View>
        <AppText variant="title">
          {t(greetingKey(now.getHours()))}
          {profile.name ? `, ${profile.name}` : ''}
        </AppText>
        <AppText color="textSecondary">{capitalizeFirst(formatLongDate(now, language))}</AppText>
      </View>

      {day.cheat || day.trim > 0 ? <CheatCard day={day} /> : null}

      <Card style={styles.summary}>
        <CalorieRing
          eaten={eaten.kcal}
          target={targets.calories}
          label={fmt(eaten.kcal)}
          sublabel={t('today.of', { kcal: fmt(targets.calories) })}
        />
        <View style={styles.macros}>
          <Macro label={t('today.protein')} value={eaten.protein} target={targets.proteinG} color={c.protein} />
          <Macro label={t('today.carbs')} value={eaten.carbs} target={targets.carbsG} color={c.carbs} />
          <Macro label={t('today.fat')} value={eaten.fat} target={targets.fatG} color={c.fat} />
        </View>
        <View style={[styles.extras, { borderTopColor: c.border }]}>
          <Extra icon="leaf-outline" label={t('today.fiber')} value={`${Math.round(eaten.fiber)}/${targets.fiberG} g`} />
          <Extra
            icon="water-outline"
            label={t('today.water')}
            value={`${formatNumber(targets.waterMl / 1000, language, 1)} L`}
          />
        </View>
        <AppText variant="caption" color="textSecondary" style={styles.centerText}>
          {t('meals.planned', { kcal: fmt(day.planned.kcal) })} · {t('shop.todayCost', { cost: formatMoney(day.plannedCost, language) })}
        </AppText>
      </Card>

      <GapTips gaps={day.plannedGaps.slice(0, 1)} compact />

      <DayMeals date={today} />
      <ExtrasCard date={today} extras={day.extras} />
      {!day.cheat && day.trim === 0 ? <CheatCard day={day} /> : null}
    </Screen>
  );
}

function Macro({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  return (
    <View style={styles.macro}>
      <View style={styles.macroLabel}>
        <AppText variant="label">{label}</AppText>
        <AppText variant="caption" color="textSecondary">
          {Math.round(value)}/{target} g
        </AppText>
      </View>
      <ProgressBar value={target ? value / target : 0} color={color} />
    </View>
  );
}

function Extra({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const c = useColors();
  return (
    <View style={styles.extra}>
      <Ionicons name={icon} size={18} color={c.primaryDark} />
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
      <AppText variant="label">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  centerText: { textAlign: 'center' },
  summary: { gap: Space.md, paddingVertical: Space.lg },
  macros: { gap: Space.sm },
  macro: { gap: 4 },
  macroLabel: { flexDirection: 'row', justifyContent: 'space-between' },
  extras: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, paddingTop: Space.md },
  extra: { flexDirection: 'row', alignItems: 'center', gap: Space.xs },
});
