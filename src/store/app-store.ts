import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import i18n, { deviceLanguage, type Language } from '@/i18n';
import { dateKey } from '@/lib/dates';
import type { MealItem, MealSlot, PlannedMeal, Swaps } from '@/lib/meal-generator';
import type { Pace, Profile } from '@/lib/nutrition';
import { DEFAULT_PREFERENCES, type FoodPreferences } from '@/lib/preferences';
import type { Budget, PriceOverrides } from '@/lib/prices';

interface AppState {
  language: Language;
  profile: Profile | null;
  pace: Pace | null;
  prefs: FoodPreferences;
  /** Weight log: date (YYYY-MM-DD) → kg. */
  weights: Record<string, number>;
  /** City the user shops in (for which stores are nearby). */
  city: string | null;
  /** Store chains the user shops at; empty = all. */
  stores: string[];
  budget: Budget | null;
  /** Your own prices from scanned receipts: food → store → €/kg + date. */
  myPrices: Record<string, Record<string, { price: number; date: string }>>;
  /** Cached community prices for your city. */
  community: { city: string; fetchedAt: number; prices: PriceOverrides } | null;
  saveMyPrices: (rows: { foodId: string; chain: string; price: number; date: string }[]) => void;
  clearMyPrices: () => void;
  setCommunity: (c: AppState['community']) => void;
  setLanguage: (lang: Language) => void;
  setProfile: (profile: Profile) => void;
  setPace: (pace: Pace) => void;
  setPrefs: (prefs: Partial<FoodPreferences>) => void;
  /** Logs a weight; the newest entry becomes the profile weight so targets follow your progress. */
  logWeight: (date: string, kg: number) => void;
  deleteWeight: (date: string) => void;
  /** Goal reached: keep the current weight from now on. */
  switchToMaintain: () => void;
  setShopping: (s: Partial<Pick<AppState, 'city' | 'stores' | 'budget'>>) => void;
  resetAll: () => void;
}

// Everything is stored only on this device (AsyncStorage → localStorage on web).
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      language: deviceLanguage(),
      profile: null,
      pace: null,
      prefs: DEFAULT_PREFERENCES,
      weights: {},
      city: null,
      stores: [],
      budget: null,
      myPrices: {},
      community: null,
      saveMyPrices: (rows) =>
        set((s) => {
          const myPrices = { ...s.myPrices };
          for (const r of rows) myPrices[r.foodId] = { ...myPrices[r.foodId], [r.chain]: { price: r.price, date: r.date } };
          return { myPrices };
        }),
      clearMyPrices: () => set({ myPrices: {} }),
      setCommunity: (community) => set({ community }),
      setLanguage: (language) => {
        void i18n.changeLanguage(language);
        set({ language });
      },
      // A changed profile can change which paces make sense, so the pace is re-chosen.
      setProfile: (profile) =>
        set((s) => ({ profile, pace: null, weights: { ...s.weights, [dateKey()]: profile.weightKg } })),
      setPace: (pace) => set({ pace }),
      setPrefs: (prefs) => set((s) => ({ prefs: { ...s.prefs, ...prefs } })),
      logWeight: (date, kg) =>
        set((s) => {
          const weights = { ...s.weights, [date]: kg };
          return { weights, profile: withLatestWeight(s.profile, weights) };
        }),
      deleteWeight: (date) =>
        set((s) => {
          const weights = { ...s.weights };
          delete weights[date];
          return { weights, profile: withLatestWeight(s.profile, weights) };
        }),
      switchToMaintain: () =>
        set((s) => (s.profile ? { profile: { ...s.profile, goalWeightKg: s.profile.weightKg }, pace: 'maintain' } : {})),
      setShopping: (s) => set(s),
      resetAll: () =>
        set({
          profile: null,
          pace: null,
          prefs: DEFAULT_PREFERENCES,
          weights: {},
          city: null,
          stores: [],
          budget: null,
          myPrices: {},
          community: null,
        }),
    }),
    {
      name: 'dietbuddy-app',
      version: 5,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ language, profile, pace, prefs, weights, city, stores, budget, myPrices, community }) => ({
        myPrices,
        community,
        language,
        profile,
        pace,
        prefs,
        weights,
        city,
        stores,
        budget,
      }),
      migrate: (persisted, version) => {
        const state = persisted as Partial<AppState>;
        if (version < 2) state.prefs = DEFAULT_PREFERENCES;
        if (version < 3) state.weights = state.profile ? { [dateKey()]: state.profile.weightKg } : {};
        if (version < 4) Object.assign(state, { city: null, stores: [], budget: null });
        if (version < 5) Object.assign(state, { myPrices: {}, community: null });
        return state;
      },
      onRehydrateStorage: () => (state) => {
        if (state) void i18n.changeLanguage(state.language);
      },
    },
  ),
);

function withLatestWeight(profile: Profile | null, weights: Record<string, number>): Profile | null {
  const latest = Object.keys(weights).sort().pop();
  if (!profile || !latest) return profile;
  return { ...profile, weightKg: weights[latest] };
}

/* ---------- Daily log: swaps, eaten meals, extra foods ---------- */

export interface DayLog {
  /** How many times each meal was swapped (drives which meal is generated). */
  swaps: Swaps;
  /** Snapshot of what was eaten, so later plan changes don't rewrite history. */
  eaten: Partial<Record<MealSlot, PlannedMeal>>;
  /** Foods eaten outside the plan. */
  extras?: ExtraItem[];
  /** A planned cheat day: tastier food at maintenance calories. */
  cheat?: boolean;
}

export interface ExtraItem extends MealItem {
  id: string;
}

const EMPTY_DAY: DayLog = { swaps: {}, eaten: {} };

interface DaysState {
  days: Record<string, DayLog>;
  /** Ticked-off shopping list items, per list (start date + length). */
  shoppingChecked: Record<string, string[]>;
  toggleShopping: (listKey: string, foodId: string) => void;
  swapMeal: (date: string, slot: MealSlot) => void;
  setEaten: (date: string, slot: MealSlot, meal: PlannedMeal | null) => void;
  addExtra: (date: string, item: MealItem) => void;
  setCheat: (date: string, on: boolean) => void;
  removeExtra: (date: string, id: string) => void;
  resetDays: () => void;
}

export const useDaysStore = create<DaysState>()(
  persist(
    (set) => ({
      days: {},
      shoppingChecked: {},
      toggleShopping: (listKey, foodId) =>
        set((s) => {
          const cur = s.shoppingChecked[listKey] ?? [];
          const next = cur.includes(foodId) ? cur.filter((f) => f !== foodId) : [...cur, foodId];
          return { shoppingChecked: { ...s.shoppingChecked, [listKey]: next } };
        }),
      swapMeal: (date, slot) =>
        set((s) => {
          const day = s.days[date] ?? EMPTY_DAY;
          const swaps = { ...day.swaps, [slot]: (day.swaps[slot] ?? 0) + 1 };
          return { days: { ...s.days, [date]: { ...day, swaps } } };
        }),
      setEaten: (date, slot, meal) =>
        set((s) => {
          const day = s.days[date] ?? EMPTY_DAY;
          const eaten = { ...day.eaten };
          if (meal) eaten[slot] = meal;
          else delete eaten[slot];
          return { days: { ...s.days, [date]: { ...day, eaten } } };
        }),
      addExtra: (date, item) =>
        set((s) => {
          const day = s.days[date] ?? EMPTY_DAY;
          const extra: ExtraItem = { ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
          return { days: { ...s.days, [date]: { ...day, extras: [...(day.extras ?? []), extra] } } };
        }),
      setCheat: (date, on) =>
        set((s) => {
          const day = s.days[date] ?? EMPTY_DAY;
          return { days: { ...s.days, [date]: { ...day, cheat: on } } };
        }),
      removeExtra: (date, id) =>
        set((s) => {
          const day = s.days[date] ?? EMPTY_DAY;
          const extras = (day.extras ?? []).filter((e) => e.id !== id);
          return { days: { ...s.days, [date]: { ...day, extras } } };
        }),
      resetDays: () => set({ days: {}, shoppingChecked: {} }),
    }),
    {
      name: 'dietbuddy-days',
      version: 2,
      // v1 stored eaten meals in an older shape; start fresh.
      migrate: () => ({ days: {} }),
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ days, shoppingChecked }) => ({ days, shoppingChecked }),
    },
  ),
);

export function useDayLog(date: string): DayLog {
  return useDaysStore((s) => s.days[date]) ?? EMPTY_DAY;
}

/* ---------- Hydration ---------- */

const stores = [useAppStore, useDaysStore] as const;
const allHydrated = () => stores.every((s) => s.persist.hasHydrated());

/** True once saved data has been loaded from the device. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(allHydrated);
  useEffect(() => {
    const check = () => {
      if (allHydrated()) setHydrated(true);
    };
    const unsubs = stores.map((s) => s.persist.onFinishHydration(check));
    // Hydration may have finished between the first render and subscribing.
    queueMicrotask(check);
    return () => unsubs.forEach((u) => u());
  }, []);
  return hydrated;
}
