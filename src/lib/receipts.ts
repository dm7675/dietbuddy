// Receipt scanning: send a photo to our Supabase function (which asks Gemini to read it),
// turn the lines into € per kg prices, and share/read anonymous community prices.

import { FOODS, FOOD_BY_ID } from '@/data/foods';
import PRICE_DATA from '@/data/prices.json';

import { CHAIN_IDS, type PriceOverrides } from './prices';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') ?? '';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** The single Supabase function that does all AI work (receipts and recipes). */
export const AI_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/dietbuddy-ai`;

/** False until the Supabase URL and public key are in .env.local. */
export const receiptsConfigured =
  (SUPABASE_URL.startsWith('https://') || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(SUPABASE_URL)) &&
  SUPABASE_KEY.length > 20;

const YIELDS = (PRICE_DATA as { yields?: Record<string, number> }).yields ?? {};

export const supabaseHeaders = () => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
});

/* ---------- Reading a receipt ---------- */

export interface ReceiptLine {
  key: string;
  text: string;
  foodId: string | null;
  totalPrice: number;
  weightG: number;
  pieces: number;
  include: boolean;
}

export interface ReceiptResult {
  chain: string | null;
  date: string | null;
  lines: ReceiptLine[];
}

export async function readReceipt(imageBase64: string): Promise<ReceiptResult> {
  const res = await fetch(AI_FUNCTION_URL, {
    method: 'POST',
    headers: supabaseHeaders(),
    body: JSON.stringify({
      image: imageBase64,
      mimeType: 'image/jpeg',
      foods: FOODS.map((f) => ({ id: f.id, en: f.name.en, hr: f.name.hr })),
      chains: CHAIN_IDS,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    chain?: string;
    date?: string;
    items?: { text?: string; food_id?: string; total_price?: number; weight_g?: number; pieces?: number }[];
  };
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);

  const lines = (body.items ?? []).map((it, i): ReceiptLine => {
    const foodId = it.food_id && FOOD_BY_ID[it.food_id] ? it.food_id : null;
    const line: ReceiptLine = {
      key: `${i}`,
      text: String(it.text ?? '').slice(0, 80),
      foodId,
      totalPrice: Number(it.total_price) || 0,
      weightG: Number(it.weight_g) || 0,
      pieces: Number(it.pieces) || 0,
      include: false,
    };
    line.include = linePricePerKg(line) !== null;
    return line;
  });

  return {
    chain: body.chain && CHAIN_IDS.includes(body.chain) ? body.chain : null,
    date: /^\d{4}-\d{2}-\d{2}$/.test(body.date ?? '') ? body.date! : null,
    lines,
  };
}

/** Bought grams of a line: the weight, or pieces × the food's piece weight (eggs). */
export function lineGrams(line: Pick<ReceiptLine, 'foodId' | 'weightG' | 'pieces'>): number {
  if (line.weightG > 0) return line.weightG;
  const unit = line.foodId ? FOOD_BY_ID[line.foodId]?.unitG : undefined;
  return line.pieces > 0 && unit ? line.pieces * unit : 0;
}

/**
 * € per kg of the food as the app counts it (edible weight), or null if it can't be
 * worked out or looks wrong.
 */
export function linePricePerKg(line: Pick<ReceiptLine, 'foodId' | 'weightG' | 'pieces' | 'totalPrice'>): number | null {
  if (!line.foodId || line.totalPrice <= 0) return null;
  const grams = lineGrams(line);
  if (grams <= 0) return null;
  const edibleKg = (grams * (YIELDS[line.foodId] ?? 1)) / 1000;
  const price = Math.round((line.totalPrice / edibleKg) * 100) / 100;
  return price > 0.1 && price < 200 ? price : null;
}

/* ---------- Community prices ---------- */

export interface SharedPrice {
  chain: string;
  city: string | null;
  foodId: string;
  pricePerKg: number;
  date: string | null;
}

/** Shares prices anonymously (store, city, food, price — nothing about the person). */
export async function sharePrices(rows: SharedPrice[]): Promise<void> {
  if (!receiptsConfigured || rows.length === 0) return;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/receipt_prices`, {
    method: 'POST',
    headers: { ...supabaseHeaders(), Prefer: 'return=minimal' },
    body: JSON.stringify(
      rows.map((r) => ({
        chain: r.chain,
        city: r.city,
        food_id: r.foodId,
        price_per_kg: r.pricePerKg,
        receipt_date: r.date,
      })),
    ),
  });
  if (!res.ok) throw new Error(`Sharing failed: HTTP ${res.status}`);
}

/** Median receipt prices from other people in this city (only where 2+ receipts agree). */
export async function fetchCommunityPrices(city: string): Promise<PriceOverrides> {
  if (!receiptsConfigured) return {};
  const url = `${SUPABASE_URL}/rest/v1/community_prices?city=eq.${encodeURIComponent(city)}&reports=gte.2&select=chain,food_id,price_per_kg`;
  const res = await fetch(url, { headers: supabaseHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = (await res.json()) as { chain: string; food_id: string; price_per_kg: number }[];
  const out: PriceOverrides = {};
  for (const r of rows) {
    if (!FOOD_BY_ID[r.food_id] || !CHAIN_IDS.includes(r.chain)) continue;
    (out[r.food_id] ??= {})[r.chain] = Number(r.price_per_kg);
  }
  return out;
}
