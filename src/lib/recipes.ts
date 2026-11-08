// "Make it a recipe": turns a planned meal into a short home recipe via the AI function.

import { FOOD_BY_ID } from '@/data/foods';
import { TEMPLATE_BY_ID } from '@/data/meal-templates';
import type { Language } from '@/i18n';

import type { MealItem } from './meal-generator';
import { AI_FUNCTION_URL, receiptsConfigured, supabaseHeaders } from './receipts';

export interface Recipe {
  title: string;
  minutes: number;
  steps: string[];
  seasoning: string[];
  tip: string;
}

/** Recipes need the same Supabase + Gemini setup as receipt scanning. */
export const recipesConfigured = receiptsConfigured;

/** Same meal + same language → same cache key, so we don't ask the AI twice. */
export function recipeKey(templateId: string, items: MealItem[], lang: Language): string {
  return `${lang}|${templateId}|${items.map((i) => `${i.foodId}:${i.grams}`).join(',')}`;
}

export async function makeRecipe(templateId: string, items: MealItem[], lang: Language): Promise<Recipe> {
  const template = TEMPLATE_BY_ID[templateId];
  const res = await fetch(AI_FUNCTION_URL, {
    method: 'POST',
    headers: supabaseHeaders(),
    body: JSON.stringify({
      task: 'recipe',
      language: lang,
      meal: {
        name: template?.name[lang] ?? templateId,
        ingredients: items.map((i) => ({ name: FOOD_BY_ID[i.foodId]?.name[lang] ?? i.foodId, grams: i.grams })),
      },
    }),
  });
  const body = (await res.json().catch(() => ({}))) as Partial<Recipe> & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  const steps = Array.isArray(body.steps) ? body.steps.map(String).filter(Boolean).slice(0, 12) : [];
  if (steps.length === 0) throw new Error('empty recipe');
  return {
    title: String(body.title ?? template?.name[lang] ?? ''),
    minutes: Math.max(1, Math.round(Number(body.minutes) || 0)),
    steps,
    seasoning: Array.isArray(body.seasoning) ? body.seasoning.map(String).slice(0, 10) : [],
    tip: String(body.tip ?? ''),
  };
}
