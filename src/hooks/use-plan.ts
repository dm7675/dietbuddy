import { useMemo } from 'react';

import { buildPlanOptions, nutritionTargets, tdee, bmr } from '@/lib/nutrition';
import { useAppStore } from '@/store/app-store';

/** The user's chosen plan and daily targets, recomputed from the saved profile. */
export function useCurrentPlan() {
  const profile = useAppStore((s) => s.profile);
  const pace = useAppStore((s) => s.pace);

  return useMemo(() => {
    if (!profile || !pace) return null;
    const options = buildPlanOptions(profile);
    const plan = options.find((o) => o.pace === pace) ?? options[0];
    return {
      profile,
      plan,
      targets: nutritionTargets(profile, plan.calories),
      bmr: bmr(profile),
      tdee: tdee(profile),
    };
  }, [profile, pace]);
}
