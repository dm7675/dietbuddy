import { useTranslation } from 'react-i18next';

import { useDayPlan } from '@/hooks/use-day-plan';
import { MEAL_SLOTS } from '@/lib/meal-generator';
import { useDaysStore } from '@/store/app-store';

import { MealCard } from './meal-card';
import { AppText } from './ui';

/** The five meal cards for one day, with swap and eaten actions. */
export function DayMeals({ date }: { date: string }) {
  const { t } = useTranslation();
  const day = useDayPlan(date);
  const swapMeal = useDaysStore((s) => s.swapMeal);
  const setEaten = useDaysStore((s) => s.setEaten);
  if (!day) return null;

  return (
    <>
      {MEAL_SLOTS.map((slot) => {
        const meal = day.meals[slot];
        const eatenMeal = day.eaten[slot];
        return (
          <MealCard
            key={slot}
            slot={slot}
            meal={meal}
            eatenMeal={eatenMeal}
            onSwap={() => swapMeal(date, slot)}
            onToggleEaten={() => setEaten(date, slot, eatenMeal ? null : meal)}
          />
        );
      })}
      <AppText variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
        {t('meals.uncookedNote')}
      </AppText>
    </>
  );
}
