import { useColorScheme } from 'react-native';

import { dateKey } from '@/lib/dates';
import { useDaysStore } from '@/store/app-store';

// Style A "Fresh green" + wooden brown accents (navigation bar, highlights).
const light = {
  background: '#F5F7F1',
  card: '#FFFFFF',
  border: '#E3E8DE',
  text: '#1F2A22',
  textSecondary: '#5E6B61',
  textOnPrimary: '#FFFFFF',

  primary: '#4E9A5C',
  primaryDark: '#3B7A47',
  primarySoft: '#E2F0E3',

  wood: '#8A5A36',
  woodDark: '#6B4428',
  woodGrain: '#7A4E2E',
  woodText: '#F3E3CF',
  woodTextActive: '#FFFFFF',
  woodSoft: '#F3E8DA',

  protein: '#C0703A',
  carbs: '#D9A441',
  fat: '#7FA36B',

  warning: '#C9822B',
  warningSoft: '#FBEEDC',
  danger: '#C2523C',

  // Status colors for nutrient meters — always shown with an icon + word, never alone.
  // Checked with the dataviz palette validator (CVD + contrast) on the card surface.
  statusGood: '#4E9A5C',
  statusLow: '#C79A1E',
  statusVeryLow: '#C24A3A',

  // Charts
  chart: '#4E9A5C',
  chartMuted: '#8A958C',
  grid: '#E6EAE3',
};

const dark: typeof light = {
  background: '#111612',
  card: '#1B221D',
  border: '#2A332C',
  text: '#ECF1EA',
  textSecondary: '#A2AEA4',
  // Dark text on the lighter dark-mode accents keeps buttons readable.
  textOnPrimary: '#0F1A12',

  primary: '#66BB76',
  primaryDark: '#4E9A5C',
  primarySoft: '#21362A',

  wood: '#5C3D27',
  woodDark: '#452D1C',
  woodGrain: '#523621',
  woodText: '#D9C2A6',
  woodTextActive: '#FFFFFF',
  woodSoft: '#2E241B',

  protein: '#D9875A',
  carbs: '#E2B65E',
  fat: '#93B980',

  warning: '#E0A04F',
  warningSoft: '#3A2D1C',
  danger: '#E07A63',

  statusGood: '#4F9E5E',
  statusLow: '#D2A833',
  statusVeryLow: '#E35C48',

  chart: '#66BB76',
  chartMuted: '#7E8A80',
  grid: '#2A332C',
};

export type Colors = typeof light;

// Cheat day mood: warm orange instead of green, for the whole app on that day.
const cheatLight: Colors = {
  ...light,
  background: '#FFF4EC',
  primary: '#CC5A22',
  primaryDark: '#B04A17',
  primarySoft: '#FCE3D3',
  chart: '#CC5A22',
};
const cheatDark: Colors = {
  ...dark,
  background: '#1A1310',
  primary: '#EE8A55',
  primaryDark: '#E2703A',
  primarySoft: '#3B2519',
  chart: '#EE8A55',
};

export function useColors(): Colors {
  const scheme = useColorScheme();
  const cheatToday = useDaysStore((s) => !!s.days[dateKey()]?.cheat);
  if (cheatToday) return scheme === 'dark' ? cheatDark : cheatLight;
  return scheme === 'dark' ? dark : light;
}

export const Radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
export const Space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
