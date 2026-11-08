import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { FoodPhoto } from '@/components/food-photo';
import { AppText, Card, Chip, Screen } from '@/components/ui';
import { FOOD_BY_ID } from '@/data/foods';
import { useDayPlans } from '@/hooks/use-day-plan';
import { usePricing } from '@/hooks/use-pricing';
import { dateKey, shiftDateKey } from '@/lib/dates';
import { formatMoney, formatNumber } from '@/lib/format';
import { MEAL_SLOTS, type MealItem } from '@/lib/meal-generator';
import { PRICE_DATE, chainName, shoppingList, storeTotals, type ShoppingLine } from '@/lib/prices';
import { useAppStore, useDaysStore } from '@/store/app-store';
import { Space, useColors } from '@/theme/colors';

const PERIODS = [1, 3, 7] as const;

/** Everything still needed for the next 1, 3 or 7 days, grouped by store. */
export default function Shopping() {
  const { t } = useTranslation();
  const c = useColors();
  const language = useAppStore((s) => s.language);
  const { pricing, budget } = usePricing();
  const checked = useDaysStore((s) => s.shoppingChecked);
  const toggle = useDaysStore((s) => s.toggleShopping);

  const [days, setDays] = useState<(typeof PERIODS)[number]>(budget?.mode === 'daily' ? 1 : 7);
  const [mode, setMode] = useState<'cheapest' | 'one'>('cheapest');
  const [store, setStore] = useState<string | null>(null);

  const today = dateKey();
  const plans = useDayPlans(Array.from({ length: days }, (_, i) => shiftDateKey(today, i)));

  const items: MealItem[] = [];
  plans.forEach((day) => {
    for (const slot of MEAL_SLOTS) {
      if (day.eaten[slot]) continue; // already eaten → already bought
      items.push(...(day.meals[slot]?.items ?? []));
    }
  });

  const totals = storeTotals(items, pricing);
  const chosenStore = mode === 'one' ? (store ?? totals[0]?.chain ?? null) : null;
  const lines = shoppingList(items, pricing, chosenStore ?? undefined);
  const listKey = `${today}|${days}`;
  const done = checked[listKey] ?? [];

  const groups = new Map<string, ShoppingLine[]>();
  for (const l of lines.sort((a, b) => b.cost - a.cost)) {
    const key = l.chain ?? 'any';
    groups.set(key, [...(groups.get(key) ?? []), l]);
  }
  const total = lines.reduce((s, l) => s + l.cost, 0);
  const left = lines.filter((l) => !done.includes(l.foodId)).reduce((s, l) => s + l.cost, 0);
  const money = (n: number) => formatMoney(n, language);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/plan'))}
          hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color={c.wood} />
        </Pressable>
        <AppText variant="title">{t('shop.list')}</AppText>
      </View>

      <View style={styles.chips}>
        <AppText variant="label" color="textSecondary">
          {t('shop.period')}
        </AppText>
        {PERIODS.map((p) => (
          <Chip key={p} label={t(`shop.days.${p}`)} selected={days === p} onPress={() => setDays(p)} tone="wood" />
        ))}
      </View>
      <View style={styles.chips}>
        <Chip label={t('shop.cheapest')} selected={mode === 'cheapest'} onPress={() => setMode('cheapest')} />
        <Chip label={t('shop.oneStore')} selected={mode === 'one'} onPress={() => setMode('one')} />
      </View>

      {mode === 'one' && totals.length > 0 ? (
        <Card>
          <AppText variant="heading">{t('shop.storeTotals')}</AppText>
          {totals.map((s) => (
            <Pressable
              key={s.chain}
              accessibilityRole="radio"
              accessibilityState={{ selected: chosenStore === s.chain }}
              onPress={() => setStore(s.chain)}
              style={[styles.storeRow, { borderBottomColor: c.border }]}>
              <Ionicons
                name={chosenStore === s.chain ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={chosenStore === s.chain ? c.primary : c.textSecondary}
              />
              <AppText style={styles.flex}>{chainName(s.chain)}</AppText>
              {s.missing ? (
                <AppText variant="caption" color="textSecondary">
                  {t('shop.missing', { n: s.missing })}
                </AppText>
              ) : null}
              <AppText variant="label">{money(s.total)}</AppText>
            </Pressable>
          ))}
        </Card>
      ) : null}

      {lines.length === 0 ? (
        <AppText color="textSecondary">{t('shop.empty')}</AppText>
      ) : (
        [...groups].map(([chain, group]) => (
          <Card key={chain}>
            <View style={styles.row}>
              <Ionicons name="storefront-outline" size={18} color={c.wood} />
              <AppText variant="heading" style={styles.flex}>
                {chain === 'any' ? t('shop.anyStore') : chainName(chain)}
              </AppText>
              <AppText variant="label" color="textSecondary">
                {money(group.reduce((s, l) => s + l.cost, 0))}
              </AppText>
            </View>
            {group.map((l) => {
              const food = FOOD_BY_ID[l.foodId];
              const isDone = done.includes(l.foodId);
              return (
                <Pressable
                  key={l.foodId}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isDone }}
                  onPress={() => toggle(listKey, l.foodId)}
                  style={[styles.line, { opacity: isDone ? 0.5 : 1 }]}>
                  <Ionicons
                    name={isDone ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={isDone ? c.primary : c.textSecondary}
                  />
                  {food ? <FoodPhoto food={food} size={36} /> : null}
                  <View style={styles.flex}>
                    <AppText style={isDone ? styles.strike : undefined}>{food?.name[language] ?? l.foodId}</AppText>
                    <AppText variant="caption" color="textSecondary">
                      {buyLabel(l, language, t)}
                    </AppText>
                  </View>
                  <AppText variant="label">{money(l.cost)}</AppText>
                </Pressable>
              );
            })}
          </Card>
        ))
      )}

      {lines.length > 0 ? (
        <Card>
          <View style={styles.row}>
            <AppText variant="heading" style={styles.flex}>
              {t('shop.total')}
            </AppText>
            <AppText variant="heading">{money(total)}</AppText>
          </View>
          <View style={styles.row}>
            <AppText color="textSecondary" style={styles.flex}>
              {t('shop.left')}
            </AppText>
            <AppText variant="label">{money(left)}</AppText>
          </View>
        </Card>
      ) : null}

      <AppText variant="caption" color="textSecondary">
        {t('shop.note', { date: PRICE_DATE })}
      </AppText>
    </Screen>
  );
}

/** "450 g" / "1,2 kg", or pieces for eggs etc. ("10 pcs"). */
function amount(grams: number, foodId: string, lang: 'en' | 'hr', t: TFunction): string {
  const unit = FOOD_BY_ID[foodId]?.unitG;
  if (unit && foodId === 'eggs') return t('shop.pcs', { n: Math.round(grams / unit) });
  return grams >= 1000 ? `${formatNumber(grams / 1000, lang, 1)} kg` : `${Math.round(grams)} g`;
}

/** "1 × 500 g · you need 340 g" or "by weight · you need 390 g". */
function buyLabel(l: ShoppingLine, lang: 'en' | 'hr', t: TFunction): string {
  const need = t('shop.youNeed', { amount: amount(l.grams, l.foodId, lang, t) });
  if (!l.buy) return `${need} · ${t('shop.estimated')}`;
  if (l.buy.loose) return `${t('shop.byWeight')} · ${need}`;
  return `${t('shop.buyPacks', { count: l.buy.count, size: amount(l.buy.packG, l.foodId, lang, t) })} · ${need}`;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, alignItems: 'center' },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, paddingVertical: 10, borderBottomWidth: 1 },
  line: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, paddingVertical: 4 },
  strike: { textDecorationLine: 'line-through' },
});
