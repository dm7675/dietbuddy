import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { FOOD_BY_ID } from '@/data/foods';
import { formatNumber } from '@/lib/format';
import { itemNutrients } from '@/lib/meal-generator';
import { useAppStore, useDaysStore, type ExtraItem } from '@/store/app-store';
import { Space, useColors } from '@/theme/colors';

import { FoodPhoto } from './food-photo';
import { itemLabel } from './meal-card';
import { AppText, Button, Card } from './ui';

/** Foods eaten outside the plan for one day, with an "Add food" button. */
export function ExtrasCard({ date, extras }: { date: string; extras: ExtraItem[] }) {
  const { t } = useTranslation();
  const c = useColors();
  const language = useAppStore((s) => s.language);
  const removeExtra = useDaysStore((s) => s.removeExtra);

  return (
    <Card>
      <View style={styles.header}>
        <Ionicons name="add-circle-outline" size={16} color={c.wood} />
        <AppText variant="label" color="wood" style={styles.flex}>
          {t('extras.title')}
        </AppText>
      </View>
      {extras.length === 0 ? (
        <AppText variant="caption" color="textSecondary">
          {t('extras.sub')}
        </AppText>
      ) : (
        extras.map((e) => {
          const food = FOOD_BY_ID[e.foodId];
          return (
            <View key={e.id} style={styles.row}>
              {food ? <FoodPhoto food={food} size={36} /> : null}
              <AppText variant="caption" style={styles.flex}>
                {itemLabel(e, language)}
              </AppText>
              <AppText variant="caption" color="textSecondary">
                {formatNumber(Math.round(itemNutrients(e).kcal), language)} kcal
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('extras.remove')}
                hitSlop={10}
                onPress={() => removeExtra(date, e.id)}>
                <Ionicons name="close-circle-outline" size={22} color={c.textSecondary} />
              </Pressable>
            </View>
          );
        })
      )}
      <Button
        title={t('extras.add')}
        variant="secondary"
        icon="add"
        onPress={() => router.push({ pathname: '/add-food', params: { date } })}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
});
