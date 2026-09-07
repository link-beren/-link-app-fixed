import { describe, expect, it } from 'vitest';
import {
  currentBestValue,
  goalGap,
  isGoalAchieved,
  selectActiveGoal,
  trueOneRepMax,
} from '@/lib/calculations/exercise-stats';
import type { ExerciseGoal, StrengthResult } from '@/types';

function result(partial: Partial<StrengthResult>): StrengthResult {
  return {
    id: crypto.randomUUID(),
    exerciseId: 'ex-deadlift',
    performedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('currentBestValue', () => {
  it('picks the highest estimated RM1 for a weight exercise', () => {
    const results = [
      result({ estimatedOneRmEpley: 120 }),
      result({ estimatedOneRmEpley: 140 }),
      result({ estimatedOneRmEpley: 100 }),
    ];
    expect(currentBestValue(results, 'weight', 'epley')).toBe(140);
  });

  it('picks the highest raw value for a reps exercise', () => {
    const results = [result({ value: 12 }), result({ value: 20 }), result({ value: 5 })];
    expect(currentBestValue(results, 'reps', 'epley')).toBe(20);
  });

  it('picks the lowest raw value for a time exercise (faster is better)', () => {
    const results = [result({ value: 65 }), result({ value: 58 }), result({ value: 70 })];
    expect(currentBestValue(results, 'time', 'epley')).toBe(58);
  });

  it('returns null when there is no usable data', () => {
    expect(currentBestValue([], 'weight', 'epley')).toBeNull();
  });
});

describe('trueOneRepMax', () => {
  it('finds the heaviest single-rep set', () => {
    const results = [
      result({ weightKg: 100, reps: 1 }),
      result({ weightKg: 140, reps: 1 }),
      result({ weightKg: 200, reps: 5 }),
    ];
    expect(trueOneRepMax(results)).toBe(140);
  });

  it('returns null when no single-rep set exists', () => {
    expect(trueOneRepMax([result({ weightKg: 100, reps: 5 })])).toBeNull();
  });
});

describe('goalGap and isGoalAchieved', () => {
  it('computes a positive gap below target for a weight goal', () => {
    const gap = goalGap(120, 140, 'weight');
    expect(gap.diff).toBeCloseTo(20);
    expect(gap.percentOfTarget).toBeCloseTo((120 / 140) * 100);
    expect(isGoalAchieved(120, 140, 'weight')).toBe(false);
    expect(isGoalAchieved(140, 140, 'weight')).toBe(true);
    expect(isGoalAchieved(150, 140, 'weight')).toBe(true);
  });

  it('reverses direction for a time goal (lower is better)', () => {
    expect(isGoalAchieved(65, 60, 'time')).toBe(false);
    expect(isGoalAchieved(58, 60, 'time')).toBe(true);
    const gap = goalGap(65, 60, 'time');
    expect(gap.diff).toBeCloseTo(5);
  });
});

function goal(partial: Partial<ExerciseGoal>): ExerciseGoal {
  return {
    id: crypto.randomUUID(),
    exerciseId: 'ex-deadlift',
    targetValue: 100,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('selectActiveGoal', () => {
  it('returns undefined for no goals', () => {
    expect(selectActiveGoal([])).toBeUndefined();
  });

  it('picks the most recently created unachieved goal', () => {
    const older = goal({ createdAt: '2026-01-01T00:00:00.000Z', targetValue: 100 });
    const newer = goal({ createdAt: '2026-02-01T00:00:00.000Z', targetValue: 120 });
    expect(selectActiveGoal([older, newer])).toBe(newer);
  });

  it('skips achieved goals in favor of an unachieved one, even if older', () => {
    const achieved = goal({ createdAt: '2026-02-01T00:00:00.000Z', achievedAt: '2026-02-02T00:00:00.000Z' });
    const active = goal({ createdAt: '2026-01-01T00:00:00.000Z' });
    expect(selectActiveGoal([achieved, active])).toBe(active);
  });

  it('falls back to the most recent achieved goal when everything is achieved', () => {
    const older = goal({ createdAt: '2026-01-01T00:00:00.000Z', achievedAt: '2026-01-02T00:00:00.000Z' });
    const newer = goal({ createdAt: '2026-02-01T00:00:00.000Z', achievedAt: '2026-02-02T00:00:00.000Z' });
    expect(selectActiveGoal([older, newer])).toBe(newer);
  });
});
