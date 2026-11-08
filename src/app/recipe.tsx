import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { FoodPhoto } from '@/components/food-photo';
import { itemLabel } from '@/components/meal-card';
import { AppText, Button, Card, Notice, Screen } from '@/components/ui';
import { FOOD_BY_ID } from '@/data/foods';
import { TEMPLATE_BY_ID } from '@/data/meal-templates';
import { useDayPlan } from '@/hooks/use-day-plan';
import { dateKey } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { MEAL_SLOTS, sumNutrients, type MealSlot } from '@/lib/meal-generator';
import { makeRecipe, recipeKey, recipesConfigured } from '@/lib/recipes';
import { useAppStore } from '@/store/app-store';
import { Radius, Space, useColors } from '@/theme/colors';

/** Full recipe for one planned (or eaten) meal. Params: date, slot. */
export default function RecipeScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const params = useLocalSearchParams<{ date?: string; slot?: string }>();
  const date = params.date ?? dateKey();
  const slot = (MEAL_SLOTS as string[]).includes(params.slot ?? '') ? (params.slot as MealSlot) : 'lunch';
  const language = useAppStore((s) => s.language);
  const recipes = useAppStore((s) => s.recipes);
  const saveRecipe = useAppStore((s) => s.saveRecipe);
  const day = useDayPlan(date);
  const [state, setState] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });

  const meal = day ? (day.eaten[slot] ?? day.meals[slot]) : null;
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const header = (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={back} hitSlop={12}>
        <Ionicons name="chevron-back" size={28} color={c.wood} />
      </Pressable>
      <AppText variant="title" style={styles.flex}>
        {meal ? (TEMPLATE_BY_ID[meal.templateId]?.name[language] ?? t('recipe.title')) : t('recipe.title')}
      </AppText>
    </View>
  );

  if (!meal) {
    return (
      <Screen>
        {header}
        <AppText color="textSecondary">{t('recipe.notFound')}</AppText>
      </Screen>
    );
  }

  const key = recipeKey(meal.templateId, meal.items, language);
  const recipe = recipes[key];
  const totals = sumNutrients(meal.items);

  const write = async () => {
    setState({ loading: true, error: null });
    try {
      saveRecipe(key, await makeRecipe(meal.templateId, meal.items, language));
      setState({ loading: false, error: null });
    } catch (e) {
      setState({ loading: false, error: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <Screen>
      {header}

      <Card>
        <View style={styles.row}>
          <AppText variant="heading" style={styles.flex}>
            {t('recipe.ingredients')}
          </AppText>
          <AppText variant="label" color="textSecondary">
            {formatNumber(Math.round(totals.kcal), language)} kcal
          </AppText>
        </View>
        <AppText variant="caption" color="textSecondary">
          {t('recipe.forOne')}
        </AppText>
        {meal.items.map((it) => (
          <View key={it.foodId} style={styles.row}>
            {FOOD_BY_ID[it.foodId] ? <FoodPhoto food={FOOD_BY_ID[it.foodId]} size={36} /> : null}
            <AppText style={styles.flex}>{itemLabel(it, language)}</AppText>
          </View>
        ))}
      </Card>

      {!recipesConfigured ? <Notice tone="info" text={t('recipe.notConfigured')} /> : null}
      {state.error ? <Notice text={t('recipe.error', { error: state.error })} /> : null}

      {state.loading ? (
        <Card style={styles.center}>
          <ActivityIndicator size="large" color={c.primary} />
          <AppText variant="heading">{t('recipe.making')}</AppText>
        </Card>
      ) : recipe ? (
        <>
          <Card>
            <View style={styles.row}>
              <AppText variant="heading" style={styles.flex}>
                {recipe.title}
              </AppText>
              <View style={[styles.pill, { backgroundColor: c.woodSoft }]}>
                <Ionicons name="time-outline" size={14} color={c.wood} />
                <AppText variant="caption" color="wood">
                  {t('recipe.minutes', { n: recipe.minutes })}
                </AppText>
              </View>
            </View>
            <AppText variant="label" color="textSecondary">
              {t('recipe.steps')}
            </AppText>
            {recipe.steps.map((step, i) => (
              <View key={i} style={styles.step}>
                <View style={[styles.stepNumber, { backgroundColor: c.primary }]}>
                  <AppText variant="caption" style={{ color: c.textOnPrimary, fontWeight: '800' }}>
                    {i + 1}
                  </AppText>
                </View>
                <AppText style={styles.flex}>{step}</AppText>
              </View>
            ))}
            {recipe.seasoning.length ? (
              <AppText variant="caption" color="textSecondary">
                {t('recipe.seasoning')}: {recipe.seasoning.join(', ')}
              </AppText>
            ) : null}
          </Card>
          {recipe.tip ? (
            <Card style={{ backgroundColor: c.woodSoft, borderColor: c.woodSoft }}>
              <View style={styles.row}>
                <Ionicons name="bulb-outline" size={18} color={c.wood} />
                <AppText variant="label" color="wood">
                  {t('recipe.tip')}
                </AppText>
              </View>
              <AppText variant="caption">{recipe.tip}</AppText>
            </Card>
          ) : null}
          <Button title={t('recipe.again')} variant="ghost" icon="refresh" onPress={write} disabled={!recipesConfigured} />
        </>
      ) : (
        <Button title={t('recipe.make')} icon="restaurant-outline" onPress={write} disabled={!recipesConfigured} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  center: { alignItems: 'center', gap: Space.md, paddingVertical: Space.lg },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
  step: { flexDirection: 'row', gap: Space.sm, alignItems: 'flex-start' },
  stepNumber: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
});
