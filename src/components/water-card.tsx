import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatNumber } from '@/lib/format';
import { useAppStore, useDaysStore } from '@/store/app-store';
import { Space, useColors } from '@/theme/colors';

import { AppText, Card, Chip, ProgressBar } from './ui';

const GLASS = 250;

/** Water drunk today vs the daily target, with quick +glass / +bottle buttons. */
export function WaterCard({ date, targetMl }: { date: string; targetMl: number }) {
  const { t } = useTranslation();
  const c = useColors();
  const language = useAppStore((s) => s.language);
  const drunk = useDaysStore((s) => s.days[date]?.waterMl ?? 0);
  const addWater = useDaysStore((s) => s.addWater);
  const liters = (ml: number) => formatNumber(ml / 1000, language, 2);
  const glasses = Math.min(12, Math.ceil(targetMl / GLASS));
  const filled = Math.floor(drunk / GLASS);

  return (
    <Card>
      <View style={styles.row}>
        <Ionicons name="water" size={20} color="#3A86C8" />
        <AppText variant="heading" style={styles.flex}>
          {t('water.title')}
        </AppText>
        <AppText variant="label">
          {liters(drunk)} / {liters(targetMl)} L
        </AppText>
      </View>
      <ProgressBar value={drunk / targetMl} color="#3A86C8" />
      <View style={styles.glasses} accessibilityLabel={t('water.glasses', { n: filled, total: glasses })}>
        {Array.from({ length: glasses }, (_, i) => (
          <Ionicons key={i} name={i < filled ? 'water' : 'water-outline'} size={20} color={i < filled ? '#3A86C8' : c.border} />
        ))}
      </View>
      <View style={styles.row}>
        <Chip label={t('water.glass')} icon="add" onPress={() => addWater(date, GLASS)} />
        <Chip label={t('water.bottle')} icon="add" onPress={() => addWater(date, 500)} />
        <View style={styles.flex} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('water.undo')}
          disabled={drunk === 0}
          hitSlop={10}
          onPress={() => addWater(date, -GLASS)}>
          <Ionicons name="remove-circle-outline" size={26} color={drunk === 0 ? c.border : c.textSecondary} />
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  glasses: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
});
