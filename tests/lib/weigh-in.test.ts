import { describe, expect, it } from 'vitest';
import {
  daysRemaining,
  isAggressiveRate,
  requiredWeeklyRateKg,
  suggestAlternativeDate,
} from '@/lib/calculations/weigh-in';

describe('daysRemaining', () => {
  it('counts whole days between two dates', () => {
    expect(daysRemaining(new Date('2026-01-01T00:00:00Z'), new Date('2026-01-15T00:00:00Z'))).toBe(14);
  });
});

describe('requiredWeeklyRateKg', () => {
  it('computes the weekly rate needed to reach the target', () => {
    // 5kg to lose over 14 days (2 weeks) => 2.5kg/week
    expect(requiredWeeklyRateKg(85, 80, 14)).toBeCloseTo(2.5);
  });

  it('is negative when the target requires gaining weight', () => {
    expect(requiredWeeklyRateKg(80, 85, 14)).toBeCloseTo(-2.5);
  });

  it('returns null once the target date has passed', () => {
    expect(requiredWeeklyRateKg(85, 80, 0)).toBeNull();
    expect(requiredWeeklyRateKg(85, 80, -3)).toBeNull();
  });
});

describe('isAggressiveRate', () => {
  it('flags a rate above 0.5% of bodyweight per week', () => {
    // 0.5% of 80kg = 0.4kg/week
    expect(isAggressiveRate(0.4, 80)).toBe(false);
    expect(isAggressiveRate(0.41, 80)).toBe(true);
  });

  it('flags aggressive weight-gain rates too (absolute value)', () => {
    expect(isAggressiveRate(-1, 80)).toBe(true);
  });
});

describe('suggestAlternativeDate', () => {
  it('rounds up to a full week at the conservative max rate', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    // 80kg body, 0.5%/week = 0.4kg/week; losing 5kg needs ceil(5/0.4)=13 weeks
    const suggested = suggestAlternativeDate(from, 80, 75);
    const expected = new Date('2026-01-01T00:00:00Z');
    expected.setDate(expected.getDate() + 13 * 7);
    expect(suggested.toISOString()).toBe(expected.toISOString());
  });
});
