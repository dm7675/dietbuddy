// Cheat days: a planned, guilt-free tastier day at maintenance calories,
// gently balanced out over the next few days.

import { shiftDateKey } from './dates';
import { MIN_CALORIES, nutritionTargets, type NutritionTargets, type Pace, type Profile } from './nutrition';

/** How many cheat days each pace allows within a rolling window. */
export const CHEAT_RULES: Record<Pace, { limit: number; windowDays: number }> = {
  fast: { limit: 1, windowDays: 14 },
  moderate: { limit: 1, windowDays: 7 },
  slow: { limit: 2, windowDays: 7 },
  maintain: { limit: 2, windowDays: 7 },
};

/** Days after a cheat day that are trimmed, and the most taken off any one day. */
export const BALANCE_DAYS = 3;
export const MAX_DAILY_TRIM = 150;

export type CheatDays = Record<string, { cheat?: boolean } | undefined>;

const isCheat = (days: CheatDays, date: string) => !!days[date]?.cheat;

/** Calories on a cheat day: up to maintenance (never below the normal plan, e.g. when gaining). */
export function cheatCalories(base: NutritionTargets, tdee: number): number {
  return Math.max(base.calories, tdee);
}

/** Extra calories a cheat day adds over the normal plan. */
export function cheatExtra(base: NutritionTargets, tdee: number): number {
  return cheatCalories(base, tdee) - base.calories;
}

/**
 * Targets for a cheat day: maintenance calories, protein kept at ~85% of normal,
 * more room for fat (tasty food is fattier), carbs fill the rest.
 */
export function cheatTargets(base: NutritionTargets, tdee: number): NutritionTargets {
  const calories = cheatCalories(base, tdee);
  const proteinG = Math.round(base.proteinG * 0.85);
  const fatG = Math.round((calories * 0.35) / 9);
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));
  return { ...base, calories, proteinG, fatG, carbsG };
}

/** Calories taken off this day to balance cheat days in the previous few days. */
export function balanceTrim(date: string, days: CheatDays, base: NutritionTargets, tdee: number): number {
  const extra = cheatExtra(base, tdee);
  if (extra <= 0) return 0;
  let trim = 0;
  for (let k = 1; k <= BALANCE_DAYS; k++) {
    if (isCheat(days, shiftDateKey(date, -k))) trim += Math.min(MAX_DAILY_TRIM, Math.round(extra / BALANCE_DAYS / 10) * 10);
  }
  return trim;
}

export interface DayTargets {
  targets: NutritionTargets;
  cheat: boolean;
  /** kcal removed to balance a recent cheat day (0 if none). */
  trim: number;
}

/** The targets for one specific date, taking cheat days and balancing into account. */
export function targetsForDate(
  date: string,
  days: CheatDays,
  profile: Profile,
  base: NutritionTargets,
  tdee: number,
): DayTargets {
  if (isCheat(days, date)) return { targets: cheatTargets(base, tdee), cheat: true, trim: 0 };
  const wanted = balanceTrim(date, days, base, tdee);
  if (wanted === 0) return { targets: base, cheat: false, trim: 0 };
  // Never go below the safe minimum.
  const calories = Math.max(MIN_CALORIES[profile.gender], base.calories - wanted);
  const trim = base.calories - calories;
  if (trim <= 0) return { targets: base, cheat: false, trim: 0 };
  return { targets: nutritionTargets(profile, calories), cheat: false, trim };
}

export type CheatCheck = { ok: true } | { ok: false; reason: 'limit'; limit: number; windowDays: number };

/** Whether one more cheat day fits the pace's limit around this date. */
export function canCheat(date: string, days: CheatDays, pace: Pace): CheatCheck {
  const { limit, windowDays } = CHEAT_RULES[pace];
  // Check every window of `windowDays` that contains this date.
  for (let start = -(windowDays - 1); start <= 0; start++) {
    let count = 1; // this date
    for (let k = 0; k < windowDays; k++) {
      const d = shiftDateKey(date, start + k);
      if (d !== date && isCheat(days, d)) count++;
    }
    if (count > limit) return { ok: false, reason: 'limit', limit, windowDays };
  }
  return { ok: true };
}
