import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { DietForm } from '@/components/diet-form';
import { FoodPhoto } from '@/components/food-photo';
import { AppText, Card, Screen } from '@/components/ui';
import { FOOD_CATEGORIES, FOODS, type Food } from '@/data/foods';
import { isFoodAllowed } from '@/lib/preferences';
import { useAppStore } from '@/store/app-store';
import { Radius, Space, useColors } from '@/theme/colors';

/** Diet style, allergies and the "foods I don't like" list. */
export default function Preferences() {
  const { t } = useTranslation();
  const c = useColors();
  const { prefs, setPrefs, language } = useAppStore();
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FOOD_CATEGORIES.map((cat) => ({
      cat,
      foods: FOODS.filter(
        (f) =>
          f.category === cat &&
          (!q || f.name.en.toLowerCase().includes(q) || f.name.hr.toLowerCase().includes(q)),
      ),
    })).filter((g) => g.foods.length > 0);
  }, [query]);

  const toggleDislike = (id: string) =>
    setPrefs({
      dislikes: prefs.dislikes.includes(id) ? prefs.dislikes.filter((x) => x !== id) : [...prefs.dislikes, id],
    });

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
        <AppText variant="title">{t('prefs.title')}</AppText>
      </View>

      <Card>
        <DietForm prefs={prefs} onChange={setPrefs} />
      </Card>

      <Card>
        <AppText variant="heading">{t('prefs.dislikesTitle')}</AppText>
        <AppText variant="caption" color="textSecondary">
          {t('prefs.dislikesSub')} {t('prefs.hiddenCount', { n: prefs.dislikes.length })}
        </AppText>
        <View style={[styles.search, { borderColor: c.border, backgroundColor: c.background }]}>
          <Ionicons name="search" size={18} color={c.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('prefs.search')}
            placeholderTextColor={c.textSecondary}
            style={[styles.searchInput, { color: c.text }]}
          />
        </View>

        {groups.map(({ cat, foods }) => (
          <View key={cat} style={styles.group}>
            <AppText variant="label" color="wood">
              {t(`prefs.category.${cat}`)}
            </AppText>
            {foods.map((f) => (
              <FoodRow
                key={f.id}
                food={f}
                name={f.name[language]}
                disliked={prefs.dislikes.includes(f.id)}
                blocked={!isFoodAllowed(f, { ...prefs, dislikes: [] })}
                blockedLabel={t('prefs.blocked')}
                onPress={() => toggleDislike(f.id)}
              />
            ))}
          </View>
        ))}
      </Card>
    </Screen>
  );
}

function FoodRow({
  food,
  name,
  disliked,
  blocked,
  blockedLabel,
  onPress,
}: {
  food: Food;
  name: string;
  disliked: boolean;
  blocked: boolean;
  blockedLabel: string;
  onPress: () => void;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: disliked, disabled: blocked }}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.foodRow,
        { opacity: blocked ? 0.45 : pressed ? 0.7 : 1, backgroundColor: disliked ? c.warningSoft : 'transparent' },
      ]}>
      <FoodPhoto food={food} size={40} />
      <View style={styles.flex}>
        <AppText style={disliked ? styles.strike : undefined}>{name}</AppText>
        {blocked ? (
          <AppText variant="caption" color="textSecondary">
            {blockedLabel}
          </AppText>
        ) : null}
      </View>
      {!blocked ? (
        <Ionicons
          name={disliked ? 'thumbs-down' : 'thumbs-down-outline'}
          size={22}
          color={disliked ? c.danger : c.border}
        />
      ) : (
        <Ionicons name="ban" size={20} color={c.textSecondary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.md,
    height: 44,
    marginVertical: Space.xs,
  },
  searchInput: { flex: 1, fontSize: 16, padding: 0 },
  group: { gap: 2, marginTop: Space.sm },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingVertical: 6,
    paddingHorizontal: Space.sm,
    borderRadius: Radius.md,
  },
  strike: { textDecorationLine: 'line-through' },
});
