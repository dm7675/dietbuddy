import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Space, useColors, type Colors } from '@/theme/colors';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/* ---------- Text ---------- */

type TextVariant = 'title' | 'heading' | 'body' | 'label' | 'caption' | 'big';

export function AppText({
  variant = 'body',
  color,
  style,
  ...rest
}: TextProps & { variant?: TextVariant; color?: keyof Colors | (string & {}) }) {
  const c = useColors();
  const resolved = color ? ((c as Record<string, string>)[color] ?? color) : c.text;
  return <Text style={[textStyles[variant], { color: resolved }, style]} {...rest} />;
}

const textStyles = StyleSheet.create({
  big: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.3, lineHeight: 34 },
  heading: { fontSize: 18, fontWeight: '700', lineHeight: 24 },
  body: { fontSize: 16, fontWeight: '500', lineHeight: 22 },
  label: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  caption: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
});

/* ---------- Layout ---------- */

/** Scrollable page with safe-area padding and the app background. */
export function Screen({
  children,
  scroll = true,
  footer,
  bottomInset = 0,
}: {
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
  /** Extra space at the bottom, e.g. for the tab bar. */
  bottomInset?: number;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const content = (
    <View style={[styles.screenContent, { paddingTop: insets.top + Space.md }]}>{children}</View>
  );
  return (
    <View style={[styles.flex, { backgroundColor: c.background }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: bottomInset + Space.xl }}
          keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        <View style={styles.flex}>{content}</View>
      )}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + Space.md }]}>{footer}</View>
      ) : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, style]}>{children}</View>
  );
}

/* ---------- Buttons ---------- */

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  icon,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  icon?: IconName;
}) {
  const c = useColors();
  const bg = { primary: c.primary, secondary: c.woodSoft, ghost: 'transparent', danger: 'transparent' }[variant];
  const fg = { primary: c.textOnPrimary, secondary: c.wood, ghost: c.primaryDark, danger: c.danger }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
      ]}>
      {icon ? <Ionicons name={icon} size={20} color={fg} /> : null}
      <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

/** Big selectable row used in onboarding questions. */
export function OptionButton({
  title,
  subtitle,
  selected,
  onPress,
  leading,
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  leading?: ReactNode;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: selected ? c.primarySoft : c.card,
          borderColor: selected ? c.primary : c.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      {leading}
      <View style={styles.flex}>
        <AppText variant="heading">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" color="textSecondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={26}
        color={selected ? c.primary : c.border}
      />
    </Pressable>
  );
}

/** Small toggle pill used for multi-select (allergies, eaten, swap). */
export function Chip({
  label,
  selected,
  onPress,
  icon,
  tone = 'primary',
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
  tone?: 'primary' | 'wood' | 'danger';
}) {
  const c = useColors();
  const accent = { primary: c.primary, wood: c.wood, danger: c.danger }[tone];
  // Wood and danger fills are dark in both themes, so they keep white text.
  const onFill = tone === 'primary' ? c.textOnPrimary : '#FFFFFF';
  const fg = selected ? onFill : accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: accent, backgroundColor: selected ? accent : 'transparent', opacity: pressed ? 0.75 : 1 },
      ]}>
      {icon ? <Ionicons name={icon} size={16} color={fg} /> : null}
      <Text style={[styles.chipText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

/* ---------- Inputs ---------- */

/** Number field with − / + buttons and a unit label. Keeps a text draft so typing feels natural. */
export function NumberStepper({
  value,
  onChange,
  unit,
  step = 1,
  min,
  max,
}: {
  value: string;
  onChange: (text: string) => void;
  unit: string;
  step?: number;
  min: number;
  max: number;
}) {
  const c = useColors();
  const num = parseDecimal(value);
  const bump = (dir: 1 | -1) => {
    const base = Number.isFinite(num) ? num : min;
    const next = Math.min(max, Math.max(min, Math.round((base + dir * step) * 10) / 10));
    onChange(String(next));
  };
  return (
    <View style={styles.stepper}>
      <StepButton icon="remove" onPress={() => bump(-1)} />
      <View style={[styles.stepperField, { backgroundColor: c.card, borderColor: c.border }]}>
        <TextInput
          value={value}
          onChangeText={(t) => onChange(t.replace(/[^0-9.,]/g, ''))}
          keyboardType="decimal-pad"
          style={[styles.stepperInput, { color: c.text }]}
          maxLength={5}
          selectTextOnFocus
        />
        <AppText variant="heading" color="textSecondary">
          {unit}
        </AppText>
      </View>
      <StepButton icon="add" onPress={() => bump(1)} />
    </View>
  );
}

function StepButton({ icon, onPress }: { icon: IconName; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.stepButton, { backgroundColor: c.woodSoft, opacity: pressed ? 0.7 : 1 }]}>
      <Ionicons name={icon} size={28} color={c.wood} />
    </Pressable>
  );
}

/** Accepts both "72.5" and Croatian "72,5". */
export function parseDecimal(text: string): number {
  return parseFloat(text.replace(',', '.'));
}

/* ---------- Feedback ---------- */

export function ProgressBar({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  const c = useColors();
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={{ height, borderRadius: height, backgroundColor: c.border, overflow: 'hidden' }}>
      <View style={{ width: `${pct}%`, height: '100%', borderRadius: height, backgroundColor: color ?? c.primary }} />
    </View>
  );
}

export function Notice({ text, tone = 'warning' }: { text: string; tone?: 'warning' | 'info' }) {
  const c = useColors();
  const bg = tone === 'warning' ? c.warningSoft : c.primarySoft;
  const fg = tone === 'warning' ? c.warning : c.primaryDark;
  return (
    <View style={[styles.notice, { backgroundColor: bg }]}>
      <Ionicons name={tone === 'warning' ? 'alert-circle' : 'information-circle'} size={20} color={fg} />
      <AppText variant="caption" style={styles.flex}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screenContent: { paddingHorizontal: Space.md, gap: Space.md, width: '100%', maxWidth: 640, alignSelf: 'center' },
  footer: { paddingHorizontal: Space.md, paddingTop: Space.sm, width: '100%', maxWidth: 640, alignSelf: 'center' },
  card: { borderRadius: Radius.lg, borderWidth: 1, padding: Space.md, gap: Space.sm },
  button: {
    minHeight: 54,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm,
  },
  buttonText: { fontSize: 17, fontWeight: '700' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { fontSize: 14, fontWeight: '700' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    padding: Space.md,
    borderRadius: Radius.md,
    borderWidth: 2,
    minHeight: 64,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Space.md, justifyContent: 'center' },
  stepButton: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  stepperField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.xs,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Space.md,
    height: 76,
    flexShrink: 1,
    justifyContent: 'center',
  },
  // Fixed width: on web a TextInput otherwise defaults to ~20 characters wide.
  stepperInput: { fontSize: 38, fontWeight: '800', textAlign: 'center', width: 112, padding: 0 },
  notice: { flexDirection: 'row', gap: Space.sm, padding: Space.md, borderRadius: Radius.md, alignItems: 'flex-start' },
});
