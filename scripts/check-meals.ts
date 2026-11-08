// Sanity check for the meal generator: run with `npm run check:meals`.
// Generates 30 days for several profiles/diets and fails if a day misses its
// calorie target by more than 10% or breaks an allergy/diet/dislike rule.
import { FOOD_BY_ID } from '@/data/foods';
import { TEMPLATE_BY_ID } from '@/data/meal-templates';
import { cheatTargets } from '@/lib/cheat';
import { generateDay, MEAL_SLOTS, sumNutrients, TREAT_SLOTS } from '@/lib/meal-generator';
import { buildPlanOptions, nutritionTargets, tdee, type Profile } from '@/lib/nutrition';
import { DEFAULT_PREFERENCES, isFoodAllowed, type FoodPreferences } from '@/lib/preferences';

const man: Profile = { name: '', gender: 'male', age: 28, heightCm: 182, weightKg: 95, goalWeightKg: 82, activity: 'moderate' };
const woman: Profile = { name: '', gender: 'female', age: 45, heightCm: 158, weightKg: 64, goalWeightKg: 56, activity: 'sedentary' };
const gainer: Profile = { name: '', gender: 'male', age: 20, heightCm: 178, weightKg: 62, goalWeightKg: 70, activity: 'active' };

const cases: [string, Profile, FoodPreferences][] = [
  ['man, no rules', man, DEFAULT_PREFERENCES],
  ['woman 1200 kcal', woman, DEFAULT_PREFERENCES],
  ['gainer', gainer, DEFAULT_PREFERENCES],
  ['vegan + gluten-free', man, { diet: 'vegan', allergies: ['gluten'], dislikes: [] }],
  ['vegetarian, no nuts', woman, { diet: 'vegetarian', allergies: ['treeNuts', 'peanuts'], dislikes: [] }],
  ['lactose + eggs + dislikes', woman, { diet: 'none', allergies: ['milk', 'eggs'], dislikes: ['tuna', 'broccoli', 'oats'] }],
];

const MAX_DEVIATION = 0.1;
let failures = 0;

for (const [label, profile, prefs] of cases) {
  const plan = buildPlanOptions(profile).find((o) => o.pace === 'moderate')!;
  const targets = nutritionTargets(profile, plan.calories);
  let worst = 0;
  let missing = 0;
  for (let d = 0; d < 30; d++) {
    const date = new Date(2026, 10, 8 + d).toISOString().slice(0, 10);
    const day = generateDay(date, targets, prefs, d % 3 === 0 ? { lunch: 1, snack2: 2 } : {});
    const items = MEAL_SLOTS.flatMap((s) => day[s]?.items ?? []);
    missing += MEAL_SLOTS.filter((s) => !day[s]).length;
    const dev = Math.abs(sumNutrients(items).kcal - targets.calories) / targets.calories;
    worst = Math.max(worst, dev);
    for (const it of items) {
      if (!isFoodAllowed(FOOD_BY_ID[it.foodId], prefs)) {
        console.log(`  FAIL ${label} ${date}: ${it.foodId} is not allowed`);
        failures++;
      }
    }
  }
  const ok = worst <= MAX_DEVIATION && missing === 0;
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(26)} worst day ${(worst * 100).toFixed(1)}% off target, missing meals: ${missing}`);

  // Cheat days: maintenance calories, treats in the treat slots (when the diet allows), rules respected.
  const cheat = cheatTargets(targets, tdee(profile));
  let cheatWorst = 0;
  let treats = 0;
  for (let d = 0; d < 10; d++) {
    const date = new Date(2026, 11, 1 + d).toISOString().slice(0, 10);
    const day = generateDay(date, cheat, prefs, {}, undefined, { cheat: true });
    const items = MEAL_SLOTS.flatMap((s) => day[s]?.items ?? []);
    cheatWorst = Math.max(cheatWorst, Math.abs(sumNutrients(items).kcal - cheat.calories) / cheat.calories);
    treats += TREAT_SLOTS.filter((s) => day[s] && TEMPLATE_BY_ID[day[s]!.templateId]?.treat).length;
    for (const it of items) {
      if (!isFoodAllowed(FOOD_BY_ID[it.foodId], prefs)) {
        console.log(`  FAIL ${label} cheat ${date}: ${it.foodId} is not allowed`);
        failures++;
      }
    }
    // Normal slots on a cheat day must stay normal.
    for (const s of MEAL_SLOTS.filter((x) => !TREAT_SLOTS.includes(x))) {
      if (day[s] && TEMPLATE_BY_ID[day[s]!.templateId]?.treat) {
        console.log(`  FAIL ${label} cheat ${date}: treat in normal slot ${s}`);
        failures++;
      }
    }
  }
  const cheatOk = cheatWorst <= MAX_DEVIATION;
  if (!cheatOk) failures++;
  console.log(`${cheatOk ? 'ok  ' : 'FAIL'} ${(label + ' (cheat)').padEnd(26)} worst day ${(cheatWorst * 100).toFixed(1)}% off ${cheat.calories} kcal, treat meals: ${treats}/30`);
}

// Treats must never appear on normal days.
{
  let leaked = 0;
  for (let d = 0; d < 60; d++) {
    const date = new Date(2026, 10, 8 + d).toISOString().slice(0, 10);
    const day = generateDay(date, nutritionTargets(cases[0][1], 2500), cases[0][2], { breakfast: d % 4, dinner: d % 3 });
    for (const s of MEAL_SLOTS) {
      if (day[s] && (TEMPLATE_BY_ID[day[s]!.templateId]?.treat || day[s]!.items.some((i) => FOOD_BY_ID[i.foodId]?.category === 'treat'))) leaked++;
    }
  }
  if (leaked) failures++;
  console.log(`${leaked ? 'FAIL' : 'ok  '} treats on normal days: ${leaked} (60 days checked)`);
}

if (failures) {
  console.log(`\n${failures} problem(s)`);
  process.exit(1);
}
console.log('\nAll meal checks passed.');
