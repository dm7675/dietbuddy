import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { FoodPhoto } from '@/components/food-photo';
import { AppText, Button, Card, Chip, Notice, NumberStepper, Screen, parseDecimal } from '@/components/ui';
import { FOOD_CATEGORIES, FOODS, type Food, type Nutrients } from '@/data/foods';
import {
  customFromProduct,
  fold,
  loadCatalog,
  lookupNutrition,
  searchCatalog,
  type CatalogProduct,
  type CustomFood,
} from '@/lib/catalog';
import { dateKey, parseDateKey } from '@/lib/dates';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import { itemNutrients, type MealItem } from '@/lib/meal-generator';
import { useAppStore, useDaysStore } from '@/store/app-store';
import { Radius, Space, useColors } from '@/theme/colors';

/** Quick browse buttons: each runs a search in the store catalog. */
const BROWSE: { key: string; query: { en: string; hr: string } }[] = [
  { key: 'snacks', query: { en: 'cips', hr: 'čips' } },
  { key: 'chocolate', query: { en: 'cokolada', hr: 'čokolada' } },
  { key: 'biscuits', query: { en: 'keks', hr: 'keks' } },
  { key: 'juice', query: { en: 'sok', hr: 'sok' } },
  { key: 'bread', query: { en: 'kruh', hr: 'kruh' } },
  { key: 'yogurt', query: { en: 'jogurt', hr: 'jogurt' } },
  { key: 'cheese', query: { en: 'sir', hr: 'sir' } },
  { key: 'meat', query: { en: 'salama', hr: 'salama' } },
  { key: 'fish', query: { en: 'tuna', hr: 'tuna' } },
  { key: 'frozen', query: { en: 'smrz', hr: 'smrz' } },
  { key: 'cereal', query: { en: 'pahuljice', hr: 'pahuljice' } },
  { key: 'spreads', query: { en: 'namaz', hr: 'namaz' } },
  { key: 'icecream', query: { en: 'sladoled', hr: 'sladoled' } },
  { key: 'pastry', query: { en: 'burek', hr: 'burek' } },
];

type Selected =
  | { kind: 'food'; food: Food }
  | { kind: 'custom'; food: CustomFood }
  | { kind: 'product'; product: CatalogProduct; status: 'loading' | 'manual' };

/** Log anything you ate: the app's foods, products you used before, or any product from the stores. */
export default function AddFood() {
  const { t } = useTranslation();
  const c = useColors();
  const { date = dateKey() } = useLocalSearchParams<{ date?: string }>();
  const language = useAppStore((s) => s.language);
  const myFoods = useAppStore((s) => s.myFoods);
  const rememberFood = useAppStore((s) => s.rememberFood);
  const addExtra = useDaysStore((s) => s.addExtra);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Selected | null>(null);
  const [grams, setGrams] = useState('100');
  const [catalog, setCatalog] = useState<CatalogProduct[] | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [manual, setManual] = useState({ kcal: '', protein: '', carbs: '', fat: '' });

  // Start loading the store catalog as soon as the screen opens, so search is instant.
  const searching = query.trim().length >= 2;
  useEffect(() => {
    if (catalog || catalogError) return;
    let cancelled = false;
    loadCatalog()
      .then((p) => !cancelled && setCatalog(p))
      .catch(() => !cancelled && setCatalogError(true));
    return () => {
      cancelled = true;
    };
  }, [catalog, catalogError]);

  const q = fold(query.trim());
  const ownFoods = useMemo(() => {
    const order = (f: Food) => FOOD_CATEGORIES.indexOf(f.category);
    return FOODS.filter((f) => !q || fold(f.name.en).includes(q) || fold(f.name.hr).includes(q)).sort(
      (a, b) => order(a) - order(b),
    );
  }, [q]);
  const recent = useMemo(
    () => [...myFoods].reverse().filter((f) => !q || fold(f.name).includes(q)),
    [myFoods, q],
  );
  const products = useMemo(() => (catalog && searching ? searchCatalog(catalog, query) : []), [catalog, searching, query]);

  /* ---------- Choosing ---------- */

  const chooseFood = (food: Food) => {
    setSelected({ kind: 'food', food });
    const mid = Math.round((food.portion.min + food.portion.max) / 2 / food.portion.step) * food.portion.step;
    setGrams(String(food.unitG ?? mid));
  };
  const chooseCustom = (food: CustomFood) => {
    setSelected({ kind: 'custom', food });
    setGrams(String(food.sizeG && food.sizeG <= 500 ? food.sizeG : 100));
  };
  const chooseProduct = async (product: CatalogProduct) => {
    setSelected({ kind: 'product', product, status: 'loading' });
    setGrams(String(product.sizeG && product.sizeG <= 500 ? product.sizeG : 100));
    try {
      const per100 = await lookupNutrition(product.ean);
      if (per100) {
        const food = customFromProduct(product, per100, 'openfoodfacts');
        rememberFood(food);
        setSelected({ kind: 'custom', food });
        return;
      }
    } catch {
      // offline or Open Food Facts unavailable → ask for the label values
    }
    setManual({ kcal: '', protein: '', carbs: '', fat: '' });
    setSelected({ kind: 'product', product, status: 'manual' });
  };

  /* ---------- Adding ---------- */

  const g = parseDecimal(grams);
  const gramsOk = Number.isFinite(g) && g > 0 && g <= 3000;
  const manualKcal = parseDecimal(manual.kcal);
  const manualPer100: Nutrients | null =
    Number.isFinite(manualKcal) && manualKcal >= 0 && manualKcal <= 950
      ? {
          kcal: manualKcal,
          protein: parseDecimal(manual.protein) || 0,
          carbs: parseDecimal(manual.carbs) || 0,
          fat: parseDecimal(manual.fat) || 0,
          fiber: 0,
        }
      : null;

  const item: MealItem | null = (() => {
    if (!selected || !gramsOk) return null;
    if (selected.kind === 'food') return { foodId: selected.food.id, grams: Math.round(g) };
    if (selected.kind === 'custom') {
      const f = selected.food;
      return { foodId: f.id, grams: Math.round(g), custom: { name: f.name, per100: f.per100, pricePerKg: f.pricePerKg } };
    }
    if (selected.status === 'manual' && manualPer100) {
      const f = customFromProduct(selected.product, manualPer100, 'manual');
      return { foodId: f.id, grams: Math.round(g), custom: { name: f.name, per100: f.per100, pricePerKg: f.pricePerKg } };
    }
    return null;
  })();

  const kcal = item ? Math.round(itemNutrients(item).kcal) : 0;
  const dayLabel = date === dateKey() ? t('track.today').toLowerCase() : formatDate(parseDateKey(date), language);

  const add = () => {
    if (!item || !selected) return;
    if (selected.kind === 'product' && manualPer100) rememberFood(customFromProduct(selected.product, manualPer100, 'manual'));
    if (selected.kind === 'custom') rememberFood(selected.food);
    addExtra(date, item);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <Screen
      footer={
        selected ? (
          <Button
            title={`${t('extras.addButton', { day: dayLabel })} · ${formatNumber(kcal, language)} kcal`}
            onPress={add}
            disabled={!item}
            icon="add"
          />
        ) : undefined
      }>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={back} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color={c.wood} />
        </Pressable>
        <AppText variant="title">{t('extras.addTitle')}</AppText>
      </View>

      {selected ? (
        <SelectedCard
          selected={selected}
          grams={grams}
          setGrams={setGrams}
          manual={manual}
          setManual={setManual}
          onClear={() => setSelected(null)}
        />
      ) : (
        <>
          <View style={[styles.search, { borderColor: c.border, backgroundColor: c.card }]}>
            <Ionicons name="search" size={18} color={c.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('extras.searchAll')}
              placeholderTextColor={c.textSecondary}
              autoFocus
              style={[styles.searchInput, { color: c.text }]}
            />
          </View>

          {recent.length > 0 ? (
            <Card style={styles.list}>
              <AppText variant="label" color="wood">
                {t('extras.recent')}
              </AppText>
              {recent.slice(0, 8).map((f) => (
                <Row key={f.id} title={f.name} sub={`${f.per100.kcal} kcal / 100 g`} onPress={() => chooseCustom(f)} />
              ))}
            </Card>
          ) : null}

          {searching ? (
            <Card style={styles.list}>
              <AppText variant="label" color="wood">
                {t('extras.fromStores')}
              </AppText>
              {catalogError ? (
                <AppText variant="caption" color="warning">
                  {t('extras.catalogError')}
                </AppText>
              ) : !catalog ? (
                <View style={styles.row}>
                  <ActivityIndicator color={c.primary} />
                  <AppText variant="caption" color="textSecondary">
                    {t('extras.catalogLoading')}
                  </AppText>
                </View>
              ) : products.length === 0 ? (
                <AppText variant="caption" color="textSecondary">
                  {t('extras.noProducts')}
                </AppText>
              ) : (
                products.map((p) => (
                  <Row
                    key={p.ean}
                    title={p.name}
                    sub={[p.sizeG ? `${formatNumber(p.sizeG, language)} g` : null, formatMoney(p.price, language)].filter(Boolean).join(' · ')}
                    icon="storefront-outline"
                    onPress={() => chooseProduct(p)}
                  />
                ))
              )}
            </Card>
          ) : (
            <Card style={[styles.list, { backgroundColor: c.woodSoft, borderColor: c.woodSoft }]}>
              <AppText variant="heading">
                {catalog
                  ? t('extras.catalogCount', { n: formatNumber(catalog.length, language) })
                  : t('extras.catalogLoading')}
              </AppText>
              <AppText variant="caption" color="textSecondary">
                {t('extras.searchHint')}
              </AppText>
              <View style={styles.chips}>
                {BROWSE.map((b) => (
                  <Chip key={b.key} label={t(`extras.browse.${b.key}`)} tone="wood" onPress={() => setQuery(b.query[language])} />
                ))}
              </View>
            </Card>
          )}

          <Card style={styles.list}>
            <AppText variant="label" color="wood">
              {t('extras.ourFoods')}
            </AppText>
            {ownFoods.slice(0, searching ? 10 : 200).map((f) => (
              <Pressable
                key={f.id}
                accessibilityRole="button"
                onPress={() => chooseFood(f)}
                style={({ pressed }) => [styles.row, styles.foodRow, { opacity: pressed ? 0.7 : 1 }]}>
                <FoodPhoto food={f} size={40} />
                <AppText style={styles.flex}>{f.name[language]}</AppText>
                <AppText variant="caption" color="textSecondary">
                  {f.per100.kcal} kcal / 100 g
                </AppText>
              </Pressable>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}

function Row({
  title,
  sub,
  onPress,
  icon = 'time-outline',
}: {
  title: string;
  sub: string;
  onPress: () => void;
  icon?: 'time-outline' | 'storefront-outline';
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, styles.foodRow, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.iconBubble, { backgroundColor: c.woodSoft }]}>
        <Ionicons name={icon} size={18} color={c.wood} />
      </View>
      <AppText style={styles.flex} numberOfLines={2}>
        {title}
      </AppText>
      <AppText variant="caption" color="textSecondary">
        {sub}
      </AppText>
    </Pressable>
  );
}

function SelectedCard({
  selected,
  grams,
  setGrams,
  manual,
  setManual,
  onClear,
}: {
  selected: Selected;
  grams: string;
  setGrams: (v: string) => void;
  manual: { kcal: string; protein: string; carbs: string; fat: string };
  setManual: (m: { kcal: string; protein: string; carbs: string; fat: string }) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  const c = useColors();
  const language = useAppStore((s) => s.language);

  const name =
    selected.kind === 'food' ? selected.food.name[language] : selected.kind === 'custom' ? selected.food.name : selected.product.name;
  const per100 = selected.kind === 'food' ? selected.food.per100 : selected.kind === 'custom' ? selected.food.per100 : null;
  const step = selected.kind === 'food' ? (selected.food.unitG ?? selected.food.portion.step) : 10;

  return (
    <Card style={styles.selected}>
      <View style={styles.row}>
        {selected.kind === 'food' ? (
          <FoodPhoto food={selected.food} size={56} />
        ) : (
          <View style={[styles.bigIcon, { backgroundColor: c.woodSoft }]}>
            <Ionicons name="storefront-outline" size={26} color={c.wood} />
          </View>
        )}
        <AppText variant="heading" style={styles.flex}>
          {name}
        </AppText>
        <Pressable accessibilityRole="button" hitSlop={10} onPress={onClear}>
          <Ionicons name="close" size={24} color={c.textSecondary} />
        </Pressable>
      </View>

      {per100 ? (
        <AppText variant="caption" color="textSecondary">
          {t('extras.per100', {
            kcal: Math.round(per100.kcal),
            p: Math.round(per100.protein),
            c: Math.round(per100.carbs),
            f: Math.round(per100.fat),
          })}
          {selected.kind === 'custom' && selected.food.source === 'openfoodfacts' ? ` · ${t('extras.offSource')}` : ''}
        </AppText>
      ) : null}

      {selected.kind === 'product' && selected.status === 'loading' ? (
        <View style={styles.row}>
          <ActivityIndicator color={c.primary} />
          <AppText variant="caption" color="textSecondary">
            {t('extras.lookingUp')}
          </AppText>
        </View>
      ) : null}

      {selected.kind === 'product' && selected.status === 'manual' ? (
        <View style={styles.manual}>
          <Notice tone="info" text={t('extras.manualHint')} />
          {(
            [
              ['kcal', t('extras.kcal100')],
              ['protein', t('today.protein')],
              ['carbs', t('today.carbs')],
              ['fat', t('today.fat')],
            ] as const
          ).map(([key, label]) => (
            <View key={key} style={styles.row}>
              <AppText style={styles.flex}>{label}</AppText>
              <TextInput
                value={manual[key]}
                onChangeText={(v) => setManual({ ...manual, [key]: v.replace(/[^0-9.,]/g, '') })}
                keyboardType="decimal-pad"
                placeholder={key === 'kcal' ? '0' : '0 g'}
                placeholderTextColor={c.textSecondary}
                style={[styles.manualInput, { color: c.text, borderColor: c.border }]}
              />
            </View>
          ))}
        </View>
      ) : null}

      <AppText variant="label" color="textSecondary">
        {t('extras.amount')}
      </AppText>
      <NumberStepper value={grams} onChange={setGrams} unit="g" step={step} min={1} max={3000} />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  foodRow: { paddingVertical: 6 },
  list: { gap: 0 },
  selected: { gap: Space.md },
  iconBubble: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  bigIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  manual: { gap: Space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, marginTop: Space.sm },
  manualInput: { borderWidth: 1, borderRadius: Radius.md, width: 100, height: 40, paddingHorizontal: 10, fontSize: 16, textAlign: 'right' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.md,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: 16, padding: 0 },
});
