// Spec 11.9: daily and weekly nutrition summaries, plus the forecast rule for
// days that haven't happened yet.
export type DayStatus = 'complete' | 'partial' | 'future';

export interface DaySummaryInput {
  status: DayStatus;
  kcalEaten: number;
  proteinEaten: number;
  // Actual (past/partial days) or plan-derived (future days) expenditure —
  // callers should compute this via effectiveDailyNetExerciseKcal + the
  // baseline (BMR × activity factor), which already branches on past vs.
  // today vs. future per spec 10.2.
  estimatedExpenditureKcal: number;
}

export interface DailyNutritionSummary {
  kcalEaten: number;
  proteinEaten: number;
  proteinTargetGrams: number;
  estimatedExpenditureKcal: number;
  estimatedBalanceKcal: number;
}

export function proteinTargetGrams(currentWeightKg: number, proteinGramsPerKg: number): number {
  return currentWeightKg * proteinGramsPerKg;
}

export function computeDailySummary(
  day: Pick<DaySummaryInput, 'kcalEaten' | 'proteinEaten' | 'estimatedExpenditureKcal'>,
  currentWeightKg: number,
  proteinGramsPerKg: number,
): DailyNutritionSummary {
  return {
    kcalEaten: day.kcalEaten,
    proteinEaten: day.proteinEaten,
    proteinTargetGrams: proteinTargetGrams(currentWeightKg, proteinGramsPerKg),
    estimatedExpenditureKcal: day.estimatedExpenditureKcal,
    estimatedBalanceKcal: day.kcalEaten - day.estimatedExpenditureKcal,
  };
}

export type WeeklyStatus = 'on-track' | 'slightly-behind' | 'far-from-target' | 'not-enough-data';

export interface WeeklySummaryParams {
  /** Exactly the 7 days of the week being summarized, in chronological order. */
  weekDays: DaySummaryInput[];
  /**
   * The most recent complete days available, used only to forecast
   * consumption on this week's future days. May reach back before this
   * week started (e.g. early in a new week there aren't 7 complete days
   * yet within the week itself).
   */
  trailingCompleteDays: DaySummaryInput[];
  /** Null when there is no active weight goal. */
  weeklyDeficitTargetKcal: number | null;
}

export interface WeeklyNutritionSummary {
  weeklyDeficitTargetKcal: number | null;
  cumulativeDeficitSoFarKcal: number;
  kcalRemainingInWeeklyBudgetKcal: number | null;
  avgKcalPerDaySoFar: number | null;
  avgProteinPerDaySoFar: number | null;
  forecastEndOfWeekDeficitKcal: number | null;
  hasReliableForecast: boolean;
  status: WeeklyStatus;
}

const MIN_COMPLETE_DAYS_FOR_FORECAST = 3;
const MAX_TRAILING_DAYS_FOR_FORECAST = 7;
const ON_TRACK_RATIO = 0.9;
const SLIGHTLY_BEHIND_RATIO = 0.5;

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function computeWeeklyStatus(
  weeklyDeficitTargetKcal: number | null,
  forecastEndOfWeekDeficitKcal: number | null,
): WeeklyStatus {
  if (weeklyDeficitTargetKcal === null || forecastEndOfWeekDeficitKcal === null) return 'not-enough-data';
  if (weeklyDeficitTargetKcal <= 0) return forecastEndOfWeekDeficitKcal >= 0 ? 'on-track' : 'far-from-target';

  const ratio = forecastEndOfWeekDeficitKcal / weeklyDeficitTargetKcal;
  if (ratio >= ON_TRACK_RATIO) return 'on-track';
  if (ratio >= SLIGHTLY_BEHIND_RATIO) return 'slightly-behind';
  return 'far-from-target';
}

export function computeWeeklySummary({
  weekDays,
  trailingCompleteDays,
  weeklyDeficitTargetKcal,
}: WeeklySummaryParams): WeeklyNutritionSummary {
  const knownDays = weekDays.filter((day) => day.status !== 'future');
  const futureDays = weekDays.filter((day) => day.status === 'future');

  const cumulativeDeficitSoFarKcal = knownDays.reduce(
    (sum, day) => sum + (day.estimatedExpenditureKcal - day.kcalEaten),
    0,
  );

  const avgKcalPerDaySoFar = knownDays.length > 0 ? average(knownDays.map((day) => day.kcalEaten)) : null;
  const avgProteinPerDaySoFar = knownDays.length > 0 ? average(knownDays.map((day) => day.proteinEaten)) : null;

  const trailingWindow = trailingCompleteDays.slice(-MAX_TRAILING_DAYS_FOR_FORECAST);
  const hasReliableForecast = trailingWindow.length >= MIN_COMPLETE_DAYS_FOR_FORECAST;
  const trailingAvgKcalPerDay = average(trailingWindow.map((day) => day.kcalEaten));

  const forecastedFutureDeficitKcal = futureDays.reduce(
    (sum, day) => sum + (day.estimatedExpenditureKcal - trailingAvgKcalPerDay),
    0,
  );
  const forecastEndOfWeekDeficitKcal =
    hasReliableForecast && weeklyDeficitTargetKcal !== null
      ? cumulativeDeficitSoFarKcal + forecastedFutureDeficitKcal
      : null;

  const weeklyExpenditureTotalKcal = weekDays.reduce((sum, day) => sum + day.estimatedExpenditureKcal, 0);
  const kcalEatenSoFar = knownDays.reduce((sum, day) => sum + day.kcalEaten, 0);
  const kcalRemainingInWeeklyBudgetKcal =
    weeklyDeficitTargetKcal !== null ? weeklyExpenditureTotalKcal - weeklyDeficitTargetKcal - kcalEatenSoFar : null;

  return {
    weeklyDeficitTargetKcal,
    cumulativeDeficitSoFarKcal,
    kcalRemainingInWeeklyBudgetKcal,
    avgKcalPerDaySoFar,
    avgProteinPerDaySoFar,
    forecastEndOfWeekDeficitKcal,
    hasReliableForecast,
    status: computeWeeklyStatus(weeklyDeficitTargetKcal, forecastEndOfWeekDeficitKcal),
  };
}
