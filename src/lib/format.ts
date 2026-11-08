import type { Language } from '@/i18n';

const LOCALE: Record<Language, string> = { en: 'en-GB', hr: 'hr-HR' };

/** 1750 → "1,750" (en) / "1.750" (hr); 0.45 → "0.45" / "0,45". */
export function formatNumber(n: number, lang: Language, decimals = 0): string {
  try {
    return new Intl.NumberFormat(LOCALE[lang], {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    }).format(n);
  } catch {
    const s = n.toFixed(decimals);
    return lang === 'hr' ? s.replace('.', ',') : s;
  }
}

/** €7.40 (en) / 7,40 € (hr). */
export function formatMoney(n: number, lang: Language): string {
  try {
    // Whole amounts (budgets like €70) without decimals; prices with cents.
    const digits = Number.isInteger(n) ? 0 : 2;
    return new Intl.NumberFormat(LOCALE[lang], {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(n);
  } catch {
    return lang === 'hr' ? `${n.toFixed(2).replace('.', ',')} €` : `€${n.toFixed(2)}`;
  }
}

export const capitalizeFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "12 Mar 2027" / "12. ožu 2027." */
export function formatDate(d: Date, lang: Language): string {
  try {
    return new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function formatLongDate(d: Date, lang: Language): string {
  try {
    return new Intl.DateTimeFormat(LOCALE[lang], { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
  } catch {
    return d.toDateString();
  }
}
