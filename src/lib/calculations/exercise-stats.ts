import type { ExerciseGoal, ExerciseMetricType, StrengthResult } from '@/types';

export type OneRmFormula = 'epley' | 'brzycki';

/** Product default: everywhere except "time" a higher number is better. */
export function isLowerBetter(metricType: ExerciseMetricType): boolean {
  return metricType === 'time';
}

const UNIT_LABELS: Record<ExerciseMetricType, string> = {
  weight: 'ק"ג',
  reps: 'חזרות',
  time: 'שניות',
  distance: 'מטר',
  score: 'נקודות',
};

export function metricUnitLabel(metricType: ExerciseMetricType): string {
  return UNIT_LABELS[metricType];
}

/** The comparable number for a result, depending on the exercise's metric type. */
export function resultValue(
  result: StrengthResult,
  metricType: ExerciseMetricType,
  formula: OneRmFormula,
): number | null {
  if (metricType === 'weight') {
    const estimate = formula === 'epley' ? result.estimatedOneRmEpley : result.estimatedOneRmBrzycki;
    return estimate ?? null;
  }
  return result.value ?? null;
}

/** Current RM1 (weight exercises) or best logged value (other metric types). */
export function currentBestValue(
  results: StrengthResult[],
  metricType: ExerciseMetricType,
  formula: OneRmFormula,
): number | null {
  const values = results
    .map((result) => resultValue(result, metricType, formula))
    .filter((value): value is number => value !== null);
  if (values.length === 0) return null;
  return isLowerBetter(metricType) ? Math.min(...values) : Math.max(...values);
}

/** True 1-rep max: the heaviest single-rep set ever logged (weight exercises only). */
export function trueOneRepMax(results: StrengthResult[]): number | null {
  const singleReps = results.filter((result) => result.reps === 1 && result.weightKg != null).map((result) => result.weightKg!);
  if (singleReps.length === 0) return null;
  return Math.max(...singleReps);
}

export interface GoalGap {
  diff: number;
  percentOfTarget: number;
}

export function goalGap(currentValue: number, targetValue: number, metricType: ExerciseMetricType): GoalGap {
  const diff = isLowerBetter(metricType) ? currentValue - targetValue : targetValue - currentValue;
  const percentOfTarget = targetValue !== 0 ? (currentValue / targetValue) * 100 : 0;
  return { diff, percentOfTarget };
}

export function isGoalAchieved(currentValue: number, targetValue: number, metricType: ExerciseMetricType): boolean {
  return isLowerBetter(metricType) ? currentValue <= targetValue : currentValue >= targetValue;
}

/**
 * The goal shown as "current" on the exercise detail screen: the most
 * recently created goal that hasn't been achieved yet, so a user can define a
 * new goal without losing the previous one (spec 8.4).
 */
export function selectActiveGoal(goals: ExerciseGoal[]): ExerciseGoal | undefined {
  const byNewest = [...goals].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return byNewest.find((goal) => !goal.achievedAt) ?? byNewest[0];
}
