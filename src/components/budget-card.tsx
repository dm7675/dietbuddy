import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useDayPlans } from '@/hooks/use-day-plan';
import { usePricing } from '@/hooks/use-pricing';
import { dateKey, shiftDateKey } from '@/lib/dates';
import { formatMoney } from '@/lib/format';
import { MEAL_SLOTS } from '@/lib/meal-generator';
import { chainName, shoppingList } from '@/lib/prices';
import { useAppStore } from '@/store/app-store';
import { Space, useColors } from '@/theme/colors';

import { AppText, Button, Card, ProgressBar } from './ui';

/** Week cost vs budget, with a link to the shopping list (or a prompt to set things up). */
export function BudgetCard() {
  const { t } = useTranslation();
  const c = useColors();
  const language = useAppStore((s) => s.language);
  const { budget, city, configured, pricing } = usePricing();
  const today = dateKey();
  const week = useDayPlans(Array.from({ length: 7 }, (_, i) => shiftDateKey(today, i)));
  const money = (n: number) => formatMoney(n, language);

  if (!configured) {
    return (
      <Card style={{ backgroundColor: c.woodSoft, borderColor: c.woodSoft }}>
        <View style={styles.row}>
          <Ionicons name="cart-outline" size={22} color={c.wood} />
          <AppText variant="heading" style={styles.flex}>
            {t('shop.setupTitle')}
          </AppText>
        </View>
        <AppText variant="caption" color="textSecondary">
          {t('shop.setupText')}
        </AppText>
        <Button title={t('shop.setup')} onPress={() => router.push('/shopping-settings')} icon="location-outline" />
      </Card>
    );
  }

  // What the week's shopping costs at the till (whole packs), not just the grams you eat.
  const weekItems = week.flatMap((d) => MEAL_SLOTS.flatMap((s) => (d.eaten[s] ?? d.meals[s])?.items ?? []));
  const weekCost = shoppingList(weekItems, pricing).reduce((s, l) => s + l.cost, 0);
  const weekBudget = budget ? (budget.mode === 'weekly' ? budget.amount : budget.amount * 7) : null;
  const over = weekBudget !== null ? weekCost - weekBudget : 0;

  return (
    <Card>
      <View style={styles.row}>
        <Ionicons name="wallet-outline" size={20} color={c.wood} />
        <AppText variant="heading" style={styles.flex}>
          {t('shop.weekCost', { cost: money(weekCost) })}
        </AppText>
      </View>
      <AppText variant="caption" color="textSecondary">
        {city} · {pricing.chains.length ? pricing.chains.map(chainName).join(', ') : '—'}
      </AppText>
      {weekBudget !== null ? (
        <>
          <ProgressBar value={weekCost / weekBudget} color={over > 0 ? c.statusVeryLow : c.statusGood} />
          <View style={styles.row}>
            <Ionicons
              name={over > 0 ? 'alert-circle' : 'checkmark-circle'}
              size={16}
              color={over > 0 ? c.statusVeryLow : c.statusGood}
            />
            <AppText variant="caption" style={styles.flex}>
              {over > 0 ? t('shop.overBudget', { cost: money(over) }) : t('shop.withinBudget')}
            </AppText>
            <AppText variant="caption" color="textSecondary">
              {t('shop.budgetLine', { budget: money(weekBudget) })}
            </AppText>
          </View>
        </>
      ) : null}
      <Button title={t('shop.list')} icon="cart-outline" onPress={() => router.push('/shopping')} />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
});
