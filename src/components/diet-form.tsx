import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ALLERGENS } from '@/data/foods';
import { DIET_STYLES, type FoodPreferences } from '@/lib/preferences';
import { Space } from '@/theme/colors';

import { AppText, Chip, OptionButton } from './ui';

/** Diet style + allergies. Used in onboarding and on the preferences screen. */
export function DietForm({
  prefs,
  onChange,
}: {
  prefs: FoodPreferences;
  onChange: (prefs: Partial<FoodPreferences>) => void;
}) {
  const { t } = useTranslation();

  const toggleAllergy = (a: (typeof ALLERGENS)[number]) =>
    onChange({
      allergies: prefs.allergies.includes(a) ? prefs.allergies.filter((x) => x !== a) : [...prefs.allergies, a],
    });

  return (
    <View style={styles.wrap}>
      <AppText variant="heading">{t('prefs.dietTitle')}</AppText>
      <View style={styles.list}>
        {DIET_STYLES.map((d) => (
          <OptionButton
            key={d}
            title={t(`prefs.diet.${d}`)}
            selected={prefs.diet === d}
            onPress={() => onChange({ diet: d })}
          />
        ))}
      </View>

      <View style={styles.section}>
        <AppText variant="heading">{t('prefs.allergiesTitle')}</AppText>
        <AppText variant="caption" color="textSecondary">
          {t('prefs.allergiesSub')}
        </AppText>
      </View>
      <View style={styles.chips}>
        {ALLERGENS.map((a) => (
          <Chip
            key={a}
            label={t(`prefs.allergen.${a}`)}
            selected={prefs.allergies.includes(a)}
            icon={prefs.allergies.includes(a) ? 'close-circle' : undefined}
            tone="danger"
            onPress={() => toggleAllergy(a)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Space.sm },
  list: { gap: Space.sm },
  section: { marginTop: Space.md, gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
});
