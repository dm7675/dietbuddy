import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, OptionButton, Screen } from '@/components/ui';
import { TAB_BAR_HEIGHT } from '@/components/wood-tab-bar';
import { useCurrentPlan } from '@/hooks/use-plan';
import { LANGUAGES } from '@/i18n';
import { formatMoney, formatNumber } from '@/lib/format';
import { chainName } from '@/lib/prices';
import { useAppStore, useDaysStore } from '@/store/app-store';
import { Space, useColors } from '@/theme/colors';

export default function Me() {
  const { t } = useTranslation();
  const c = useColors();
  const { language, setLanguage, resetAll, prefs, city, stores, budget } = useAppStore();
  const resetDays = useDaysStore((s) => s.resetDays);
  const current = useCurrentPlan();
  if (!current) return null;

  const { profile, plan, targets } = current;
  const fmt = (n: number, d = 0) => formatNumber(n, language, d);

  const confirmReset = () => {
    const doReset = () => {
      resetAll();
      resetDays();
      router.replace('/onboarding');
    };
    // Alert buttons don't work on web, so fall back to the browser dialog there.
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(t('me.resetConfirm'))) doReset();
      return;
    }
    Alert.alert(t('me.reset'), t('me.resetConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('me.reset'), style: 'destructive', onPress: doReset },
    ]);
  };

  return (
    <Screen bottomInset={TAB_BAR_HEIGHT}>
      <AppText variant="title">{profile.name || t('me.title')}</AppText>

      <Card>
        <AppText variant="heading">{t('me.yourPlan')}</AppText>
        <Row label={t(`plans.pace.${plan.pace}`)} value={`${fmt(plan.calories)} kcal`} strong />
        <Row label={t('me.goalWeight')} value={`${fmt(profile.goalWeightKg, 1)} kg`} />
        <Button title={t('me.changePlan')} variant="secondary" onPress={() => router.push('/plan-choice')} />
      </Card>

      <Card>
        <AppText variant="heading">{t('me.targets')}</AppText>
        <Row label={t('today.protein')} value={`${targets.proteinG} g`} dot={c.protein} />
        <Row label={t('today.carbs')} value={`${targets.carbsG} g`} dot={c.carbs} />
        <Row label={t('today.fat')} value={`${targets.fatG} g`} dot={c.fat} />
        <Row label={t('today.fiber')} value={`${targets.fiberG} g`} />
        <Row label={t('today.water')} value={`${fmt(targets.waterMl / 1000, 1)} L`} />
      </Card>

      <Card>
        <AppText variant="heading">{t('me.body')}</AppText>
        <Row label={t('me.weight')} value={`${fmt(profile.weightKg, 1)} kg`} />
        <Row label={t('me.bmr')} value={`${fmt(current.bmr)} kcal`} />
        <Row label={t('me.tdee')} value={`${fmt(current.tdee)} kcal`} />
        <Row label={t(`activity.${profile.activity}.label`)} value="" />
        <Button title={t('me.editProfile')} variant="secondary" onPress={() => router.push('/onboarding')} />
      </Card>

      <Card>
        <AppText variant="heading">{t('me.foodPrefs')}</AppText>
        <Row label={t('prefs.dietTitle')} value={t(`prefs.diet.${prefs.diet}`)} />
        <Row
          label={t('prefs.allergiesTitle')}
          value={prefs.allergies.length ? prefs.allergies.map((a) => t(`prefs.allergen.${a}`)).join(', ') : '—'}
        />
        <Row label={t('prefs.dislikesTitle')} value={String(prefs.dislikes.length)} />
        <Button title={t('me.editPrefs')} variant="secondary" onPress={() => router.push('/preferences')} />
      </Card>

      <Card>
        <AppText variant="heading">{t('shop.title')}</AppText>
        <Row label={t('shop.city')} value={city ?? t('shop.noCity')} />
        <Row label={t('shop.stores')} value={stores.length ? stores.map(chainName).join(', ') : '—'} />
        <Row
          label={t('shop.budget')}
          value={budget ? `${formatMoney(budget.amount, language)} · ${t(budget.mode === 'daily' ? 'shop.daily' : 'shop.weekly')}` : t('shop.noBudget')}
        />
        <Button title={t('shop.title')} variant="secondary" icon="cart-outline" onPress={() => router.push('/shopping-settings')} />
      </Card>

      <Card>
        <AppText variant="heading">{t('me.language')}</AppText>
        {LANGUAGES.map((l) => (
          <OptionButton
            key={l.code}
            title={`${l.flag}  ${l.label}`}
            selected={language === l.code}
            onPress={() => setLanguage(l.code)}
          />
        ))}
      </Card>

      <AppText variant="caption" color="textSecondary" style={styles.center}>
        {t('me.dataNote')}
      </AppText>
      <Button title={t('me.reset')} variant="danger" icon="trash-outline" onPress={confirmReset} />
    </Screen>
  );
}

function Row({ label, value, strong, dot }: { label: string; value: string; strong?: boolean; dot?: string }) {
  return (
    <View style={styles.row}>
      {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
      <AppText variant={strong ? 'heading' : 'body'} color={strong ? 'text' : 'textSecondary'} style={styles.flex}>
        {label}
      </AppText>
      <AppText variant={strong ? 'heading' : 'label'}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, paddingVertical: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
