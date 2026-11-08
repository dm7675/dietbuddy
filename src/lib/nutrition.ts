// Core calorie & macro calculations. Pure functions, no React â€” easy to test.

export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive';
export type GoalType = 'lose' | 'maintain' | 'gain';
export type Pace = 'slow' | 'moderate' | 'fast' | 'maintain';

export interface Profile {
  name: string;
  gender: Gender;
  age: number;
  heightCm: number;
  weightKg: number;
  goalWeightKg: number;
  activity: ActivityLevel;
}

export const ACTIVITY_LEVELS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'veryActive'];

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
};

/** Roughly how many kcal are stored in 1 kg of body fat. */
export const KCAL_PER_KG = 7700;

/** Never plan below these daily calories. */
export const MIN_CALORIES: Record<Gender, number> = { female: 1200, male: 1500 };

/** Daily kcal deficit (lose) or surplus (gain) for each pace. */
const PACE_KCAL: Record<'lose' | 'gain', Record<'slow' | 'moderate' | 'fast', number>> = {
  lose: { slow: 250, moderate: 500, fast: 750 },
  gain: { slow: 150, moderate: 300, fast: 450 },
};

/** Within this many kg of the goal we treat the goal as "maintain". */
const MAINTAIN_TOLERANCE_KG = 1;

export const LIMITS = {
  age: { min: 14, max: 100 },
  heightCm: { min: 120, max: 230 },
  weightKg: { min: 35, max: 300 },
} as const;

const round = (n: number, step = 1) => Math.round(n / step) * step;

/** Basal metabolic rate â€” Mifflin-St Jeor equation. */
export function bmr(p: Pick<Profile, 'gender' | 'age' | 'heightCm' | 'weightKg'>): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return Math.round(p.gender === 'male' ? base + 5 : base - 161);
}

/** Total daily energy expenditure â€” calories burned per day including activity. */
export function tdee(p: Profile): number {
  return round(bmr(p) * ACTIVITY_FACTORS[p.activity], 10);
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

/** Weight range for a BMI of 18.5â€“24.9 at this height. */
export function healthyWeightRange(heightCm: number): { min: number; max: number } {
  const m2 = (heightCm / 100) ** 2;
  return { min: Math.ceil(18.5 * m2), max: Math.floor(24.9 * m2) };
}

export function goalType(p: Pick<Profile, 'weightKg' | 'goalWeightKg'>): GoalType {
  const diff = p.goalWeightKg - p.weightKg;
  if (Math.abs(diff) <= MAINTAIN_TOLERANCE_KG) return 'maintain';
  return diff < 0 ? 'lose' : 'gain';
}

export interface PlanOption {
  pace: Pace;
  goal: GoalType;
  /** Daily calorie target. */
  calories: number;
  /** Expected weight change per week in kg (always positive). */
  weeklyKg: number;
  /** Weeks to reach the goal, or null when this pace can't get there. */
  weeks: number | null;
  goalDate: Date | null;
  /** True when the safe calorie minimum made the plan gentler than requested. */
  limitedByFloor: boolean;
}

export function buildPlanOptions(p: Profile, today: Date = new Date()): PlanOption[] {
  const maintenance = tdee(p);
  const goal = goalType(p);

  if (goal === 'maintain') {
    return [
      { pace: 'maintain', goal, calories: maintenance, weeklyKg: 0, weeks: null, goalDate: null, limitedByFloor: false },
    ];
  }

  const floor = MIN_CALORIES[p.gender];
  const kgToGo = Math.abs(p.goalWeightKg - p.weightKg);

  return (['slow', 'moderate', 'fast'] as const).map((pace) => {
    const requested = PACE_KCAL[goal][pace];
    let calories: number;
    let limitedByFloor = false;

    if (goal === 'lose') {
      calories = maintenance - requested;
      if (calories < floor) {
        calories = floor;
        limitedByFloor = true;
      }
    } else {
      calories = maintenance + requested;
    }
    calories = round(calories, 10);

    const dailyChange = Math.abs(calories - maintenance);
    const weeklyKg = Math.round(((dailyChange * 7) / KCAL_PER_KG) * 100) / 100;
    const weeks = weeklyKg > 0 ? Math.ceil(kgToGo / weeklyKg) : null;
    const goalDate = weeks === null ? null : addDays(today, weeks * 7);

    return { pace, goal, calories, weeklyKg, weeks, goalDate, limitedByFloor };
  });
}

export interface NutritionTargets {
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fiberG: number;
  waterMl: number;
}

const PROTEIN_PER_KG: Record<GoalType, number> = { lose: 1.8, maintain: 1.6, gain: 1.8 };

export function nutritionTargets(p: Profile, calories: number): NutritionTargets {
  const goal = goalType(p);
  // For higher body weights, base protein on a BMI-27 weight so targets stay realistic.
  const refWeight = Math.min(p.weightKg, 27 * (p.heightCm / 100) ** 2);

  // Protein capped at 35% of calories so low-calorie plans stay balanced.
  const proteinG = Math.round(Math.min(refWeight * PROTEIN_PER_KG[goal], (calories * 0.35) / 4));
  const fatG = Math.round(Math.max((calories * 0.27) / 9, refWeight * 0.6));
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));
  const fiberG = Math.max(25, Math.round((calories / 1000) * 14));
  const waterMl = round(p.weightKg * 35, 100);

  return { calories, proteinG, fatG, carbsG, fiberG, waterMl };
}

export type WarningCode = 'under18' | 'goalUnderweight';

export function profileWarnings(p: Profile): WarningCode[] {
  const w: WarningCode[] = [];
  if (p.age < 18) w.push('under18');
  if (p.goalWeightKg < healthyWeightRange(p.heightCm).min) w.push('goalUnderweight');
  return w;
}

export function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}
