import { useMemo } from 'react';

import { targetsForDate } from '@/lib/cheat';
import { generateDay, MEAL_SLOTS, sumNutrients, type CostModel, type MealItem } from '@/lib/meal-generator';
import { microGaps, microTargets, microTotals } from '@/lib/micros';
import type { NutritionTargets, Pace, Profile } from '@/lib/nutrition';
import type { FoodPreferences } from '@/lib/preferences';
import { itemsCost, type Pricing } from '@/lib/prices';
import { useAppStore, useDaysStore, type DayLog } from '@/store/app-store';

import { useCurrentPlan } from './use-plan';
import { usePricing } from './use-pricing';

export { dateKey, parseDateKey } from '@/lib/dates';

const EMPTY_DAY: DayLog = { swaps: {}, eaten: {} };

interface Context {
  profile: Profile;
  pace: Pace;
  /** The plan's normal daily targets. */
  base: NutritionTargets;
  tdee: number;
  prefs: FoodPreferences;
  pricing: Pricing;
  money: CostModel;
}

/** Everything about one day: generated meals, what was eaten, totals, costs and gaps. */
function computeDay(date: string, days: Record<string, DayLog>, ctx: Context) {
  const log = days[date] ?? EMPTY_DAY;
  // Cheat days and the days after them have their own targets.
  const { targets, cheat, trim } = targetsForDate(date, days, ctx.profile, ctx.base, ctx.tdee);
  const meals = generateDay(date, targets, ctx.prefs, log.swaps, ctx.money, { cheat });
  const extras = log.extras ?? [];

  // "Planned" = eaten meals as eaten + the rest of the plan + extra foods.
  const plannedItems: MealItem[] = [...extras];
  const eatenItems: MealItem[] = [...extras];
  for (const slot of MEAL_SLOTS) {
    const eaten = log.eaten[slot];
    if (eaten) eatenItems.push(...eaten.items);
    plannedItems.push(...((eaten ?? meals[slot])?.items ?? []));
  }

  const micros = microTargets(ctx.profile);
  const plannedMicros = microTotals(plannedItems);

  return {
    date,
    targets,
    baseTargets: ctx.base,
    cheat,
    /** kcal taken off today to balance a recent cheat day. */
    trim,
    microTargets: micros,
    meals,
    eaten: log.eaten,
    extras,
    hasEaten: eatenItems.length > 0,
    planned: sumNutrients(plannedItems),
    plannedItems,
    plannedCost: itemsCost(plannedItems, ctx.pricing),
    eatenTotals: sumNutrients(eatenItems),
    plannedMicros,
    eatenMicros: microTotals(eatenItems),
    /** Gaps in the full planned day — used for tips. */
    plannedGaps: microGaps(plannedMicros, micros, ctx.prefs),
  };
}

export type DayPlan = ReturnType<typeof computeDay>;

function useContext(): Context | null {
  const current = useCurrentPlan();
  const prefs = useAppStore((s) => s.prefs);
  const pace = useAppStore((s) => s.pace);
  const { pricing, money } = usePricing();
  return useMemo(
    () =>
      current && pace
        ? { profile: current.profile, pace, base: current.targets, tdee: current.tdee, prefs, pricing, money }
        : null,
    [current, pace, prefs, pricing, money],
  );
}

/** One day's plan. */
export function useDayPlan(date: string): DayPlan | null {
  const ctx = useContext();
  const days = useDaysStore((s) => s.days);
  return useMemo(() => (ctx ? computeDay(date, days, ctx) : null), [ctx, date, days]);
}

/** Several days at once (e.g. the week view or the shopping list). */
export function useDayPlans(dates: string[]): DayPlan[] {
  const ctx = useContext();
  const days = useDaysStore((s) => s.days);
  const key = dates.join(',');
  return useMemo(() => (ctx ? key.split(',').map((d) => computeDay(d, days, ctx)) : []), [ctx, days, key]);
}
