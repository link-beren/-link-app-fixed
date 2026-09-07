import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { db } from '@/db/database';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  NON_EXERCISE_ACTIVITY_LABELS,
  profileFormSchema,
  type ProfileFormOutput,
  type ProfileFormValues,
} from '@/lib/profile-schema';
import { useAppSettings, useProfile } from '@/features/settings/useProfile';

export function SettingsScreen() {
  const profile = useProfile();
  const settings = useAppSettings();
  const [resetOpen, setResetOpen] = useState(false);
  const [usdaKey, setUsdaKey] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues, unknown, ProfileFormOutput>({
    resolver: zodResolver(profileFormSchema),
    values: profile
      ? {
          birthDate: profile.birthDate ?? '',
          ageFallback: profile.ageFallback,
          biologicalSex: profile.biologicalSex,
          heightCm: profile.heightCm,
          currentWeightKg: profile.currentWeightKg,
          nonExerciseActivityLevel: profile.nonExerciseActivityLevel,
          proteinGramsPerKg: profile.proteinGramsPerKg,
        }
      : undefined,
  });

  useEffect(() => {
    setUsdaKey(settings?.usdaApiKey ?? '');
  }, [settings?.usdaApiKey]);

  if (!profile) return null;

  const onSubmit = handleSubmit(async (values) => {
    await db.userProfile.update('local-user', {
      birthDate: values.birthDate || undefined,
      ageFallback: values.birthDate ? undefined : values.ageFallback,
      biologicalSex: values.biologicalSex,
      heightCm: values.heightCm,
      currentWeightKg: values.currentWeightKg,
      nonExerciseActivityLevel: values.nonExerciseActivityLevel,
      proteinGramsPerKg: values.proteinGramsPerKg,
      updatedAt: new Date().toISOString(),
    });
    setSavedMessage('הפרופיל נשמר');
    setTimeout(() => setSavedMessage(''), 2000);
    reset(values);
  });

  const theme = profile.theme;
  const setTheme = async (value: 'dark' | 'light' | 'system') => {
    await db.userProfile.update('local-user', { theme: value, updatedAt: new Date().toISOString() });
  };

  const setOneRmFormula = async (value: 'epley' | 'brzycki') => {
    await db.userProfile.update('local-user', { oneRmFormula: value, updatedAt: new Date().toISOString() });
  };

  const saveUsdaKey = async () => {
    const current = await db.appSettings.get('settings');
    await db.appSettings.put({
      id: 'settings',
      notificationMode: current?.notificationMode ?? 'in-app',
      schemaVersion: current?.schemaVersion ?? 1,
      usdaApiKey: usdaKey || undefined,
    });
    setSavedMessage('מפתח USDA נשמר מקומית');
    setTimeout(() => setSavedMessage(''), 2000);
  };

  const resetAllData = async () => {
    await db.delete();
    window.location.reload();
  };

  const watchedProtein = String(watch('proteinGramsPerKg') ?? '');

  return (
    <div className="safe-x flex flex-col gap-4 p-4 pb-8">
      <h1 className="text-2xl font-bold">הגדרות</h1>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">מראה</h2>
        <div className="flex gap-2" role="radiogroup" aria-label="ערכת נושא">
          {(
            [
              ['dark', 'כהה'],
              ['light', 'בהיר'],
              ['system', 'לפי המערכת'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={theme === value}
              onClick={() => setTheme(value)}
              className={`min-h-11 flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                theme === value
                  ? 'border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-300'
                  : 'border-slate-300 dark:border-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">נוסחת RM1 ברירת מחדל</h2>
        <div className="flex gap-2" role="radiogroup" aria-label="נוסחת RM1">
          {(
            [
              ['epley', 'Epley'],
              ['brzycki', 'Brzycki'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={profile.oneRmFormula === value}
              onClick={() => setOneRmFormula(value)}
              className={`min-h-11 flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                profile.oneRmFormula === value
                  ? 'border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-300'
                  : 'border-slate-300 dark:border-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      <form onSubmit={onSubmit}>
        <Card className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">פרופיל אישי</h2>
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
            </label>
            <label className="flex flex-col gap-1 text-sm">
              משקל נוכחי (ק״ג)
              <input type="number" step="0.1" inputMode="decimal" className="input" {...register('currentWeightKg')} />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            רמת פעילות יומיומית
            <select className="input" {...register('nonExerciseActivityLevel')}>
              {Object.entries(NON_EXERCISE_ACTIVITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            יעד חלבון (גרם לק״ג) — נוכחי: {watchedProtein}
            <input type="number" step="0.1" inputMode="decimal" className="input" {...register('proteinGramsPerKg')} />
          </label>

          <Button type="submit" disabled={isSubmitting}>
            שמירת פרופיל
          </Button>
          {savedMessage ? <p className="text-sm text-teal-600 dark:text-teal-300">{savedMessage}</p> : null}
        </Card>
      </form>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">USDA FoodData Central</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          מפתח API חינמי מ־data.gov, נשמר מקומית בלבד ב־IndexedDB ואינו נשלח לשום שרת חוץ מ־USDA.
        </p>
        <input
          type="text"
          className="input"
          placeholder="הדבק כאן API key"
          value={usdaKey}
          onChange={(event) => setUsdaKey(event.target.value)}
          aria-label="מפתח USDA API"
        />
        <Button onClick={saveUsdaKey} className="self-start">
          שמירת מפתח
        </Button>
      </Card>

      <Card className="flex flex-col gap-3 border-red-300 dark:border-red-900">
        <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">אזור מסוכן</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          כל המידע נשמר במכשיר בלבד ואין גיבוי או סנכרון. מחיקת נתוני האתר, הסרת האפליקציה, או האיפוס להלן ימחקו את
          כל המידע לצמיתות.
        </p>
        <Button variant="danger" className="self-start" onClick={() => setResetOpen(true)}>
          איפוס כל הנתונים
        </Button>
      </Card>

      <ConfirmDialog
        open={resetOpen}
        title="איפוס כל הנתונים"
        description="פעולה זו תמחק את כל המידע האישי במכשיר לצמיתות. לא ניתן לשחזר."
        confirmLabel="מחיקה סופית"
        onConfirm={() => {
          setResetOpen(false);
          void resetAllData();
        }}
        onCancel={() => setResetOpen(false)}
      />
    </div>
  );
}
