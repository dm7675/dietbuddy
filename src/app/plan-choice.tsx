import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Notice, Screen, type IconName } from '@/components/ui';
import { formatDate, formatNumber } from '@/lib/format';
import {
  MIN_CALORIES,
  buildPlanOptions,
  goalType,
  healthyWeightRange,
  profileWarnings,
  tdee,
  type Pace,
  type PlanOption,
} from '@/lib/nutrition';
import { useAppStore } from '@/store/app-store';
import { Radius, Space, useColors } from '@/theme/colors';

const PACE_ICON: Record<Pace, IconName> = {
  slow: 'leaf-outline',
  moderate: 'walk-outline',
  fast: 'flash-outline',
  maintain: 'scale-outline',
};

export default function PlanChoice() {
  const { t } = useTranslation();
  const { profile, pace: savedPace, setPace, language } = useAppStore();

  const options = useMemo(() => (profile ? buildPlanOptions(profile) : []), [profile]);
  const [selected, setSelected] = useState<Pace>(
    savedPace && options.some((o) => o.pace === savedPace) ? savedPace : (options.length > 1 ? 'moderate' : options[0]?.pace) ?? 'maintain',
  );

  if (!profile) return <Redirect href="/onboarding" />;

  const goal = goalType(profile);
  const kgDiff = formatNumber(Math.abs(profile.goalWeightKg - profile.weightKg), language, 1);
  const warnings = profileWarnings(profile);

  const start = () => {
    setPace(selected);
    router.replace('/');
  };

  return (
    <Screen footer={<Button title={t('plans.start')} onPress={start} icon="arrow-forward" />}>
      <View style={styles.headerText}>
        <AppText variant="title">{t('plans.title')}</AppText>
        <AppText color="textSecondary">{t(`plans.subtitle.${goal}`, { kg: kgDiff })}</AppText>
        <AppText variant="caption" color="textSecondary">
          {t('plans.maintenance', { kcal: formatNumber(tdee(profile), language) })}
        </AppText>
      </View>

      {warnings.map((w) => (
        <Notice
          key={w}
          text={t(`warnings.${w}`, { min: healthyWeightRange(profile.heightCm).min })}
        />
      ))}

      <View style={styles.cards}>
        {options.map((o) => (
          <PlanCard
            key={o.pace}
            option={o}
            selected={selected === o.pace}
            recommended={o.pace === 'moderate'}
            onPress={() => setSelected(o.pace)}
            floorKcal={MIN_CALORIES[profile.gender]}
          />
        ))}
      </View>

      <AppText variant="caption" color="textSecondary" style={styles.disclaimer}>
        {t('warnings.disclaimer')}
      </AppText>
    </Screen>
  );
}

function PlanCard({
  option: o,
  selected,
  recommended,
  onPress,
  floorKcal,
}: {
  option: PlanOption;
  selected: boolean;
  recommended: boolean;
  onPress: () => void;
  floorKcal: number;
}) {
  const { t } = useTranslation();
  const c = useColors();
  const language = useAppStore((s) => s.language);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: selected ? c.primarySoft : c.card,
          borderColor: selected ? c.primary : c.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}>
      <View style={styles.cardTop}>
        <View style={[styles.iconBubble, { backgroundColor: c.woodSoft }]}>
          <Ionicons name={PACE_ICON[o.pace]} size={22} color={c.wood} />
        </View>
        <AppText variant="heading" style={styles.flex}>
          {t(`plans.pace.${o.pace}`)}
        </AppText>
        {recommended ? (
          <View style={[styles.badge, { backgroundColor: c.wood }]}>
            <AppText variant="caption" color="woodTextActive">
              {t('plans.recommended')}
            </AppText>
          </View>
        ) : null}
        <Ionicons
          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
          size={26}
          color={selected ? c.primary : c.border}
        />
      </View>

      <View style={styles.kcalRow}>
        <AppText variant="big" color="primaryDark">
          {formatNumber(o.calories, language)}
        </AppText>
        <AppText variant="label" color="textSecondary">
          {t('plans.perDay')}
        </AppText>
      </View>

      {o.goal !== 'maintain' && (
        <>
          <AppText variant="label">
            {t(o.goal === 'lose' ? 'plans.perWeekLose' : 'plans.perWeekGain', {
              kg: formatNumber(o.weeklyKg, language, 2),
            })}
          </AppText>
          {o.goalDate ? (
            <View style={styles.dateRow}>
              <Ionicons name="flag-outline" size={18} color={c.wood} />
              <AppText variant="label" color="textSecondary">
                {t('plans.goalDate')}
              </AppText>
              <AppText variant="heading">{formatDate(o.goalDate, language)}</AppText>
              <AppText variant="caption" color="textSecondary">
                ({t('plans.weeks', { n: o.weeks })})
              </AppText>
            </View>
          ) : (
            <AppText variant="caption" color="warning">
              {t('plans.noDate')}
            </AppText>
          )}
          {o.limitedByFloor && (
            <AppText variant="caption" color="warning">
              {t('plans.floorWarning', { kcal: formatNumber(floorKcal, language) })}
            </AppText>
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerText: { gap: Space.xs },
  cards: { gap: Space.md },
  card: { borderWidth: 2, borderRadius: Radius.lg, padding: Space.md, gap: Space.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Space.sm },
  iconBubble: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: Space.sm, paddingVertical: 2, borderRadius: Radius.pill },
  kcalRow: { flexDirection: 'row', alignItems: 'baseline', gap: Space.sm },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: Space.xs, flexWrap: 'wrap' },
  disclaimer: { textAlign: 'center' },
});
