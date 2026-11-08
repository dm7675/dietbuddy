import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { FoodPhoto } from '@/components/food-photo';
import { AppText, Button, Card, NumberStepper, Screen, parseDecimal } from '@/components/ui';
import { FOOD_CATEGORIES, FOODS, type Food } from '@/data/foods';
import { dateKey, parseDateKey } from '@/lib/dates';
import { formatDate, formatNumber } from '@/lib/format';
import { itemNutrients } from '@/lib/meal-generator';
import { useAppStore, useDaysStore } from '@/store/app-store';
import { Radius, Space, useColors } from '@/theme/colors';

/** Log a food eaten outside the plan. */
export default function AddFood() {
  const { t } = useTranslation();
  const c = useColors();
  const { date = dateKey() } = useLocalSearchParams<{ date?: string }>();
  const language = useAppStore((s) => s.language);
  const addExtra = useDaysStore((s) => s.addExtra);

  const [query, setQuery] = useState('');
  const [food, setFood] = useState<Food | null>(null);
  const [grams, setGrams] = useState('100');

  const foods = useMemo(() => {
    const q = query.trim().toLowerCase();
    const order = (f: Food) => FOOD_CATEGORIES.indexOf(f.category);
    return FOODS.filter((f) => !q || f.name.en.toLowerCase().includes(q) || f.name.hr.toLowerCase().includes(q)).sort(
      (a, b) => order(a) - order(b),
    );
  }, [query]);

  const select = (f: Food) => {
    setFood(f);
    const mid = Math.round((f.portion.min + f.portion.max) / 2 / f.portion.step) * f.portion.step;
    setGrams(String(f.unitG ?? mid));
  };

  const g = parseDecimal(grams);
  const valid = food !== null && Number.isFinite(g) && g > 0 && g <= 2000;
  const kcal = valid ? Math.round(itemNutrients({ foodId: food!.id, grams: g }).kcal) : 0;
  const dayLabel = date === dateKey() ? t('track.today').toLowerCase() : formatDate(parseDateKey(date), language);

  const add = () => {
    if (!valid) return;
    addExtra(date, { foodId: food!.id, grams: Math.round(g) });
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <Screen
      footer={
        food ? (
          <Button
            title={`${t('extras.addButton', { day: dayLabel })} · ${formatNumber(kcal, language)} kcal`}
            onPress={add}
            disabled={!valid}
            icon="add"
          />
        ) : undefined
      }>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color={c.wood} />
        </Pressable>
        <AppText variant="title">{t('extras.addTitle')}</AppText>
      </View>

      {food ? (
        <Card style={styles.selected}>
          <View style={styles.row}>
            <FoodPhoto food={food} size={56} />
            <AppText variant="heading" style={styles.flex}>
              {food.name[language]}
            </AppText>
            <Pressable accessibilityRole="button" hitSlop={10} onPress={() => setFood(null)}>
              <Ionicons name="close" size={24} color={c.textSecondary} />
            </Pressable>
          </View>
          <AppText variant="label" color="textSecondary">
            {t('extras.amount')}
          </AppText>
          <NumberStepper value={grams} onChange={setGrams} unit="g" step={food.unitG ?? food.portion.step} min={1} max={2000} />
        </Card>
      ) : (
        <>
          <View style={[styles.search, { borderColor: c.border, backgroundColor: c.card }]}>
            <Ionicons name="search" size={18} color={c.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('prefs.search')}
              placeholderTextColor={c.textSecondary}
              autoFocus
              style={[styles.searchInput, { color: c.text }]}
            />
          </View>
          <Card style={styles.list}>
            {foods.map((f) => (
              <Pressable
                key={f.id}
                accessibilityRole="button"
                onPress={() => select(f)}
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  foodRow: { paddingVertical: 6 },
  list: { gap: 0 },
  selected: { gap: Space.md },
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
