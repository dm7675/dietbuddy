import type { Allergen, Food, Origin } from '@/data/foods';

export type DietStyle = 'none' | 'vegetarian' | 'pescatarian' | 'vegan' | 'noPork';
export const DIET_STYLES: DietStyle[] = ['none', 'vegetarian', 'pescatarian', 'vegan', 'noPork'];

export interface FoodPreferences {
  diet: DietStyle;
  /** Hard block: never suggested. */
  allergies: Allergen[];
  /** Food ids the user doesn't like: never suggested. */
  dislikes: string[];
}

export const DEFAULT_PREFERENCES: FoodPreferences = { diet: 'none', allergies: [], dislikes: [] };

const BLOCKED_ORIGINS: Record<DietStyle, Origin[]> = {
  none: [],
  noPork: ['pork'],
  pescatarian: ['meat', 'pork'],
  vegetarian: ['meat', 'pork', 'fish'],
  vegan: ['meat', 'pork', 'fish', 'dairy', 'egg', 'honey'],
};

export function isFoodAllowed(food: Food, prefs: FoodPreferences): boolean {
  if (prefs.dislikes.includes(food.id)) return false;
  if (food.allergens?.some((a) => prefs.allergies.includes(a))) return false;
  const blocked = BLOCKED_ORIGINS[prefs.diet];
  if (food.origin?.some((o) => blocked.includes(o))) return false;
  return true;
}
