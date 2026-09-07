import { describe, expect, it } from 'vitest';
import { profileFormSchema } from '@/lib/profile-schema';

const base = {
  biologicalSex: 'male' as const,
  heightCm: 178,
  currentWeightKg: 80,
  nonExerciseActivityLevel: 'moderate' as const,
  proteinGramsPerKg: 1.6,
};

describe('profileFormSchema', () => {
  it('accepts a birth date without an age fallback', () => {
    const result = profileFormSchema.safeParse({ ...base, birthDate: '2000-01-01' });
    expect(result.success).toBe(true);
  });

  it('accepts an age fallback without a birth date', () => {
    const result = profileFormSchema.safeParse({ ...base, ageFallback: 25 });
    expect(result.success).toBe(true);
  });

  it('rejects when neither birth date nor age is provided', () => {
    const result = profileFormSchema.safeParse({ ...base });
    expect(result.success).toBe(false);
  });

  it('rejects an out-of-range height', () => {
    const result = profileFormSchema.safeParse({ ...base, ageFallback: 25, heightCm: 5 });
    expect(result.success).toBe(false);
  });
});
