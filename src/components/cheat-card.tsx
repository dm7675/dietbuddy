import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { DayPlan } from '@/hooks/use-day-plan';
import { useCurrentPlan } from '@/hooks/use-plan';
import { BALANCE_DAYS, canCheat, cheatExtra, targetsForDate } from '@/lib/cheat';
import { dateKey, parseDateKey, shiftDateKey } from '@/lib/dates';
import { formatDate, formatNumber } from '@/lib/format';
import { useAppStore, useDaysStore } from '@/store/app-store';
import { useUiStore } from '@/store/ui-store';
import { Space, useColors } from '@/theme/colors';

import { AppText, Button, Card } from './ui';

/** Cheat day controls for one day: the button, the cheat-day banner, or the balancing note. */
export function CheatCard({ day }: { day: DayPlan }) {
  const { t } = useTranslation();
  const c = useColors();
  const language = useAppStore((s) => s.language);
  const pace = useAppStore((s) => s.pace);
  const profile = useAppStore((s) => s.profile);
  const days = useDaysStore((s) => s.days);
  const setCheat = useDaysStore((s) => s.setCheat);
  const current = useCurrentPlan();
  const celebrate = useUiStore((s) => s.celebrate);

  if (!pace || !profile || !current) return null;
  const today = dateKey();
  const isToday = day.date === today;
  const fmt = (n: number) => formatNumber(Math.round(n), language);

  /* ---------- Balancing note on the days after a cheat day ---------- */
  if (!day.cheat && day.trim > 0) {
    return (
      <Card style={[styles.row, { backgroundColor: c.woodSoft, borderColor: c.woodSoft }]}>
        <Ionicons name="swap-vertical" size={20} color={c.wood} />
        <AppText variant="caption" style={styles.flex}>
          {t('cheat.balancing', { kcal: fmt(day.trim) })}
        </AppText>
      </Card>
    );
  }

  /* ---------- It is a cheat day ---------- */
  if (day.cheat) {
    const extra = cheatExtra(current.targets, current.tdee);
    // How much of the extra the next days actually absorb (the safe minimum can limit it).
    const withCheat = { ...days, [day.date]: { ...days[day.date], cheat: true } };
    const trims = Array.from(
      { length: BALANCE_DAYS },
      (_, k) => targetsForDate(shiftDateKey(day.date, k + 1), withCheat, profile, current.targets, current.tdee).trim,
    );
    const balanced = trims.reduce((s, x) => s + x, 0);
    const deficit = current.tdee - current.targets.calories;
    const delayDays = deficit > 0 ? Math.round((extra - balanced) / deficit) : 0;

    return (
      <Card style={{ backgroundColor: c.primarySoft, borderColor: c.primary }}>
        <AppText variant="title">{t('cheat.title')}</AppText>
        <AppText>{t('cheat.text')}</AppText>
        {extra > 0 ? (
          <>
            <AppText variant="label">
              {t('cheat.upTo', { kcal: fmt(day.targets.calories), protein: day.targets.proteinG })}
            </AppText>
            <AppText variant="caption" color="textSecondary">
              {balanced > 0 ? t('cheat.balanced', { days: trims.filter((x) => x > 0).length, kcal: fmt(trims[0]) }) : t('cheat.atMinimum')}
              {delayDays > 0 ? ` ${t('cheat.delay', { count: delayDays })}` : ''}
            </AppText>
          </>
        ) : (
          <AppText variant="caption" color="textSecondary">
            {t('cheat.sameCalories')}
          </AppText>
        )}
        <Button title={t('cheat.cancel')} variant="ghost" icon="close" onPress={() => setCheat(day.date, false)} />
      </Card>
    );
  }

  /* ---------- Offer a cheat day (today or the coming week only) ---------- */
  if (day.date < today) return null;
  const check = canCheat(day.date, days, pace);
  let nextDate: string | null = null;
  if (!check.ok) {
    for (let k = 1; k <= 28 && !nextDate; k++) {
      const d = shiftDateKey(day.date, k);
      if (canCheat(d, days, pace).ok) nextDate = d;
    }
  }

  return (
    <View style={styles.offer}>
      <Button
        title={t('cheat.make', { day: isToday ? t('cheat.today') : t('cheat.thisDay') })}
        variant="secondary"
        disabled={!check.ok}
        onPress={() => {
          setCheat(day.date, true);
          celebrate();
        }}
      />
      <AppText variant="caption" color="textSecondary" style={styles.center}>
        {t(`cheat.rule.${pace}`)}
        {nextDate ? ` ${t('cheat.next', { date: formatDate(parseDateKey(nextDate), language) })}` : ''}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  offer: { gap: Space.xs },
});
