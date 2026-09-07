import { describe, expect, it } from 'vitest';
import { actualWeeklyRateKg, computeWeightTrend } from '@/lib/calculations/weight-trend';
import type { WeightEntry } from '@/types';

function entry(overrides: Partial<WeightEntry> = {}): WeightEntry {
  return {
    id: `entry-${Math.random()}`,
    measuredAt: '2026-06-01T06:00:00.000Z',
    weightKg: 80,
    excludedFromTrend: false,
    ...overrides,
  };
}

describe('computeWeightTrend', () => {
  it('averages a single entry as itself', () => {
    const entries = [entry({ measuredAt: '2026-06-01T06:00:00.000Z', weightKg: 80 })];
    const trend = computeWeightTrend(entries);
    expect(trend).toHaveLength(1);
    expect(trend[0].movingAverageKg).toBeCloseTo(80);
  });

  it('averages only entries within the trailing 7-day window', () => {
    const entries = [
      entry({ measuredAt: '2026-06-01T06:00:00.000Z', weightKg: 80 }),
      entry({ measuredAt: '2026-06-05T06:00:00.000Z', weightKg: 79 }),
      // 10 days after the first entry: the first entry falls outside its 7-day trailing window
      entry({ measuredAt: '2026-06-11T06:00:00.000Z', weightKg: 78 }),
    ];
    const trend = computeWeightTrend(entries, 7);
    expect(trend).toHaveLength(3);
    expect(trend[0].movingAverageKg).toBeCloseTo(80);
    expect(trend[1].movingAverageKg).toBeCloseTo((80 + 79) / 2);
    // third entry's window includes the 06-05 entry but excludes the 06-01 entry (>7 days earlier)
    expect(trend[2].movingAverageKg).toBeCloseTo((79 + 78) / 2);
  });

  it('drops entries marked excludedFromTrend from both the trend line and other averages', () => {
    const entries = [
      entry({ measuredAt: '2026-06-01T06:00:00.000Z', weightKg: 80 }),
      entry({ measuredAt: '2026-06-02T06:00:00.000Z', weightKg: 200, excludedFromTrend: true }),
      entry({ measuredAt: '2026-06-03T06:00:00.000Z', weightKg: 79 }),
    ];
    const trend = computeWeightTrend(entries, 7);
    expect(trend).toHaveLength(2);
    expect(trend.some((point) => point.weightKg === 200)).toBe(false);
    expect(trend[1].movingAverageKg).toBeCloseTo((80 + 79) / 2);
  });

  it('sorts output chronologically regardless of input order', () => {
    const entries = [
      entry({ measuredAt: '2026-06-03T06:00:00.000Z', weightKg: 79 }),
      entry({ measuredAt: '2026-06-01T06:00:00.000Z', weightKg: 80 }),
    ];
    const trend = computeWeightTrend(entries, 7);
    expect(trend.map((point) => point.measuredAt)).toEqual([
      '2026-06-01T06:00:00.000Z',
      '2026-06-03T06:00:00.000Z',
    ]);
  });
});

describe('actualWeeklyRateKg', () => {
  const now = new Date('2026-06-15T00:00:00.000Z');

  it('returns null when there is no entry in the recent 7-day window', () => {
    const entries = [entry({ measuredAt: '2026-05-20T00:00:00.000Z', weightKg: 80 })];
    expect(actualWeeklyRateKg(entries, now)).toBeNull();
  });

  it('returns null when there is no entry in the prior 7-14 day window', () => {
    const entries = [entry({ measuredAt: '2026-06-14T00:00:00.000Z', weightKg: 80 })];
    expect(actualWeeklyRateKg(entries, now)).toBeNull();
  });

  it('returns a negative rate when weight was lost between the two windows', () => {
    const entries = [
      entry({ measuredAt: '2026-06-04T00:00:00.000Z', weightKg: 80 }), // prior window
      entry({ measuredAt: '2026-06-14T00:00:00.000Z', weightKg: 79 }), // recent window
    ];
    expect(actualWeeklyRateKg(entries, now)).toBeCloseTo(79 - 80);
  });

  it('returns a positive rate when weight was gained between the two windows', () => {
    const entries = [
      entry({ measuredAt: '2026-06-04T00:00:00.000Z', weightKg: 79 }),
      entry({ measuredAt: '2026-06-14T00:00:00.000Z', weightKg: 80 }),
    ];
    expect(actualWeeklyRateKg(entries, now)).toBeCloseTo(80 - 79);
  });

  it('ignores entries marked excludedFromTrend in both windows', () => {
    const entries = [
      entry({ measuredAt: '2026-06-04T00:00:00.000Z', weightKg: 80 }),
      entry({ measuredAt: '2026-06-14T00:00:00.000Z', weightKg: 200, excludedFromTrend: true }),
      entry({ measuredAt: '2026-06-13T00:00:00.000Z', weightKg: 79 }),
    ];
    expect(actualWeeklyRateKg(entries, now)).toBeCloseTo(79 - 80);
  });
});
