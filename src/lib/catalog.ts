// Every food product from the 10 store chains (public/catalog.json, built by
// scripts/update-prices.ts) plus nutrition lookups from Open Food Facts by barcode.

import { Platform } from 'react-native';

import type { Nutrients } from '@/data/foods';

export interface CatalogProduct {
  ean: string;
  name: string;
  /** Pack size in grams (0 = unknown). */
  sizeG: number;
  /** Lowest shelf price seen in the stores, €. */
  price: number;
}

/** A product someone ate that isn't one of the app's 84 planned foods. */
export interface CustomFood {
  id: string;
  name: string;
  per100: Nutrients;
  /** € per kg, when known from the store price lists. */
  pricePerKg?: number;
  sizeG?: number;
  ean?: string;
  source: 'openfoodfacts' | 'manual';
}

const SITE = (process.env.EXPO_PUBLIC_SITE_URL ?? 'https://dietbuddy-9jlg.onrender.com').trim().replace(/\/$/, '');
/** On the website the file is next to the page; the phone app downloads it from the website. */
const CATALOG_URL = Platform.OS === 'web' ? '/catalog.json' : `${SITE}/catalog.json`;

let loading: Promise<CatalogProduct[]> | null = null;

export const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');

/** Downloads the catalog once per app session (the browser also caches it). */
export function loadCatalog(): Promise<CatalogProduct[]> {
  loading ??= fetch(CATALOG_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data: { products: [string, string, number, number][] }) =>
      data.products.map(([ean, name, sizeG, price]) => ({ ean, name, sizeG, price })),
    )
    .catch((e) => {
      loading = null; // allow a retry
      throw e;
    });
  return loading;
}

/** Every word typed must appear in the name; names starting with the first word rank first. */
export function searchCatalog(products: CatalogProduct[], query: string, limit = 30): CatalogProduct[] {
  const words = fold(query).split(/\s+/).filter((w) => w.length >= 2);
  if (words.length === 0) return [];
  const hits: { p: CatalogProduct; score: number }[] = [];
  for (const p of products) {
    const name = fold(p.name);
    if (!words.every((w) => name.includes(w))) continue;
    const score = (name.startsWith(words[0]) ? 0 : name.includes(` ${words[0]}`) ? 1 : 2) * 1000 + name.length;
    hits.push({ p, score });
    if (hits.length > 2000) break;
  }
  return hits
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((h) => h.p);
}

/** Nutrition per 100 g from Open Food Facts, or null if they don't have it. */
export async function lookupNutrition(ean: string): Promise<Nutrients | null> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${ean}.json?fields=nutriments`,
  );
  if (!res.ok) return null;
  const body = (await res.json()) as { status?: number; product?: { nutriments?: Record<string, number> } };
  const n = body.product?.nutriments;
  const kcal = n?.['energy-kcal_100g'] ?? (n?.['energy_100g'] ? n['energy_100g'] / 4.184 : undefined);
  if (!n || kcal === undefined || !Number.isFinite(kcal)) return null;
  const num = (k: string) => (Number.isFinite(n[k]) ? Math.round(n[k] * 10) / 10 : 0);
  return {
    kcal: Math.round(kcal),
    protein: num('proteins_100g'),
    carbs: num('carbohydrates_100g'),
    fat: num('fat_100g'),
    fiber: num('fiber_100g'),
  };
}

export function customFromProduct(p: CatalogProduct, per100: Nutrients, source: CustomFood['source']): CustomFood {
  return {
    id: `p:${p.ean}`,
    name: p.name,
    per100,
    ean: p.ean,
    sizeG: p.sizeG || undefined,
    pricePerKg: p.sizeG ? Math.round((p.price / p.sizeG) * 100000) / 100 : undefined,
    source,
  };
}
