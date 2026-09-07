import { describe, expect, it } from 'vitest';
import {
  computeDailySummary,
  computeWeeklySummary,
  proteinTargetGrams,
  type DaySummaryInput,
} from '@/lib/calculations/nutrition-summary';

function day(status: DaySummaryInput['status'], kcalEaten: number, proteinEaten: number, estimatedExpenditureKcal: number): DaySummaryInput {
  return { status, kcalEaten, proteinEaten, estimatedExpenditureKcal };
}

describe('proteinTargetGrams', () => {
  it('multiplies current weight by the profile protein-per-kg setting', () => {
    expect(proteinTargetGrams(82, 1.8)).toBeCloseTo(147.6);
  });
});

describe('computeDailySummary', () => {
  it('computes an estimated balance as eaten minus expenditure', () => {
    const summary = computeDailySummary({ kcalEaten: 1800, proteinEaten: 120, estimatedExpenditureKcal: 2200 }, 82, 1.8);
    expect(summary.proteinTargetGrams).toBeCloseTo(147.6);
    expect(summary.estimatedBalanceKcal).toBe(1800 - 2200);
  });
});

describe('computeWeeklySummary', () => {
  it('reports not-enough-data when there is no active weight goal', () => {
    const weekDays = Array.from({ length: 7 }, () => day('complete', 2000, 130, 2200));
    const summary = computeWeeklySummary({ weekDays, trailingCompleteDays: weekDays, weeklyDeficitTargetKcal: null });
    expect(summary.status).toBe('not-enough-data');
    expect(summary.forecastEndOfWeekDeficitKcal).toBeNull();
    expect(summary.kcalRemainingInWeeklyBudgetKcal).toBeNull();
  });

  it('reports not-enough-data when fewer than 3 complete trailing days exist, even with an active goal', () => {
    const weekDays = [day('complete', 2000, 130, 2200), day('partial', 500, 30, 2200), ...Array(5).fill(day('future', 0, 0, 2200))];
    const summary = computeWeeklySummary({
      weekDays,
      trailingCompleteDays: [day('complete', 2000, 130, 2200)],
      weeklyDeficitTargetKcal: 3850,
    });
    expect(summary.hasReliableForecast).toBe(false);
    expect(summary.status).toBe('not-enough-data');
    expect(summary.forecastEndOfWeekDeficitKcal).toBeNull();
  });

  it('computes cumulative deficit so far from complete and partial days only, ignoring future days', () => {
    const weekDays = [
      day('complete', 1800, 130, 2200), // +400 deficit
      day('complete', 2000, 130, 2200), // +200 deficit
      day('partial', 500, 30, 2200), // +1700 deficit (partial day, real so far)
      ...Array(4).fill(day('future', 0, 0, 2200)),
    ];
    const summary = computeWeeklySummary({
      weekDays,
      trailingCompleteDays: Array(4).fill(day('complete', 1900, 130, 2200)),
      weeklyDeficitTargetKcal: 3850,
    });
    expect(summary.cumulativeDeficitSoFarKcal).toBe(400 + 200 + 1700);
  });

  it('forecasts future-day consumption from the trailing complete-day average, and flags on-track when the forecast meets the target', () => {
    // 3 trailing complete days averaging 1700 kcal eaten against a 2200 kcal expenditure -> 500/day deficit.
    const trailingCompleteDays = [
      day('complete', 1600, 120, 2200),
      day('complete', 1700, 120, 2200),
      day('complete', 1800, 120, 2200),
    ];
    const weekDays = [
      ...trailingCompleteDays,
      ...Array(4).fill(day('future', 0, 0, 2200)),
    ];
    const summary = computeWeeklySummary({ weekDays, trailingCompleteDays, weeklyDeficitTargetKcal: 3500 });

    expect(summary.hasReliableForecast).toBe(true);
    // 3 known days: (2200-1600)+(2200-1700)+(2200-1800) = 600+500+400 = 1500
    // 4 future days forecast at 2200 - 1700(avg) = 500 each = 2000
    expect(summary.forecastEndOfWeekDeficitKcal).toBe(1500 + 2000);
    expect(summary.status).toBe('on-track'); // 3500/3500 = 1.0 >= 0.9
  });

  it('flags slightly-behind and far-from-target at the documented ratio thresholds', () => {
    const trailingCompleteDays = Array(3).fill(day('complete', 2200, 120, 2200)); // 0 deficit/day
    const makeWeek = (futureExpenditure: number) => [
      ...trailingCompleteDays,
      ...Array(4).fill(day('future', 0, 0, futureExpenditure)),
    ];

    // Future days contribute their full expenditure as deficit (0 forecast consumption offset... wait trailing avg is 2200, so future deficit = expenditure - 2200)
    const slightlyBehind = computeWeeklySummary({
      weekDays: makeWeek(2200 + 250), // deficit of 250/day * 4 = 1000, target 2000 -> ratio 0.5
      trailingCompleteDays,
      weeklyDeficitTargetKcal: 2000,
    });
    expect(slightlyBehind.status).toBe('slightly-behind');

    const farFromTarget = computeWeeklySummary({
      weekDays: makeWeek(2200 + 50), // deficit of 50/day * 4 = 200, target 2000 -> ratio 0.1
      trailingCompleteDays,
      weeklyDeficitTargetKcal: 2000,
    });
    expect(farFromTarget.status).toBe('far-from-target');
  });

  it('computes average kcal/protein per day from known (complete+partial) days only', () => {
    const weekDays = [
      day('complete', 2000, 140, 2200),
      day('complete', 1800, 130, 2200),
      ...Array(5).fill(day('future', 0, 0, 2200)),
    ];
    const summary = computeWeeklySummary({ weekDays, trailingCompleteDays: weekDays.slice(0, 2), weeklyDeficitTargetKcal: null });
    expect(summary.avgKcalPerDaySoFar).toBe(1900);
    expect(summary.avgProteinPerDaySoFar).toBe(135);
  });

  it('treats a non-positive weekly deficit target as trivially on-track when the forecast is non-negative', () => {
    const trailingCompleteDays = Array(3).fill(day('complete', 2200, 120, 2200));
    const weekDays = [...trailingCompleteDays, ...Array(4).fill(day('future', 0, 0, 2200))];
    const summary = computeWeeklySummary({ weekDays, trailingCompleteDays, weeklyDeficitTargetKcal: 0 });
    expect(summary.status).toBe('on-track');
  });
});
