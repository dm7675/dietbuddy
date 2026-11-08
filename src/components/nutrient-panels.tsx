import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { formatNumber } from '@/lib/format';
import {
  DISPLAY_MICROS,
  MICRO_UNIT,
  foodName,
  microStatus,
  type DisplayMicro,
  type MicroGap,
  type MicroStatus,
} from '@/lib/micros';
import { useAppStore } from '@/store/app-store';
import { Radius, Space, useColors, type Colors } from '@/theme/colors';

import { AppText, Card, type IconName } from './ui';

const STATUS_ICON: Record<MicroStatus, IconName> = {
  good: 'checkmark-circle',
  low: 'alert-circle',
  veryLow: 'close-circle',
};

const statusColor = (c: Colors, s: MicroStatus) =>
  s === 'good' ? c.statusGood : s === 'low' ? c.statusLow : c.statusVeryLow;

/** One meter per vitamin/mineral. Status is shown by icon + word, color is only a helper. */
export function MicroMeters({
  totals,
  targets,
}: {
  totals: Record<DisplayMicro, number>;
  targets: Record<DisplayMicro, number>;
}) {
  const { t } = useTranslation();
  const c = useColors();
  const language = useAppStore((s) => s.language);

  return (
    <View style={styles.list}>
      {DISPLAY_MICROS.map((m) => {
        const pct = targets[m] ? totals[m] / targets[m] : 0;
        const status = microStatus(pct);
        const color = statusColor(c, status);
        const amount = totals[m] >= 10 ? Math.round(totals[m]) : Math.round(totals[m] * 10) / 10;
        return (
          <View
            key={m}
            style={styles.row}
            accessible
            accessibilityLabel={`${t(`micro.${m}`)}: ${Math.round(pct * 100)}%, ${t(`track.status.${status}`)}`}>
            <View style={styles.rowTop}>
              <AppText variant="label" style={styles.flex}>
                {t(`micro.${m}`)}
              </AppText>
              <AppText variant="caption" color="textSecondary">
                {formatNumber(amount, language, 1)} / {formatNumber(targets[m], language, 1)} {MICRO_UNIT[m]}
              </AppText>
            </View>
            <View style={styles.rowBottom}>
              <View style={[styles.track, { backgroundColor: color + '2E' }]}>
                <View style={[styles.fill, { width: `${Math.min(1, pct) * 100}%`, backgroundColor: color }]} />
              </View>
              <View style={styles.status}>
                <Ionicons name={STATUS_ICON[status]} size={16} color={color} />
                <AppText variant="caption" style={styles.statusText}>
                  {Math.round(pct * 100)}% · {t(`track.status.${status}`)}
                </AppText>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** "Iron is low — good sources: lentils, beef, spinach." */
export function GapTips({ gaps, compact = false }: { gaps: MicroGap[]; compact?: boolean }) {
  const { t } = useTranslation();
  const c = useColors();
  const language = useAppStore((s) => s.language);
  const vegan = useAppStore((s) => s.prefs.diet === 'vegan');

  if (gaps.length === 0) {
    return compact ? null : (
      <AppText variant="caption" color="textSecondary">
        {t('track.allGood')}
      </AppText>
    );
  }

  return (
    <Card style={[styles.tips, { backgroundColor: c.woodSoft, borderColor: c.woodSoft }]}>
      <View style={styles.tipHeader}>
        <Ionicons name="bulb-outline" size={18} color={c.wood} />
        <AppText variant="label" color="wood">
          {t('track.tipTitle')}
        </AppText>
      </View>
      {gaps.map((g) => (
        <AppText key={g.micro} variant="caption">
          {g.micro === 'vitaminD'
            ? t('track.vitaminD')
            : g.micro === 'vitaminB12' && vegan
              ? t('track.b12Vegan')
              : t('track.tipLow', {
                nutrient: t(`micro.${g.micro}`),
                foods: g.foods.map((id) => foodName(id, language).toLowerCase()).join(', '),
              })}
        </AppText>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: Space.md },
  row: { gap: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', gap: Space.sm },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  track: { flex: 1, height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 116 },
  statusText: { fontWeight: '600' },
  tips: { gap: Space.xs },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: Space.xs },
});
