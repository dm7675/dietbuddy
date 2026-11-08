import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { FOOD_BY_ID } from '@/data/foods';
import { TEMPLATE_BY_ID } from '@/data/meal-templates';
import type { Language } from '@/i18n';
import { usePricing } from '@/hooks/use-pricing';
import { formatMoney, formatNumber } from '@/lib/format';
import { itemsCost } from '@/lib/prices';
import { sumNutrients, type MealItem, type MealSlot, type PlannedMeal } from '@/lib/meal-generator';
import { useAppStore } from '@/store/app-store';
import { Space, useColors } from '@/theme/colors';

import { FoodPhotoStack } from './food-photo';
import { AppText, Card, Chip, type IconName } from './ui';

export const SLOT_ICON: Record<MealSlot, IconName> = {
  breakfast: 'cafe-outline',
  snack1: 'nutrition-outline',
  lunch: 'restaurant-outline',
  snack2: 'ice-cream-outline',
  dinner: 'moon-outline',
};

/** "150 g Chicken breast" or "2× Egg (110 g)". */
export function itemLabel(item: MealItem, lang: Language): string {
  if (item.custom) return `${item.grams} g ${item.custom.name}`;
  const food = FOOD_BY_ID[item.foodId];
  if (!food) return `${item.grams} g`;
  const name = food.name[lang];
  if (food.unitG) {
    const count = item.grams / food.unitG;
    const shown = count === 0.5 ? '½' : formatNumber(count, lang, 1);
    return `${shown}× ${name} (${item.grams} g)`;
  }
  return `${item.grams} g ${name}`;
}

export function MealCard({
  slot,
  meal,
  eatenMeal,
  onToggleEaten,
  onSwap,
  onRecipe,
}: {
  slot: MealSlot;
  meal: PlannedMeal | null;
  /** Set when this meal was marked eaten — shows the snapshot instead of the plan. */
  eatenMeal?: PlannedMeal;
  onToggleEaten: () => void;
  onSwap: () => void;
  onRecipe: () => void;
}) {
  const { t } = useTranslation();
  const c = useColors();
  const language = useAppStore((s) => s.language);
  const { pricing } = usePricing();

  const shown = eatenMeal ?? meal;
  const items = shown?.items ?? [];
  const eaten = !!eatenMeal;
  const totals = sumNutrients(items);
  const template = shown ? TEMPLATE_BY_ID[shown.templateId] : undefined;
  const foods = items.map((i) => FOOD_BY_ID[i.foodId]).filter(Boolean);

  return (
    <Card style={[styles.card, eaten && { backgroundColor: c.primarySoft, borderColor: c.primary }]}>
      <View style={styles.header}>
        <Ionicons name={SLOT_ICON[slot]} size={16} color={c.wood} />
        <AppText variant="label" color="wood" style={styles.flex}>
          {t(`today.meals.${slot}`)}
        </AppText>
        <AppText variant="label" color="textSecondary">
          {formatNumber(Math.round(totals.kcal), language)} kcal · {formatMoney(itemsCost(items, pricing), language)}
        </AppText>
      </View>

      {items.length === 0 ? (
        <AppText variant="caption" color="warning">
          {t('meals.noMeal')}
        </AppText>
      ) : (
        <>
          <View style={styles.body}>
            <FoodPhotoStack foods={foods} />
            <View style={styles.flex}>
              {template ? <AppText variant="heading">{template.name[language]}</AppText> : null}
              {template?.treat ? (
                <View style={[styles.badge, { backgroundColor: c.primary }]}>
                  <AppText variant="caption" style={[styles.badgeText, { color: c.textOnPrimary }]}>
                    🍦 {t('cheat.treat')}
                  </AppText>
                </View>
              ) : null}
              {items.map((it) => (
                <AppText key={it.foodId} variant="caption" color="textSecondary">
                  {itemLabel(it, language)}
                </AppText>
              ))}
            </View>
          </View>

          <View style={styles.footer}>
            <AppText variant="caption" color="textSecondary" style={styles.flex}>
              <AppText variant="caption" color="protein">●</AppText> {t('meals.p')} {Math.round(totals.protein)} g{'  '}
              <AppText variant="caption" color="carbs">●</AppText> {t('meals.c')} {Math.round(totals.carbs)} g{'  '}
              <AppText variant="caption" color="fat">●</AppText> {t('meals.f')} {Math.round(totals.fat)} g
            </AppText>
            <Chip label={t('recipe.open')} icon="book-outline" tone="wood" onPress={onRecipe} />
            {!eaten && meal ? <Chip label={t('meals.swap')} icon="swap-horizontal" tone="wood" onPress={onSwap} /> : null}
            <Chip
              label={eaten ? t('meals.eaten') : t('meals.markEaten')}
              icon={eaten ? 'checkmark' : 'ellipse-outline'}
              selected={eaten}
              onPress={onToggleEaten}
            />
          </View>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: Space.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: Space.xs },
  body: { flexDirection: 'row', gap: Space.md, alignItems: 'flex-start' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, flexWrap: 'wrap' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginVertical: 2 },
  badgeText: { fontWeight: '700' },
});
