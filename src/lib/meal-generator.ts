// Builds a day of 3 meals + 2 snacks that fits the user's targets and food preferences.
// Fully deterministic: the same date, targets, preferences and swap count always
// give the same meals, so plans don't need to be stored — only swaps and eaten meals.

import { FOOD_BY_ID, type Food, type Nutrients } from '@/data/foods';
import { MEAL_TEMPLATES, type MealTemplate, type MealType, type PartRole, type TemplatePart } from '@/data/meal-templates';

import type { NutritionTargets } from './nutrition';
import { isFoodAllowed, type FoodPreferences } from './preferences';

export type MealSlot = 'breakfast' | 'snack1' | 'lunch' | 'snack2' | 'dinner';
export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'snack1', 'lunch', 'snack2', 'dinner'];

/** Share of the day's calories and macros for each meal. */
export const SLOT_SHARE: Record<MealSlot, number> = {
  breakfast: 0.25,
  snack1: 0.1,
  lunch: 0.3,
  snack2: 0.1,
  dinner: 0.25,
};

const SLOT_TYPE: Record<MealSlot, MealType> = {
  breakfast: 'breakfast',
  snack1: 'snack',
  lunch: 'main',
  snack2: 'snack',
  dinner: 'main',
};

export interface MealItem {
  foodId: string;
  grams: number;
  role?: PartRole;
  /** Portion cap from the meal template, kept for the day-level balancing. */
  maxG?: number;
}

export interface PlannedMeal {
  slot: MealSlot;
  templateId: string;
  items: MealItem[];
}

export type MealTarget = Pick<Nutrients, 'kcal' | 'protein' | 'carbs' | 'fat'>;

/* ---------- Nutrition math ---------- */

export function itemNutrients(item: MealItem): Nutrients {
  const f = FOOD_BY_ID[item.foodId];
  const k = item.grams / 100;
  if (!f) return { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  return {
    kcal: f.per100.kcal * k,
    protein: f.per100.protein * k,
    carbs: f.per100.carbs * k,
    fat: f.per100.fat * k,
    fiber: f.per100.fiber * k,
  };
}

export function sumNutrients(items: MealItem[]): Nutrients {
  const total = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  for (const it of items) {
    const v = itemNutrients(it);
    total.kcal += v.kcal;
    total.protein += v.protein;
    total.carbs += v.carbs;
    total.fat += v.fat;
    total.fiber += v.fiber;
  }
  return total;
}

export function slotTarget(targets: NutritionTargets, slot: MealSlot): MealTarget {
  const s = SLOT_SHARE[slot];
  return {
    kcal: targets.calories * s,
    protein: targets.proteinG * s,
    carbs: targets.carbsG * s,
    fat: targets.fatG * s,
  };
}

/* ---------- Seeded randomness ---------- */

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: string): () => number {
  let a = hashString(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(arr: T[], rand: () => number): T => arr[Math.floor(rand() * arr.length)];

/* ---------- Portion sizing ---------- */

const WEIGHTS = { kcal: 6, protein: 2, carbs: 1, fat: 1 };

function error(items: MealItem[], target: MealTarget): number {
  const t = sumNutrients(items);
  const rel = (v: number, goal: number) => (goal > 0 ? (v - goal) / goal : 0);
  return (
    WEIGHTS.kcal * rel(t.kcal, target.kcal) ** 2 +
    WEIGHTS.protein * rel(t.protein, target.protein) ** 2 +
    WEIGHTS.carbs * rel(t.carbs, target.carbs) ** 2 +
    WEIGHTS.fat * rel(t.fat, target.fat) ** 2
  );
}

/** Adjusts each portion step by step (within its allowed range) until the meal is as close to target as possible. */
interface Choice {
  food: Food;
  role?: PartRole;
  /** Extra cap from the template part (e.g. yogurt used as a sauce). */
  maxG?: number;
}

function rangeOf(food: Food, maxG?: number) {
  const { min, max, step } = food.portion;
  const cappedMax = maxG ? Math.max(min, Math.min(max, maxG)) : max;
  return { min, max: cappedMax, step };
}

export function fitPortions(choices: Choice[], target: MealTarget): MealItem[] {
  const ranges = choices.map((c) => rangeOf(c.food, c.maxG));
  const items: MealItem[] = choices.map((c, i) => {
    const { min, max, step } = ranges[i];
    const mid = Math.round((min + max) / 2 / step) * step;
    return { foodId: c.food.id, grams: Math.min(max, Math.max(min, mid)), role: c.role, maxG: c.maxG };
  });

  let current = error(items, target);
  for (let iter = 0; iter < 300; iter++) {
    let best: { i: number; grams: number; err: number } | null = null;
    for (let i = 0; i < items.length; i++) {
      const { min, max, step } = ranges[i];
      for (const dir of [-1, 1]) {
        const grams = items[i].grams + dir * step;
        if (grams < min || grams > max) continue;
        const old = items[i].grams;
        items[i].grams = grams;
        const e = error(items, target);
        items[i].grams = old;
        if (e < current - 1e-9 && (!best || e < best.err)) best = { i, grams, err: e };
      }
    }
    if (!best) break;
    items[best.i].grams = best.grams;
    current = best.err;
  }
  return items;
}

/* ---------- Meal & day generation ---------- */

interface Avoid {
  templateIds: string[];
  foodIds: string[];
}

/** Optional money side: € per kg for each food and a daily budget. */
export interface CostModel {
  pricePerKg: (foodId: string) => number;
  /** € per day; null = no budget, prices are only shown. */
  dailyBudget: number | null;
}

function cost(items: MealItem[], model?: CostModel): number {
  if (!model) return 0;
  return items.reduce((s, it) => s + (model.pricePerKg(it.foodId) * it.grams) / 1000, 0);
}

/** Zero while under budget, grows quickly above it. */
function budgetPenalty(spent: number, budget: number | null | undefined): number {
  if (!budget) return 0;
  const over = spent / budget - 1;
  return over > 0 ? 4 * over * over : 0;
}

/** € per 100 kcal — used to lean towards cheaper foods when on a budget. */
function pricePerKcal(foodId: string, model: CostModel): number {
  const kcal = FOOD_BY_ID[foodId]?.per100.kcal || 1;
  return model.pricePerKg(foodId) / kcal;
}

/** Resolves a template against the user's preferences; null if a required part can't be filled. */
function allowedParts(t: MealTemplate, prefs: FoodPreferences): TemplatePart[] | null {
  const out: TemplatePart[] = [];
  for (const part of t.parts) {
    const options = part.options.filter((id) => FOOD_BY_ID[id] && isFoodAllowed(FOOD_BY_ID[id], prefs));
    if (options.length === 0) {
      if (part.optional) continue;
      return null;
    }
    out.push({ ...part, options });
  }
  return out;
}

export function generateMeal(
  slot: MealSlot,
  target: MealTarget,
  prefs: FoodPreferences,
  seed: string,
  avoid: Avoid = { templateIds: [], foodIds: [] },
  money?: CostModel,
  treat = false,
): PlannedMeal | null {
  const rand = rng(seed);
  const type = SLOT_TYPE[slot];

  const usable = MEAL_TEMPLATES.map((t) => ({ t, parts: allowedParts(t, prefs) })).filter(
    (x): x is { t: MealTemplate; parts: TemplatePart[] } =>
      x.t.types.includes(type) && x.parts !== null && !!x.t.treat === treat,
  );
  // No treat fits the user's diet/allergies → fall back to a normal meal.
  if (usable.length === 0) return treat ? generateMeal(slot, target, prefs, seed, avoid, money, false) : null;

  const fresh = usable.filter((x) => !avoid.templateIds.includes(x.t.id));

  // Build one candidate per meal shape, then pick randomly among the ones that fit best.
  const candidates = (fresh.length ? fresh : usable).map(({ t, parts }) => {
    const choices: Choice[] = [];
    for (const part of parts) {
      const notUsed = part.options.filter((id) => !choices.some((c) => c.food.id === id));
      if (notUsed.length === 0) continue;
      const preferred = notUsed.filter((id) => !avoid.foodIds.includes(id));
      const pool = preferred.length ? preferred : notUsed;
      let id = pick(pool, rand);
      // On a tight budget: draw two options and keep the cheaper one (still varied, but thriftier).
      const thrift = money?.dailyBudget ? Math.min(1, Math.max(0, (20 - money.dailyBudget) / 10)) : 0;
      const other = pick(pool, rand);
      if (money && rand() < thrift && pricePerKcal(other, money) < pricePerKcal(id, money)) id = other;
      choices.push({ food: FOOD_BY_ID[id], role: part.role, maxG: part.maxG });
    }
    const items = fitPortions(choices, target);
    // Prefer not repeating today's main protein (e.g. eggs for breakfast and dinner).
    const repeats = choices.some((c) => c.role === 'protein' && avoid.foodIds.includes(c.food.id));
    const mealBudget = money?.dailyBudget ? money.dailyBudget * SLOT_SHARE[slot] : null;
    const err = error(items, target) + (repeats ? 0.5 : 0) + budgetPenalty(cost(items, money), mealBudget);
    return { templateId: t.id, items, err };
  });

  candidates.sort((a, b) => a.err - b.err);
  const goodOnes = candidates.slice(0, Math.max(2, Math.ceil(candidates.length / 2)));
  const chosen = pick(goodOnes, rand);
  return { slot, templateId: chosen.templateId, items: chosen.items };
}

/** Main protein of a meal (used to avoid eating the same thing twice a day). */
function mainFoods(meal: PlannedMeal | null): string[] {
  if (!meal) return [];
  return meal.items.filter((it) => it.role === 'protein').map((it) => it.foodId);
}

export type Swaps = Partial<Record<MealSlot, number>>;

/** On a cheat day these meals become treats; the rest of the day stays normal. */
export const TREAT_SLOTS: MealSlot[] = ['breakfast', 'snack2', 'dinner'];

export interface DayOptions {
  cheat?: boolean;
}

/** Generates the full day. `swaps` counts how many times the user swapped each meal. */
export function generateDay(
  date: string,
  targets: NutritionTargets,
  prefs: FoodPreferences,
  swaps: Swaps = {},
  money?: CostModel,
  options: DayOptions = {},
): Record<MealSlot, PlannedMeal | null> {
  const result = {} as Record<MealSlot, PlannedMeal | null>;
  const usedTemplates: string[] = [];
  const usedFoods: string[] = [];

  for (const slot of MEAL_SLOTS) {
    const target = slotTarget(targets, slot);
    const n = swaps[slot] ?? 0;
    const treat = !!options.cheat && TREAT_SLOTS.includes(slot);
    const avoid: Avoid = { templateIds: [...usedTemplates], foodIds: [...usedFoods] };

    // When swapping, also avoid what the previous version of this meal was.
    if (n > 0) {
      const prev = generateMeal(slot, target, prefs, `${date}|${slot}|${n - 1}`, avoid, money, treat);
      if (prev) {
        avoid.templateIds.push(prev.templateId);
        avoid.foodIds.push(...mainFoods(prev));
      }
    }

    const meal = generateMeal(slot, target, prefs, `${date}|${slot}|${n}`, avoid, money, treat);
    result[slot] = meal;
    if (meal) {
      usedTemplates.push(meal.templateId);
      usedFoods.push(...mainFoods(meal));
    }
  }
  balanceDay(result, targets, money);
  return result;
}

/**
 * Fine-tunes portions across the whole day so the daily total lands on target,
 * while keeping each meal close to its own share.
 */
function balanceDay(meals: Record<MealSlot, PlannedMeal | null>, targets: NutritionTargets, money?: CostModel) {
  const dayTarget: MealTarget = { kcal: targets.calories, protein: targets.proteinG, carbs: targets.carbsG, fat: targets.fatG };
  const slots = MEAL_SLOTS.filter((s) => meals[s]);
  const all = slots.flatMap((s) => meals[s]!.items);
  const ranges = all.map((it) => rangeOf(FOOD_BY_ID[it.foodId], it.maxG));

  const dayError = () =>
    error(all, dayTarget) +
    0.15 * slots.reduce((acc, s) => acc + error(meals[s]!.items, slotTarget(targets, s)), 0) +
    budgetPenalty(cost(all, money), money?.dailyBudget);

  let current = dayError();
  for (let iter = 0; iter < 200; iter++) {
    let best: { i: number; grams: number; err: number } | null = null;
    for (let i = 0; i < all.length; i++) {
      const { min, max, step } = ranges[i];
      for (const dir of [-1, 1]) {
        const grams = all[i].grams + dir * step;
        if (grams < min || grams > max) continue;
        const old = all[i].grams;
        all[i].grams = grams;
        const e = dayError();
        all[i].grams = old;
        if (e < current - 1e-9 && (!best || e < best.err)) best = { i, grams, err: e };
      }
    }
    if (!best) break;
    all[best.i].grams = best.grams;
    current = best.err;
  }
}
