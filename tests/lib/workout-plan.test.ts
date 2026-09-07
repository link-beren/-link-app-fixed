import { describe, expect, it } from 'vitest';
import { effectiveDailyNetExerciseKcal, netExerciseKcal } from '@/lib/calculations/workout-plan';
import type { WeeklyWorkoutTemplate, WorkoutLog } from '@/types';

function template(overrides: Partial<WeeklyWorkoutTemplate> = {}): WeeklyWorkoutTemplate {
  return {
    id: 'tpl-1',
    weekday: 2, // Tuesday
    sportType: 'crossfit',
    title: 'קרוספיט',
    durationMinutes: 60,
    intensity: 'moderate',
    metValue: 6,
    active: true,
    ...overrides,
  };
}

function log(overrides: Partial<WorkoutLog> = {}): WorkoutLog {
  return {
    id: 'log-1',
    performedAt: '2026-06-16T08:00:00.000Z', // Tuesday
    sportType: 'crossfit',
    title: 'קרוספיט',
    durationMinutes: 60,
    intensity: 'moderate',
    metValue: 6,
    estimatedNetKcal: 250,
    ...overrides,
  };
}

describe('netExerciseKcal', () => {
  it('applies the max(0, MET - 1) x weight x hours formula', () => {
    expect(netExerciseKcal(6, 80, 60)).toBeCloseTo((6 - 1) * 80 * 1);
  });

  it('floors net expenditure at zero for MET <= 1', () => {
    expect(netExerciseKcal(1, 80, 60)).toBe(0);
    expect(netExerciseKcal(0.8, 80, 60)).toBe(0);
  });
});

describe('effectiveDailyNetExerciseKcal', () => {
  const tuesday = new Date('2026-06-16T12:00:00.000Z');

  it('for a past day, counts only what was actually logged, ignoring unmet planned sessions', () => {
    const now = new Date('2026-06-18T00:00:00.000Z'); // Thursday, after the Tuesday in question
    const templates = [template()];
    const kcal = effectiveDailyNetExerciseKcal(tuesday, templates, [], 80, now);
    expect(kcal).toBe(0);

    const withLog = effectiveDailyNetExerciseKcal(tuesday, templates, [log()], 80, now);
    expect(withLog).toBe(250);
  });

  it('for today, includes planned sessions whose time has not arrived yet', () => {
    const now = new Date(2026, 5, 16, 7, 0); // 07:00 local, before the 08:00 local planned time
    const templates = [template({ plannedStartTime: '08:00' })];
    const kcal = effectiveDailyNetExerciseKcal(tuesday, templates, [], 80, now);
    expect(kcal).toBeCloseTo(netExerciseKcal(6, 80, 60));
  });

  it('for today, excludes planned sessions whose time already passed without a log', () => {
    const now = new Date(2026, 5, 16, 9, 0); // 09:00 local, after the 08:00 local planned time
    const templates = [template({ plannedStartTime: '08:00' })];
    const kcal = effectiveDailyNetExerciseKcal(tuesday, templates, [], 80, now);
    expect(kcal).toBe(0);
  });

  it('does not double-count a logged workout linked to its planned template', () => {
    const now = new Date(2026, 5, 16, 9, 0);
    const templates = [template({ id: 'tpl-1', plannedStartTime: '08:00' })];
    const logs = [log({ templateId: 'tpl-1' })];
    const kcal = effectiveDailyNetExerciseKcal(tuesday, templates, logs, 80, now);
    expect(kcal).toBe(250);
  });

  it('for a future day, includes the full planned session regardless of time', () => {
    const now = new Date('2026-06-15T00:00:00.000Z'); // Monday, before the Tuesday session
    const templates = [template({ plannedStartTime: '20:00' })];
    const kcal = effectiveDailyNetExerciseKcal(tuesday, templates, [], 80, now);
    expect(kcal).toBeCloseTo(netExerciseKcal(6, 80, 60));
  });

  it('ignores inactive templates', () => {
    const now = new Date('2026-06-16T00:00:00.000Z');
    const templates = [template({ active: false, plannedStartTime: '20:00' })];
    const kcal = effectiveDailyNetExerciseKcal(tuesday, templates, [], 80, now);
    expect(kcal).toBe(0);
  });
});
