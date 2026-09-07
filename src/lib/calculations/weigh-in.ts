/**
 * Small, self-contained subset of the weight-safety rules (spec 11.3) needed
 * for the Judo "weigh-in mode" card. The full weight-goal engine (BMR,
 * calorie deficits, full warning set) is built in the Workouts+Weight stage;
 * this only covers the weekly-rate check and alternative-date suggestion that
 * a competition weigh-in card needs on its own.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CONSERVATIVE_MAX_WEEKLY_RATE_FRACTION = 0.005; // 0.5% of bodyweight per week

export function daysRemaining(fromDate: Date, toDate: Date): number {
  return Math.ceil((toDate.getTime() - fromDate.getTime()) / MS_PER_DAY);
}

/**
 * Required weekly rate of change to go from currentWeightKg to
 * targetWeightKg by targetDate. Positive = needs to lose weight per week,
 * negative = needs to gain. Null if the target date has already passed.
 */
export function requiredWeeklyRateKg(currentWeightKg: number, targetWeightKg: number, days: number): number | null {
  if (days <= 0) return null;
  const weeksAvailable = days / 7;
  return (currentWeightKg - targetWeightKg) / weeksAvailable;
}

/** Spec 11.3: warn if the requested pace exceeds 0.5% of bodyweight per week. */
export function isAggressiveRate(weeklyRateKg: number, currentWeightKg: number): boolean {
  if (currentWeightKg <= 0) return false;
  return Math.abs(weeklyRateKg) > CONSERVATIVE_MAX_WEEKLY_RATE_FRACTION * currentWeightKg;
}

/**
 * Spec 11.3 alternative-date suggestion: compute the max conservative weekly
 * rate, the weeks needed at that rate, and round up to a full week.
 */
export function suggestAlternativeDate(fromDate: Date, currentWeightKg: number, targetWeightKg: number): Date {
  const maxWeeklyRate = CONSERVATIVE_MAX_WEEKLY_RATE_FRACTION * currentWeightKg;
  const weightToChange = Math.abs(currentWeightKg - targetWeightKg);
  const weeksNeeded = maxWeeklyRate > 0 ? Math.ceil(weightToChange / maxWeeklyRate) : 0;
  const suggested = new Date(fromDate);
  suggested.setDate(suggested.getDate() + weeksNeeded * 7);
  return suggested;
}
