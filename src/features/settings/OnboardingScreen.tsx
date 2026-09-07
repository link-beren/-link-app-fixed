import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { db } from '@/db/database';
import { Button } from '@/components/Button';
import { cardClassName } from '@/components/Card';
import {
  DEFAULT_PROTEIN_GRAMS_PER_KG,
  NON_EXERCISE_ACTIVITY_LABELS,
  profileFormSchema,
  type ProfileFormOutput,
  type ProfileFormValues,
} from '@/lib/profile-schema';

export function OnboardingScreen() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues, unknown, ProfileFormOutput>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      ageFallback: 15,
      biologicalSex: 'male',
      heightCm: 172,
      currentWeightKg: 68,
      nonExerciseActivityLevel: 'moderate',
      proteinGramsPerKg: DEFAULT_PROTEIN_GRAMS_PER_KG,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const now = new Date().toISOString();
    await db.userProfile.put({
      id: 'local-user',
      birthDate: values.birthDate || undefined,
      ageFallback: values.birthDate ? undefined : values.ageFallback,
      biologicalSex: values.biologicalSex,
      heightCm: values.heightCm,
      currentWeightKg: values.currentWeightKg,
      nonExerciseActivityLevel: values.nonExerciseActivityLevel,
      proteinGramsPerKg: values.proteinGramsPerKg,
      oneRmFormula: 'epley',
      theme: 'dark',
      onboardingCompleted: true,
      createdAt: now,
      updatedAt: now,
    });
    await db.weightEntries.add({
      id: crypto.randomUUID(),
      measuredAt: now,
      weightKg: values.currentWeightKg,
      note: 'שקילה ראשונית מההגדרה הראשונית',
      excludedFromTrend: false,
    });
  });

  return (
    <div className="safe-top safe-x flex min-h-full flex-col gap-4 p-4">
      <header className="pt-4 text-center">
        <h1 className="text-2xl font-bold">ברוכים הבאים</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          כמה פרטים כדי להתאים את החישובים אישית. הכול נשמר במכשיר בלבד.
        </p>
      </header>

      <form onSubmit={onSubmit} className={`flex flex-col gap-4 ${cardClassName}`}>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            תאריך לידה
            <input type="date" className="input" {...register('birthDate')} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            גיל (אם אין תאריך)
            <input type="number" inputMode="numeric" className="input" {...register('ageFallback')} />
          </label>
        </div>
        {errors.ageFallback ? <p className="text-sm text-red-500">{errors.ageFallback.message}</p> : null}

        <fieldset className="flex flex-col gap-1 text-sm">
          <legend>מין ביולוגי</legend>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" value="male" {...register('biologicalSex')} /> זכר
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" value="female" {...register('biologicalSex')} /> נקבה
            </label>
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            גובה (ס״מ)
            <input type="number" inputMode="decimal" className="input" {...register('heightCm')} />
            {errors.heightCm ? <span className="text-xs text-red-500">{errors.heightCm.message}</span> : null}
          </label>
          <label className="flex flex-col gap-1 text-sm">
            משקל נוכחי (ק״ג)
            <input type="number" step="0.1" inputMode="decimal" className="input" {...register('currentWeightKg')} />
            {errors.currentWeightKg ? (
              <span className="text-xs text-red-500">{errors.currentWeightKg.message}</span>
            ) : null}
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          רמת פעילות יומיומית (לא כולל אימונים מתוכננים)
          <select className="input" {...register('nonExerciseActivityLevel')}>
            {Object.entries(NON_EXERCISE_ACTIVITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          יעד חלבון (גרם לק״ג)
          <input type="number" step="0.1" inputMode="decimal" className="input" {...register('proteinGramsPerKg')} />
        </label>

        <Button type="submit" disabled={isSubmitting} className="mt-2">
          התחלה
        </Button>
      </form>
    </div>
  );
}
