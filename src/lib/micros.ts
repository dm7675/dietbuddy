// Vitamin & mineral totals, daily targets and "what to eat more of" suggestions.

import { FOODS, FOOD_BY_ID } from '@/data/foods';
import { MICROS, microsFor, type Micro } from '@/data/micronutrients';

import type { MealItem } from './meal-generator';
import type { Profile } from './nutrition';
import { isFoodAllowed, type FoodPreferences } from './preferences';

export type DisplayMicro = Exclude<Micro, 'sodium'>;
export const DISPLAY_MICROS = MICROS as DisplayMicro[];

export const MICRO_UNIT: Record<DisplayMicro, string> = {
  vitaminA: 'µg',
  vitaminC: 'mg',
  vitaminD: 'µg',
  vitaminB12: 'µg',
  folate: 'µg',
  iron: 'mg',
  calcium: 'mg',
  magnesium: 'mg',
  potassium: 'mg',
  zinc: 'mg',
};

/**
 * Daily recommended amounts (US Dietary Reference Intakes, RDA or AI),
 * by sex and age. Teens 14–18 have their own values.
 */
export function microTargets(p: Pick<Profile, 'gender' | 'age'>): Record<DisplayMicro, number> {
  const male = p.gender === 'male';
  const teen = p.age < 19;
  const age = p.age;
  return {
    vitaminA: male ? 900 : 700,
    vitaminC: male ? (teen ? 75 : 90) : teen ? 65 : 75,
    vitaminD: age > 70 ? 20 : 15,
    vitaminB12: 2.4,
    folate: 400,
    iron: male ? (teen ? 11 : 8) : teen ? 15 : age <= 50 ? 18 : 8,
    calcium: teen ? 1300 : male ? (age > 70 ? 1200 : 1000) : age > 50 ? 1200 : 1000,
    magnesium: male ? (teen ? 410 : age <= 30 ? 400 : 420) : teen ? 360 : age <= 30 ? 310 : 320,
    potassium: male ? (teen ? 3000 : 3400) : teen ? 2300 : 2600,
    zinc: male ? 11 : teen ? 9 : 8,
  };
}

export function microTotals(items: MealItem[]): Record<DisplayMicro, number> {
  const total = Object.fromEntries(DISPLAY_MICROS.map((m) => [m, 0])) as Record<DisplayMicro, number>;
  for (const it of items) {
    const m = microsFor(it.foodId);
    for (const k of DISPLAY_MICROS) total[k] += (m[k] * it.grams) / 100;
  }
  return total;
}

export type MicroStatus = 'good' | 'low' | 'veryLow';

export function microStatus(pct: number): MicroStatus {
  if (pct >= 0.9) return 'good';
  if (pct >= 0.5) return 'low';
  return 'veryLow';
}

/** Foods (allowed for this user) that give the most of a nutrient in a normal portion. */
export function bestSources(micro: DisplayMicro, prefs: FoodPreferences, count = 3): string[] {
  return FOODS.filter((f) => f.category !== 'other' && f.category !== 'treat' && isFoodAllowed(f, prefs))
    .map((f) => {
      const portion = (f.portion.min + f.portion.max) / 2;
      return { id: f.id, amount: (microsFor(f.id)[micro] * portion) / 100 };
    })
    .filter((x) => x.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, count)
    .map((x) => x.id);
}

export interface MicroGap {
  micro: DisplayMicro;
  pct: number;
  foods: string[];
}

/** The nutrients furthest below target (under 70%), with food suggestions. */
export function microGaps(
  totals: Record<DisplayMicro, number>,
  targets: Record<DisplayMicro, number>,
  prefs: FoodPreferences,
  max = 2,
): MicroGap[] {
  return DISPLAY_MICROS.map((m) => ({ micro: m, pct: targets[m] ? totals[m] / targets[m] : 1 }))
    .filter((g) => g.pct < 0.7)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, max)
    .map((g) => ({ ...g, foods: bestSources(g.micro, prefs) }));
}

export function foodName(id: string, lang: 'en' | 'hr'): string {
  return FOOD_BY_ID[id]?.name[lang] ?? id;
}
