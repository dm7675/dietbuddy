import { useMemo } from 'react';

import type { CostModel } from '@/lib/meal-generator';
import { bestPrice, dailyBudget, type PriceOverrides, type Pricing } from '@/lib/prices';
import { useAppStore } from '@/store/app-store';

/** Prices for the user's stores plus the budget the meal plan should respect. */
export function usePricing() {
  const stores = useAppStore((s) => s.stores);
  const budget = useAppStore((s) => s.budget);
  const city = useAppStore((s) => s.city);
  const myPrices = useAppStore((s) => s.myPrices);
  const community = useAppStore((s) => s.community);

  return useMemo(() => {
    // Price layers: store price lists < other people's receipts in your city < your own receipts.
    const overrides: PriceOverrides = {};
    if (community && community.city === city) {
      for (const [food, byChain] of Object.entries(community.prices)) overrides[food] = { ...byChain };
    }
    for (const [food, byChain] of Object.entries(myPrices)) {
      for (const [chain, v] of Object.entries(byChain)) (overrides[food] ??= {})[chain] = v.price;
    }
    const pricing: Pricing = { chains: stores, overrides };
    const money: CostModel = {
      pricePerKg: (foodId) => bestPrice(foodId, pricing)?.price ?? 0,
      dailyBudget: dailyBudget(budget),
    };
    return { pricing, money, budget, city, configured: city !== null };
  }, [stores, budget, city, myPrices, community]);
}
