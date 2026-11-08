// Food prices from Croatian supermarket price lists (see scripts/update-prices.ts).
// All prices are € per kg of the food as the app counts it (edible / drained weight).

import PRICE_DATA from '@/data/prices.json';

import type { MealItem } from './meal-generator';

interface PriceData {
  source: string;
  date: string;
  chains: Record<string, { name: string; cities: string[] }>;
  prices: Record<string, Record<string, number>>;
}

const DATA = PRICE_DATA as PriceData;

export const PRICE_DATE = DATA.date;
export const CHAIN_IDS = Object.keys(DATA.chains);
export const chainName = (id: string) => DATA.chains[id]?.name ?? id;

/** Personal prices (from scanned receipts) override list prices: foodId → chain → €/kg. */
export type PriceOverrides = Record<string, Record<string, number>>;

/* ---------- Cities & stores ---------- */

const CITY_CHAINS: Record<string, string[]> = {};
for (const [chain, info] of Object.entries(DATA.chains)) {
  for (const city of info.cities) (CITY_CHAINS[city] ??= []).push(chain);
}

/** Every city with at least one supported store, sorted. */
export const CITIES = Object.keys(CITY_CHAINS).sort((a, b) => a.localeCompare(b, 'hr'));

export function chainsInCity(city: string | null): string[] {
  return city ? (CITY_CHAINS[city] ?? []) : [];
}

/* ---------- Prices ---------- */

export interface Pricing {
  /** Stores the user shops at. Empty = all stores. */
  chains: string[];
  overrides?: PriceOverrides;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}

/** € per kg in one specific store, or null if that store has no price for it. */
export function storePrice(foodId: string, chain: string, pricing?: Pricing): number | null {
  return pricing?.overrides?.[foodId]?.[chain] ?? DATA.prices[foodId]?.[chain] ?? null;
}

/**
 * Cheapest € per kg across the user's stores. Falls back to the national median
 * when none of their stores lists the food, and null if nobody does.
 */
export function bestPrice(foodId: string, pricing?: Pricing): { price: number; chain: string | null } | null {
  const chains = pricing?.chains.length ? pricing.chains : CHAIN_IDS;
  let best: { price: number; chain: string } | null = null;
  for (const chain of chains) {
    const p = storePrice(foodId, chain, pricing);
    if (p !== null && (!best || p < best.price)) best = { price: p, chain };
  }
  if (best) return best;
  const all = Object.values(DATA.prices[foodId] ?? {});
  return all.length ? { price: median(all), chain: null } : null;
}

export function itemsCost(items: MealItem[], pricing?: Pricing): number {
  let total = 0;
  for (const it of items) {
    const perKg = it.custom ? (it.custom.pricePerKg ?? 0) : (bestPrice(it.foodId, pricing)?.price ?? 0);
    total += (perKg * it.grams) / 1000;
  }
  return total;
}

/* ---------- Budget ---------- */

export type BudgetMode = 'daily' | 'weekly';
export interface Budget {
  mode: BudgetMode;
  amount: number;
}

/** Minimums agreed for the app: €10 a day, or €55 a week (buying for a week is cheaper per day). */
export const BUDGET_MIN: Record<BudgetMode, number> = { daily: 10, weekly: 55 };
export const BUDGET_PRESETS: Record<BudgetMode, number[]> = {
  daily: [10, 15, 20, 25, 30],
  weekly: [55, 70, 100, 140, 200],
};

export function dailyBudget(b: Budget | null): number | null {
  if (!b) return null;
  return b.mode === 'daily' ? b.amount : b.amount / 7;
}

/* ---------- Buying real packs ---------- */

const PACKS = (PRICE_DATA as unknown as { packs?: Record<string, Record<string, [number, number][]>> }).packs ?? {};

/** What you actually put in the basket for one food. */
export interface Purchase {
  /** What you pay at the till. */
  cost: number;
  /** Sold by weight (meat counter, fruit & veg): you buy exactly what you need. */
  loose: boolean;
  /** Number of packs and edible grams per pack (when not loose). */
  count: number;
  packG: number;
}

/**
 * Cheapest way to buy at least `needG` grams of a food in one store, using that store's
 * real pack sizes. Receipt prices (overrides) scale the pack prices.
 */
export function purchase(foodId: string, chain: string, needG: number, pricing?: Pricing): Purchase | null {
  const options = PACKS[foodId]?.[chain];
  const listPerKg = DATA.prices[foodId]?.[chain];
  const override = pricing?.overrides?.[foodId]?.[chain];
  const scale = override && listPerKg ? override / listPerKg : 1;

  let best: Purchase | null = null;
  for (const [g, price] of options ?? []) {
    const option: Purchase =
      g === 0
        ? { cost: (price * scale * needG) / 1000, loose: true, count: 1, packG: needG }
        : { cost: Math.ceil(needG / g) * price * scale, loose: false, count: Math.ceil(needG / g), packG: g };
    // Cheapest wins; on a tie, the one with less left over.
    if (!best || option.cost < best.cost - 0.005 || (Math.abs(option.cost - best.cost) <= 0.005 && option.count * option.packG < best.count * best.packG)) {
      best = option;
    }
  }
  if (best) return best;

  // No pack data for this store: fall back to its price per kg.
  const perKg = storePrice(foodId, chain, pricing);
  return perKg === null ? null : { cost: (perKg * needG) / 1000, loose: true, count: 1, packG: needG };
}

/* ---------- Shopping list ---------- */

export interface ShoppingLine {
  foodId: string;
  /** Edible grams the plan needs. */
  grams: number;
  /** What it costs at the till (whole packs). */
  cost: number;
  /** Store it is bought at (null = no store has a price; estimated). */
  chain: string | null;
  buy: Purchase | null;
}

/** Sums all items per food and buys each one where it's cheapest (or in one fixed store), in real packs. */
export function shoppingList(items: MealItem[], pricing: Pricing, singleStore?: string): ShoppingLine[] {
  const grams = new Map<string, number>();
  for (const it of items) grams.set(it.foodId, (grams.get(it.foodId) ?? 0) + it.grams);

  return [...grams].map(([foodId, g]) => {
    const chains = singleStore ? [singleStore] : pricing.chains.length ? pricing.chains : CHAIN_IDS;
    let best: { chain: string; buy: Purchase } | null = null;
    for (const chain of chains) {
      const buy = purchase(foodId, chain, g, pricing);
      if (buy && (!best || buy.cost < best.buy.cost)) best = { chain, buy };
    }
    if (best) return { foodId, grams: g, cost: best.buy.cost, chain: best.chain, buy: best.buy };
    // Nobody in these stores lists it: estimate with the national median price per kg.
    const fallback = bestPrice(foodId, { chains: [] })?.price ?? 0;
    return { foodId, grams: g, cost: (fallback * g) / 1000, chain: null, buy: null };
  });
}

/** Total for buying everything in one store (missing foods priced at the national median). */
export function storeTotals(items: MealItem[], pricing: Pricing): { chain: string; total: number; missing: number }[] {
  const chains = pricing.chains.length ? pricing.chains : CHAIN_IDS;
  return chains
    .map((chain) => {
      const lines = shoppingList(items, pricing, chain);
      return {
        chain,
        total: lines.reduce((s, l) => s + l.cost, 0),
        missing: lines.filter((l) => l.chain === null).length,
      };
    })
    .sort((a, b) => a.missing - b.missing || a.total - b.total);
}
