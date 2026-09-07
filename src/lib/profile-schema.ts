import { z } from 'zod';

// Shared by onboarding and settings profile editing (spec section 6).
export const profileFormSchema = z
  .object({
    birthDate: z.string().optional().or(z.literal('')),
    ageFallback: z.coerce.number().int().min(5).max(120).optional(),
    biologicalSex: z.enum(['male', 'female']),
    heightCm: z.coerce.number().min(80).max(250),
    currentWeightKg: z.coerce.number().min(20).max(400),
    nonExerciseActivityLevel: z.enum(['sedentary', 'light', 'moderate', 'high']),
    proteinGramsPerKg: z.coerce.number().min(0.5).max(4),
  })
  .refine((data) => Boolean(data.birthDate) || typeof data.ageFallback === 'number', {
    message: 'יש להזין תאריך לידה או גיל',
    path: ['ageFallback'],
  });

// RHF field values are the raw (pre-coercion) input shape; the resolver's
// output (post `z.coerce`) is only seen inside handleSubmit's callback.
export type ProfileFormValues = z.input<typeof profileFormSchema>;
export type ProfileFormOutput = z.output<typeof profileFormSchema>;

export const DEFAULT_PROTEIN_GRAMS_PER_KG = 1.6;

export const NON_EXERCISE_ACTIVITY_LABELS: Record<ProfileFormOutput['nonExerciseActivityLevel'], string> = {
  sedentary: 'יושבנית',
  light: 'קלה',
  moderate: 'בינונית',
  high: 'גבוהה',
};
