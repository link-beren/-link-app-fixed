import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_FACTORS,
  baselineDailyExpenditureKcal,
  computeAge,
  computeBmr,
  mifflinStJeorBmr,
  schofieldBmr,
} from '@/lib/calculations/bmr';
import type { UserProfile } from '@/types';

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'local-user',
    biologicalSex: 'male',
    heightCm: 178,
    currentWeightKg: 80,
    nonExerciseActivityLevel: 'moderate',
    proteinGramsPerKg: 1.6,
    oneRmFormula: 'epley',
    theme: 'dark',
    onboardingCompleted: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('computeAge', () => {
  const now = new Date('2026-06-15T00:00:00.000Z');

  it('computes full years from a birth date whose birthday already passed this year', () => {
    expect(computeAge({ birthDate: '2000-01-01' }, now)).toBe(26);
  });

  it('subtracts one year when the birthday has not happened yet this year', () => {
    expect(computeAge({ birthDate: '2000-12-31' }, now)).toBe(25);
  });

  it('falls back to ageFallback when no birth date is set', () => {
    expect(computeAge({ ageFallback: 17 }, now)).toBe(17);
  });
});

describe('schofieldBmr', () => {
  it('applies the male formula', () => {
    expect(schofieldBmr(60, 'male')).toBeCloseTo(17.686 * 60 + 658.2);
  });

  it('applies the female formula', () => {
    expect(schofieldBmr(55, 'female')).toBeCloseTo(13.384 * 55 + 692.6);
  });
});

describe('mifflinStJeorBmr', () => {
  it('applies the male formula', () => {
    expect(mifflinStJeorBmr(80, 178, 30, 'male')).toBeCloseTo(10 * 80 + 6.25 * 178 - 5 * 30 + 5);
  });

  it('applies the female formula', () => {
    expect(mifflinStJeorBmr(65, 165, 28, 'female')).toBeCloseTo(10 * 65 + 6.25 * 165 - 5 * 28 - 161);
  });
});

describe('computeBmr', () => {
  const now = new Date('2026-06-15T00:00:00.000Z');

  it('uses Schofield for ages 10-18', () => {
    const teen = profile({ birthDate: '2010-01-01', currentWeightKg: 60 });
    expect(computeBmr(teen, now)).toBeCloseTo(schofieldBmr(60, 'male'));
  });

  it('uses Mifflin-St Jeor from age 19 up', () => {
    const adult = profile({ birthDate: '2007-01-01', currentWeightKg: 60, heightCm: 175 });
    expect(computeBmr(adult, now)).toBeCloseTo(mifflinStJeorBmr(60, 175, 19, 'male'));
  });
});

describe('baselineDailyExpenditureKcal', () => {
  it('multiplies BMR by the activity factor for each level', () => {
    for (const [level, factor] of Object.entries(ACTIVITY_FACTORS) as Array<
      [UserProfile['nonExerciseActivityLevel'], number]
    >) {
      expect(baselineDailyExpenditureKcal(1000, level)).toBeCloseTo(1000 * factor);
    }
  });
});
