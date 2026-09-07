import { describe, expect, it } from 'vitest';
import {
  MINOR_SAFETY_DISCLAIMER,
  daysRemaining,
  isAggressiveRate,
  isBelowBmr,
  isDeficitTooLarge,
  isWeightGainGoal,
  requiredDailyDeficitKcal,
  requiredWeeklyDeficitKcal,
  requiredWeeklyRateKg,
  suggestAlternativeDate,
  targetDailyCalories,
  weightToLoseKg,
} from '@/lib/calculations/weight-goal';

describe('weightToLoseKg', () => {
  it('returns a positive number for a loss goal', () => {
    expect(weightToLoseKg(80, 75)).toBe(5);
  });

  it('returns a negative number for a gain goal', () => {
    expect(weightToLoseKg(70, 75)).toBe(-5);
  });
});

describe('isWeightGainGoal', () => {
  it('is true when the target is above the current weight', () => {
    expect(isWeightGainGoal(70, 75)).toBe(true);
  });

  it('is false when the target is below or equal to the current weight', () => {
    expect(isWeightGainGoal(80, 75)).toBe(false);
    expect(isWeightGainGoal(75, 75)).toBe(false);
  });
});

describe('requiredWeeklyDeficitKcal / requiredDailyDeficitKcal', () => {
  it('converts a weekly kg rate into kcal using the 7700 kcal/kg constant', () => {
    expect(requiredWeeklyDeficitKcal(0.5)).toBeCloseTo(3850);
  });

  it('divides the weekly deficit evenly across 7 days', () => {
    expect(requiredDailyDeficitKcal(3850)).toBeCloseTo(550);
  });
});

describe('targetDailyCalories', () => {
  it('subtracts the daily deficit from baseline expenditure', () => {
    expect(targetDailyCalories(2500, 550)).toBe(1950);
  });
});

describe('isDeficitTooLarge', () => {
  it('warns when the deficit exceeds 20% of baseline expenditure', () => {
    expect(isDeficitTooLarge(600, 2500)).toBe(true);
  });

  it('does not warn at or below 20% of baseline expenditure', () => {
    expect(isDeficitTooLarge(500, 2500)).toBe(false);
  });

  it('never warns when baseline expenditure is zero or negative', () => {
    expect(isDeficitTooLarge(100, 0)).toBe(false);
    expect(isDeficitTooLarge(100, -10)).toBe(false);
  });
});

describe('isBelowBmr', () => {
  it('warns when the target calories fall below BMR', () => {
    expect(isBelowBmr(1300, 1400)).toBe(true);
  });

  it('does not warn when the target calories are at or above BMR', () => {
    expect(isBelowBmr(1400, 1400)).toBe(false);
    expect(isBelowBmr(1500, 1400)).toBe(false);
  });
});

describe('MINOR_SAFETY_DISCLAIMER', () => {
  it('is a fixed, non-empty disclaimer sentence and never uses "safe" language', () => {
    expect(MINOR_SAFETY_DISCLAIMER.length).toBeGreaterThan(0);
    expect(MINOR_SAFETY_DISCLAIMER).not.toContain('בטוח');
  });
});

describe('re-exported weigh-in helpers (spec 18.1: partial week, past target date)', () => {
  it('computes the required weekly rate for a partial-week timeframe', () => {
    const rate = requiredWeeklyRateKg(80, 78, 10); // 10 days ~ 1.43 weeks
    expect(rate).toBeCloseTo((80 - 78) / (10 / 7));
  });

  it('returns null once the target date has already passed', () => {
    const from = new Date('2026-06-20T00:00:00.000Z');
    const to = new Date('2026-06-15T00:00:00.000Z');
    const days = daysRemaining(from, to);
    expect(days).toBeLessThan(0);
    expect(requiredWeeklyRateKg(80, 78, days)).toBeNull();
  });

  it('flags an aggressive rate and suggests a later, conservative alternative date', () => {
    const from = new Date('2026-06-01T00:00:00.000Z');
    const aggressiveRate = requiredWeeklyRateKg(80, 70, 14); // 10kg in 2 weeks
    expect(aggressiveRate).not.toBeNull();
    expect(isAggressiveRate(aggressiveRate as number, 80)).toBe(true);

    const altDate = suggestAlternativeDate(from, 80, 70);
    expect(altDate.getTime()).toBeGreaterThan(from.getTime());
  });
});
