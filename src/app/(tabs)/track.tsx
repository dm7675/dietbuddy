import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { WeekBars, WeightLine, type BarDatum } from '@/components/charts';
import { GapTips, MicroMeters } from '@/components/nutrient-panels';
import { AppText, Button, Card, Chip, NumberStepper, Notice, ProgressBar, Screen, parseDecimal } from '@/components/ui';
import { TAB_BAR_HEIGHT } from '@/components/wood-tab-bar';
import { useDayPlan } from '@/hooks/use-day-plan';
import { useCurrentPlan } from '@/hooks/use-plan';
import { dateKey, parseDateKey, shiftDateKey } from '@/lib/dates';
import { capitalizeFirst, formatDate, formatLongDate, formatNumber } from '@/lib/format';
import { MEAL_SLOTS, sumNutrients, type MealItem } from '@/lib/meal-generator';
import { microGaps } from '@/lib/micros';
import { LIMITS, goalType } from '@/lib/nutrition';
import { useAppStore, useDaysStore, type DayLog } from '@/store/app-store';
import { Radius, Space, useColors } from '@/theme/colors';

function eatenItems(log: DayLog | undefined): MealItem[] {
  if (!log) return [];
  return [...(log.extras ?? []), ...MEAL_SLOTS.flatMap((s) => log.eaten[s]?.items ?? [])];
}

export default function Track() {
  const { t } = useTranslation();
  const c = useColors();
  const language = useAppStore((s) => s.language);
  const prefs = useAppStore((s) => s.prefs);
  const today = dateKey();
  const [date, setDate] = useState(today);
  const [mode, setMode] = useState<'eaten' | 'planned' | null>(null);
  const day = useDayPlan(date);
  if (!day) return null;

  // Default to "Eaten" once something is eaten that day, otherwise show the plan.
  const view = mode ?? (day.hasEaten ? 'eaten' : 'planned');
  const totals = view === 'eaten' ? day.eatenTotals : day.planned;
  const micros = view === 'eaten' ? day.eatenMicros : day.plannedMicros;
  const gaps = view === 'eaten' ? microGaps(day.eatenMicros, day.microTargets, prefs) : day.plannedGaps;
  const title = date === today ? t('track.today') : capitalizeFirst(formatLongDate(parseDateKey(date), language));

  return (
    <Screen bottomInset={TAB_BAR_HEIGHT}>
      <AppText variant="title">{t('track.title')}</AppText>

      <View style={styles.dayNav}>
        <NavButton icon="chevron-back" label={t('track.prevDay')} onPress={() => setDate(shiftDateKey(date, -1))} />
        <AppText variant="heading" style={styles.dayTitle}>
          {title}
        </AppText>
        <NavButton
          icon="chevron-forward"
          label={t('track.nextDay')}
          onPress={() => setDate(shiftDateKey(date, 1))}
          disabled={date >= shiftDateKey(today, 6)}
        />
      </View>

      <View style={styles.toggle}>
        <Chip label={t('track.eaten')} selected={view === 'eaten'} onPress={() => setMode('eaten')} />
        <Chip label={t('track.planned')} selected={view === 'planned'} onPress={() => setMode('planned')} />
      </View>
      {view === 'eaten' && !day.hasEaten ? <Notice tone="info" text={t('track.nothingEaten')} /> : null}

      <Card>
        <AppText variant="heading">{t('track.caloriesMacros')}</AppText>
        <MacroRow label="kcal" value={totals.kcal} target={day.targets.calories} color={c.chart} unit="" />
        <MacroRow label={t('today.protein')} value={totals.protein} target={day.targets.proteinG} color={c.protein} />
        <MacroRow label={t('today.carbs')} value={totals.carbs} target={day.targets.carbsG} color={c.carbs} />
        <MacroRow label={t('today.fat')} value={totals.fat} target={day.targets.fatG} color={c.fat} />
        <MacroRow label={t('today.fiber')} value={totals.fiber} target={day.targets.fiberG} color={c.primaryDark} />
        <MacroRow label={t('water.title')} value={day.waterMl} target={day.targets.waterMl} color="#3A86C8" unit="ml" />
      </Card>

      <Card style={styles.gapMd}>
        <View>
          <AppText variant="heading">{t('track.vitamins')}</AppText>
          <AppText variant="caption" color="textSecondary">
            {view === 'eaten' ? t('track.vitaminsSubEaten') : t('track.vitaminsSubPlanned')}
          </AppText>
        </View>
        <MicroMeters totals={micros} targets={day.microTargets} />
        <GapTips gaps={gaps} />
      </Card>

      <WeekCard />
      <WeightCard />
    </Screen>
  );
}

function NavButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: 'chevron-back' | 'chevron-forward';
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={[styles.navButton, { backgroundColor: c.woodSoft, opacity: disabled ? 0.35 : 1 }]}>
      <Ionicons name={icon} size={22} color={c.wood} />
    </Pressable>
  );
}

function MacroRow({
  label,
  value,
  target,
  color,
  unit = 'g',
}: {
  label: string;
  value: number;
  target: number;
  color: string;
  unit?: string;
}) {
  const language = useAppStore((s) => s.language);
  return (
    <View style={styles.macro}>
      <View style={styles.macroLabel}>
        <AppText variant="label">{label}</AppText>
        <AppText variant="caption" color="textSecondary">
          {formatNumber(Math.round(value), language)} / {formatNumber(target, language)} {unit}
        </AppText>
      </View>
      <ProgressBar value={target ? value / target : 0} color={color} />
    </View>
  );
}

/* ---------- Last 7 days ---------- */

function WeekCard() {
  const { t } = useTranslation();
  const language = useAppStore((s) => s.language);
  const days = useDaysStore((s) => s.days);
  const current = useCurrentPlan();
  const today = dateKey();

  const data: BarDatum[] = useMemo(() => {
    const weekday = new Intl.DateTimeFormat(language === 'hr' ? 'hr-HR' : 'en-GB', { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => {
      const key = shiftDateKey(today, i - 6);
      const items = eatenItems(days[key]);
      const kcal = items.length ? sumNutrients(items).kcal : null;
      const d = parseDateKey(key);
      return {
        label: capitalizeFirst(weekday.format(d)).replace('.', ''),
        value: kcal,
        highlight: key === today,
        detail: `${formatDate(d, language)}: ${kcal === null ? '—' : `${formatNumber(Math.round(kcal), language)} kcal`}`,
      };
    });
  }, [days, language, today]);

  if (!current) return null;
  const anyData = data.some((d) => d.value !== null);

  return (
    <Card>
      <AppText variant="heading">{t('track.week')}</AppText>
      <AppText variant="caption" color="textSecondary">
        {anyData ? `${t('track.weekSub')} ${t('track.tapBar')}` : t('track.weekEmpty')}
      </AppText>
      <WeekBars
        data={data}
        target={current.targets.calories}
        targetLabel={`${t('track.target')} ${formatNumber(current.targets.calories, language)}`}
        formatTick={(n) => formatNumber(n, language)}
      />
    </Card>
  );
}

/* ---------- Weight ---------- */

function WeightCard() {
  const { t } = useTranslation();
  const c = useColors();
  const { language, weights, logWeight, deleteWeight, switchToMaintain, profile, pace } = useAppStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(profile?.weightKg ?? 70));
  if (!profile) return null;

  const entries = Object.entries(weights)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, kg]) => ({ date, kg }));
  const points = entries.map((e) => ({
    date: parseDateKey(e.date),
    kg: e.kg,
    detail: `${formatDate(parseDateKey(e.date), language)}: ${formatNumber(e.kg, language, 1)} kg`,
  }));

  const goal = goalType(profile);
  // Within 1 kg of the goal while still on a lose/gain plan.
  const reached = pace !== 'maintain' && goal === 'maintain';
  const kgToGo = Math.abs(profile.goalWeightKg - profile.weightKg);
  const draftKg = parseDecimal(draft);
  const draftValid = Number.isFinite(draftKg) && draftKg >= LIMITS.weightKg.min && draftKg <= LIMITS.weightKg.max;

  const save = () => {
    if (!draftValid) return;
    logWeight(dateKey(), Math.round(draftKg * 10) / 10);
    setEditing(false);
  };

  return (
    <Card style={styles.gapMd}>
      <View style={styles.weightHeader}>
        <View style={styles.flex}>
          <AppText variant="heading">{t('track.weight')}</AppText>
          <AppText variant="caption" color="textSecondary">
            {t('track.weightSub')}
          </AppText>
        </View>
        {goal !== 'maintain' && (
          <View style={[styles.badge, { backgroundColor: c.primarySoft }]}>
            <AppText variant="caption" color="primaryDark" style={styles.bold}>
              {t('track.toGo', { kg: formatNumber(kgToGo, language, 1) })}
            </AppText>
          </View>
        )}
      </View>

      {reached ? (
        <View style={[styles.reached, { backgroundColor: c.primarySoft }]}>
          <AppText variant="heading">{t('track.goalReached')}</AppText>
          <AppText variant="caption" color="textSecondary">
            {t('track.goalReachedSub')}
          </AppText>
          <Button title={t('track.keepWeight')} onPress={switchToMaintain} />
        </View>
      ) : null}

      <WeightLine
        points={points}
        goal={profile.goalWeightKg}
        goalLabel={t('track.goalLine', { kg: formatNumber(profile.goalWeightKg, language, 1) })}
        formatKg={(n) => formatNumber(n, language, 1)}
        formatDate={(d) => formatDate(d, language)}
      />
      {points.length < 2 ? (
        <AppText variant="caption" color="textSecondary">
          {t('track.oneEntry')}
        </AppText>
      ) : null}

      {editing ? (
        <View style={styles.gapMd}>
          <NumberStepper value={draft} onChange={setDraft} unit="kg" step={0.1} {...LIMITS.weightKg} />
          <Button title={t('track.saveWeight')} onPress={save} disabled={!draftValid} />
        </View>
      ) : (
        <Button
          title={t('track.logWeight')}
          variant="secondary"
          icon="scale-outline"
          onPress={() => {
            setDraft(String(profile.weightKg));
            setEditing(true);
          }}
        />
      )}

      {/* Table view of the chart data. */}
      <View>
        <AppText variant="label" color="textSecondary">
          {t('track.entries')}
        </AppText>
        {entries
          .slice(-5)
          .reverse()
          .map((e) => (
            <View key={e.date} style={[styles.entry, { borderBottomColor: c.border }]}>
              <AppText variant="caption" style={styles.flex}>
                {formatDate(parseDateKey(e.date), language)}
              </AppText>
              <AppText variant="label">{formatNumber(e.kg, language, 1)} kg</AppText>
              {entries.length > 1 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('track.delete')}
                  hitSlop={10}
                  onPress={() => deleteWeight(e.date)}>
                  <Ionicons name="trash-outline" size={18} color={c.textSecondary} />
                </Pressable>
              ) : null}
            </View>
          ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  gapMd: { gap: Space.md },
  dayNav: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  dayTitle: { flex: 1, textAlign: 'center' },
  navButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  toggle: { flexDirection: 'row', gap: Space.sm, justifyContent: 'center' },
  macro: { gap: 4 },
  macroLabel: { flexDirection: 'row', justifyContent: 'space-between' },
  weightHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm },
  badge: { paddingHorizontal: Space.sm, paddingVertical: 4, borderRadius: Radius.pill },
  reached: { padding: Space.md, borderRadius: Radius.md, gap: Space.sm },
  entry: { flexDirection: 'row', alignItems: 'center', gap: Space.md, paddingVertical: 8, borderBottomWidth: 1 },
});
