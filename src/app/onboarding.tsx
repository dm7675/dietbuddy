import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useCanGoBack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { DietForm } from '@/components/diet-form';
import { AppText, Button, NumberStepper, OptionButton, ProgressBar, Screen, parseDecimal } from '@/components/ui';
import { LANGUAGES } from '@/i18n';
import { formatNumber } from '@/lib/format';
import {
  ACTIVITY_LEVELS,
  LIMITS,
  bmi,
  healthyWeightRange,
  type ActivityLevel,
  type Gender,
} from '@/lib/nutrition';
import { useAppStore } from '@/store/app-store';
import { Radius, Space, useColors } from '@/theme/colors';

const STEPS = ['language', 'name', 'gender', 'age', 'height', 'weight', 'activity', 'goal', 'food'] as const;
type Step = (typeof STEPS)[number];

/** One question per screen. Pre-fills from the saved profile when editing. */
export default function Onboarding() {
  const { t } = useTranslation();
  const c = useColors();
  const { language, setLanguage, profile, setProfile, prefs, setPrefs } = useAppStore();

  const canGoBack = useCanGoBack();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile?.name ?? '');
  const [gender, setGender] = useState<Gender | null>(profile?.gender ?? null);
  const [age, setAge] = useState(String(profile?.age ?? 30));
  const [height, setHeight] = useState(String(profile?.heightCm ?? 170));
  const [weight, setWeight] = useState(String(profile?.weightKg ?? 75));
  const [activity, setActivity] = useState<ActivityLevel | null>(profile?.activity ?? null);
  const [goal, setGoal] = useState(String(profile?.goalWeightKg ?? profile?.weightKg ?? 70));

  const current: Step = STEPS[step];
  const n = { age: parseDecimal(age), height: parseDecimal(height), weight: parseDecimal(weight), goal: parseDecimal(goal) };
  const inRange = (v: number, r: { min: number; max: number }) => Number.isFinite(v) && v >= r.min && v <= r.max;

  const valid: Record<Step, boolean> = {
    language: true,
    name: true,
    gender: gender !== null,
    age: inRange(n.age, LIMITS.age),
    height: inRange(n.height, LIMITS.heightCm),
    weight: inRange(n.weight, LIMITS.weightKg),
    activity: activity !== null,
    goal: inRange(n.goal, LIMITS.weightKg),
    food: true,
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    setProfile({
      name: name.trim(),
      gender: gender!,
      age: Math.round(n.age),
      heightCm: Math.round(n.height),
      weightKg: Math.round(n.weight * 10) / 10,
      goalWeightKg: Math.round(n.goal * 10) / 10,
      activity: activity!,
    });
    router.replace('/plan-choice');
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
    else if (canGoBack) router.back();
  };

  const rangeError = (r: { min: number; max: number }) => (
    <AppText variant="caption" color="danger" style={styles.center}>
      {t('onboarding.invalid', { min: r.min, max: r.max })}
    </AppText>
  );

  return (
    <Screen
      footer={
        <Button
          title={step === STEPS.length - 1 ? t('onboarding.finish') : t('common.next')}
          onPress={next}
          disabled={!valid[current]}
        />
      }>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={back}
          hitSlop={12}
          style={{ opacity: step > 0 || canGoBack ? 1 : 0 }}>
          <Ionicons name="chevron-back" size={28} color={c.wood} />
        </Pressable>
        <View style={styles.flex}>
          <ProgressBar value={(step + 1) / STEPS.length} color={c.wood} />
        </View>
        <AppText variant="caption" color="textSecondary">
          {t('onboarding.stepOf', { current: step + 1, total: STEPS.length })}
        </AppText>
      </View>

      {current === 'language' && (
        <Question title={t('onboarding.language.title')} subtitle={t('onboarding.language.subtitle')}>
          {LANGUAGES.map((l) => (
            <OptionButton
              key={l.code}
              title={l.label}
              selected={language === l.code}
              onPress={() => setLanguage(l.code)}
              leading={<AppText style={styles.flag}>{l.flag}</AppText>}
            />
          ))}
        </Question>
      )}

      {current === 'name' && (
        <Question title={t('onboarding.name.title')} subtitle={t('onboarding.name.subtitle')}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('onboarding.name.placeholder')}
            placeholderTextColor={c.textSecondary}
            autoFocus
            maxLength={30}
            onSubmitEditing={next}
            style={[styles.textInput, { color: c.text, backgroundColor: c.card, borderColor: c.border }]}
          />
        </Question>
      )}

      {current === 'gender' && (
        <Question title={t('onboarding.gender.title')} subtitle={t('onboarding.gender.subtitle')}>
          {(['male', 'female'] as const).map((g) => (
            <OptionButton
              key={g}
              title={t(`onboarding.gender.${g}`)}
              selected={gender === g}
              onPress={() => setGender(g)}
              leading={<Ionicons name={g === 'male' ? 'male' : 'female'} size={26} color={c.wood} />}
            />
          ))}
        </Question>
      )}

      {current === 'age' && (
        <Question title={t('onboarding.age.title')}>
          <NumberStepper value={age} onChange={setAge} unit={t('common.years')} {...LIMITS.age} />
          {!valid.age && rangeError(LIMITS.age)}
        </Question>
      )}

      {current === 'height' && (
        <Question title={t('onboarding.height.title')}>
          <NumberStepper value={height} onChange={setHeight} unit={t('common.cm')} {...LIMITS.heightCm} />
          {!valid.height && rangeError(LIMITS.heightCm)}
        </Question>
      )}

      {current === 'weight' && (
        <Question title={t('onboarding.weight.title')}>
          <NumberStepper value={weight} onChange={setWeight} unit={t('common.kg')} step={0.5} {...LIMITS.weightKg} />
          {!valid.weight && rangeError(LIMITS.weightKg)}
        </Question>
      )}

      {current === 'activity' && (
        <Question title={t('onboarding.activity.title')} subtitle={t('onboarding.activity.subtitle')}>
          {ACTIVITY_LEVELS.map((a) => (
            <OptionButton
              key={a}
              title={t(`activity.${a}.label`)}
              subtitle={t(`activity.${a}.desc`)}
              selected={activity === a}
              onPress={() => setActivity(a)}
            />
          ))}
        </Question>
      )}

      {current === 'goal' && (
        <Question title={t('onboarding.goal.title')}>
          <NumberStepper value={goal} onChange={setGoal} unit={t('common.kg')} step={0.5} {...LIMITS.weightKg} />
          {!valid.goal && rangeError(LIMITS.weightKg)}
          <View style={[styles.hint, { backgroundColor: c.woodSoft }]}>
            <AppText variant="label" color="wood" style={styles.center}>
              {t('onboarding.goal.healthyRange', healthyWeightRange(n.height))}
            </AppText>
            <AppText variant="caption" color="textSecondary" style={styles.center}>
              {t('onboarding.goal.currentBmi', { bmi: formatNumber(bmi(n.weight, n.height), language, 1) })}
            </AppText>
          </View>
        </Question>
      )}
      {current === 'food' && (
        <Question title={t('onboarding.food.title')} subtitle={t('onboarding.food.subtitle')}>
          <DietForm prefs={prefs} onChange={setPrefs} />
        </Question>
      )}
    </Screen>
  );
}

function Question({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={styles.question}>
      <View style={styles.questionText}>
        <AppText variant="title">{title}</AppText>
        {subtitle ? <AppText color="textSecondary">{subtitle}</AppText> : null}
      </View>
      <View style={styles.answers}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  question: { gap: Space.lg, marginTop: Space.lg },
  questionText: { gap: Space.xs },
  answers: { gap: Space.sm },
  flag: { fontSize: 28 },
  textInput: {
    fontSize: 22,
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Space.md,
    height: 60,
  },
  hint: { borderRadius: Radius.md, padding: Space.md, gap: 2, marginTop: Space.md },
});
