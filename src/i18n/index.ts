import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en';
import hr from './hr';

export type Language = 'en' | 'hr';
export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hr', label: 'Hrvatski', flag: '🇭🇷' },
];

export function deviceLanguage(): Language {
  const code = getLocales()[0]?.languageCode;
  // Croatian, plus close neighbours (Bosnian, Serbian) default to Croatian.
  return code === 'hr' || code === 'bs' || code === 'sr' ? 'hr' : 'en';
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hr: { translation: hr } },
  lng: deviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
