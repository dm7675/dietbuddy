import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Space, useColors } from '@/theme/colors';

import { AppText, Card, Screen, type IconName } from './ui';
import { TAB_BAR_HEIGHT } from './wood-tab-bar';

/** Placeholder for tabs that arrive in later parts. */
export function ComingSoon({ section, icon }: { section: 'plan' | 'scan' | 'track'; icon: IconName }) {
  const { t } = useTranslation();
  const c = useColors();
  return (
    <Screen bottomInset={TAB_BAR_HEIGHT}>
      <AppText variant="title">{t(`placeholder.${section}.title`)}</AppText>
      <Card style={styles.card}>
        <View style={[styles.icon, { backgroundColor: c.woodSoft }]}>
          <Ionicons name={icon} size={40} color={c.wood} />
        </View>
        <AppText variant="heading">{t('common.comingSoon')}</AppText>
        <AppText color="textSecondary" style={styles.text}>
          {t(`placeholder.${section}.text`)}
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', paddingVertical: Space.xl, gap: Space.md },
  icon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  text: { textAlign: 'center' },
});
