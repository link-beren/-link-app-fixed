/**
 * Weight-goal engine (spec 11.1 and 11.3). Reuses the weekly-rate and
 * alternative-date helpers already built for Judo's weigh-in card
 * (`weigh-in.ts`) instead of duplicating that math.
 */
export { daysRemaining, isAggressiveRate, requiredWeeklyRateKg, suggestAlternativeDate } from '@/lib/calculations/weigh-in';

const KCAL_PER_KG = 7700;
const MAX_DAILY_DEFICIT_FRACTION_OF_EXPENDITURE = 0.2;

export const MINOR_SAFETY_DISCLAIMER = 'במיוחד מתחת לגיל 18, כדאי לקבוע יעד כזה יחד עם הורה ואיש מקצוע מוסמך.';

export function weightToLoseKg(currentWeightKg: number, targetWeightKg: number): number {
  return currentWeightKg - targetWeightKg;
}

export function isWeightGainGoal(currentWeightKg: number, targetWeightKg: number): boolean {
  return targetWeightKg > currentWeightKg;
}

export function requiredWeeklyDeficitKcal(weeklyRateKg: number): number {
  return weeklyRateKg * KCAL_PER_KG;
}

export function requiredDailyDeficitKcal(weeklyDeficitKcal: number): number {
  return weeklyDeficitKcal / 7;
}

export function targetDailyCalories(baselineDailyExpenditureKcal: number, dailyDeficitKcal: number): number {
  return baselineDailyExpenditureKcal - dailyDeficitKcal;
}

/** Spec 11.3: warn if the daily deficit exceeds 20% of estimated daily expenditure. */
export function isDeficitTooLarge(dailyDeficitKcal: number, baselineDailyExpenditureKcal: number): boolean {
  if (baselineDailyExpenditureKcal <= 0) return false;
  return dailyDeficitKcal > MAX_DAILY_DEFICIT_FRACTION_OF_EXPENDITURE * baselineDailyExpenditureKcal;
}

/** Spec 11.3: warn if the resulting calorie target would fall below estimated BMR. */
export function isBelowBmr(targetDailyCaloriesKcal: number, bmr: number): boolean {
  return targetDailyCaloriesKcal < bmr;
}
