import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText, Card, Chip, NumberStepper, Notice, Screen, parseDecimal } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import {
  BUDGET_MIN,
  BUDGET_PRESETS,
  CHAIN_IDS,
  CITIES,
  chainName,
  chainsInCity,
  dailyBudget,
  type BudgetMode,
} from '@/lib/prices';
import { useAppStore } from '@/store/app-store';
import { Radius, Space, useColors } from '@/theme/colors';

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');

export default function ShoppingSettings() {
  const { t } = useTranslation();
  const c = useColors();
  const { language, city, stores, budget, setShopping } = useAppStore();
  const [query, setQuery] = useState('');
  const [editingCity, setEditingCity] = useState(city === null);
  const [custom, setCustom] = useState(budget ? String(budget.amount) : '');

  const matches = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return [];
    return CITIES.filter((name) => fold(name).startsWith(q))
      .concat(CITIES.filter((name) => !fold(name).startsWith(q) && fold(name).includes(q)))
      .slice(0, 8);
  }, [query]);

  const local = chainsInCity(city);
  const chainOrder = [...local, ...CHAIN_IDS.filter((id) => !local.includes(id))];
  const money = (n: number) => formatMoney(n, language);

  const chooseCity = (name: string) => {
    setShopping({ city: name, stores: chainsInCity(name) });
    setQuery('');
    setEditingCity(false);
  };

  const toggleStore = (id: string) =>
    setShopping({ stores: stores.includes(id) ? stores.filter((s) => s !== id) : [...stores, id] });

  const setMode = (mode: BudgetMode | null) => {
    if (!mode) {
      setShopping({ budget: null });
      return;
    }
    const amount = BUDGET_PRESETS[mode][1];
    setShopping({ budget: { mode, amount } });
    setCustom(String(amount));
  };

  const setAmount = (amount: number) => {
    if (!budget) return;
    setShopping({ budget: { ...budget, amount } });
    setCustom(String(amount));
  };

  const customValue = parseDecimal(custom);
  const customValid = budget !== null && Number.isFinite(customValue) && customValue >= BUDGET_MIN[budget.mode];

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/me'))}
          hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color={c.wood} />
        </Pressable>
        <AppText variant="title">{t('shop.title')}</AppText>
      </View>

      {/* City */}
      <Card>
        <AppText variant="heading">{t('shop.city')}</AppText>
        <AppText variant="caption" color="textSecondary">
          {t('shop.cityHint')}
        </AppText>
        {!editingCity && city ? (
          <View style={styles.row}>
            <Ionicons name="location" size={20} color={c.wood} />
            <AppText variant="heading" style={styles.flex}>
              {city}
            </AppText>
            <Chip label={t('shop.change')} tone="wood" onPress={() => setEditingCity(true)} />
          </View>
        ) : (
          <>
            <View style={[styles.search, { borderColor: c.border, backgroundColor: c.background }]}>
              <Ionicons name="search" size={18} color={c.textSecondary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t('shop.citySearch')}
                placeholderTextColor={c.textSecondary}
                autoFocus
                style={[styles.searchInput, { color: c.text }]}
              />
            </View>
            {matches.map((name) => (
              <Pressable
                key={name}
                accessibilityRole="button"
                onPress={() => chooseCity(name)}
                style={({ pressed }) => [styles.cityRow, { opacity: pressed ? 0.6 : 1, borderBottomColor: c.border }]}>
                <AppText style={styles.flex}>{name}</AppText>
                <AppText variant="caption" color="textSecondary">
                  {chainsInCity(name).map(chainName).join(', ')}
                </AppText>
              </Pressable>
            ))}
          </>
        )}
      </Card>

      {/* Stores */}
      <Card>
        <AppText variant="heading">{t('shop.stores')}</AppText>
        <AppText variant="caption" color="textSecondary">
          {t('shop.storesHint')}
        </AppText>
        {city && local.length === 0 ? <Notice tone="info" text={t('shop.noStoresInCity')} /> : null}
        <View style={styles.chips}>
          {chainOrder.map((id) => (
            <Chip
              key={id}
              label={chainName(id)}
              selected={stores.includes(id)}
              icon={local.includes(id) ? 'location-outline' : undefined}
              onPress={() => toggleStore(id)}
            />
          ))}
        </View>
      </Card>

      {/* Budget */}
      <Card>
        <AppText variant="heading">{t('shop.budget')}</AppText>
        <AppText variant="caption" color="textSecondary">
          {t('shop.budgetHint')}
        </AppText>
        <View style={styles.chips}>
          <Chip label={t('shop.noBudget')} selected={!budget} onPress={() => setMode(null)} tone="wood" />
          <Chip label={t('shop.daily')} selected={budget?.mode === 'daily'} onPress={() => setMode('daily')} tone="wood" />
          <Chip label={t('shop.weekly')} selected={budget?.mode === 'weekly'} onPress={() => setMode('weekly')} tone="wood" />
        </View>

        {budget ? (
          <>
            <View style={styles.chips}>
              {BUDGET_PRESETS[budget.mode].map((amount) => (
                <Chip key={amount} label={money(amount)} selected={budget.amount === amount} onPress={() => setAmount(amount)} />
              ))}
            </View>
            <AppText variant="label" color="textSecondary">
              {t('shop.custom')}
            </AppText>
            <NumberStepper
              value={custom}
              onChange={(text) => {
                setCustom(text);
                const v = parseDecimal(text);
                if (Number.isFinite(v) && v >= BUDGET_MIN[budget.mode]) setShopping({ budget: { ...budget, amount: v } });
              }}
              unit="€"
              step={budget.mode === 'daily' ? 1 : 5}
              min={BUDGET_MIN[budget.mode]}
              max={budget.mode === 'daily' ? 200 : 1000}
            />
            <AppText variant="caption" color={customValid ? 'textSecondary' : 'danger'} style={styles.center}>
              {t('shop.min', { min: money(BUDGET_MIN[budget.mode]) })}
              {budget.mode === 'weekly' ? ` · ${t('shop.perDay', { amount: money(dailyBudget(budget)!) })}` : ''}
            </AppText>
          </>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.md,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 16, padding: 0 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, paddingVertical: 10, borderBottomWidth: 1 },
});
