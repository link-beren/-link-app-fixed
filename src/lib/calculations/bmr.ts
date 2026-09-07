import type { UserProfile } from '@/types';

export const ACTIVITY_FACTORS: Record<UserProfile['nonExerciseActivityLevel'], number> = {
  sedentary: 1.2,
  light: 1.3,
  moderate: 1.4,
  high: 1.5,
};

export function computeAge(profile: Pick<UserProfile, 'birthDate' | 'ageFallback'>, now: Date): number {
  if (!profile.birthDate) return profile.ageFallback ?? 0;
  const birth = new Date(profile.birthDate);
  let age = now.getFullYear() - birth.getFullYear();
  const hasNotHadBirthdayYet =
    now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (hasNotHadBirthdayYet) age -= 1;
  return age;
}

export function schofieldBmr(weightKg: number, sex: 'male' | 'female'): number {
  return sex === 'male' ? 17.686 * weightKg + 658.2 : 13.384 * weightKg + 692.6;
}

export function mifflinStJeorBmr(weightKg: number, heightCm: number, age: number, sex: 'male' | 'female'): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

export function computeBmr(profile: UserProfile, now: Date): number {
  const age = computeAge(profile, now);
  if (age <= 18) return schofieldBmr(profile.currentWeightKg, profile.biologicalSex);
  return mifflinStJeorBmr(profile.currentWeightKg, profile.heightCm, age, profile.biologicalSex);
}

export function baselineDailyExpenditureKcal(bmr: number, activityLevel: UserProfile['nonExerciseActivityLevel']): number {
  return bmr * ACTIVITY_FACTORS[activityLevel];
}
