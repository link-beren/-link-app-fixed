import type { Exercise, ExerciseMetricType } from '@/types';

// Built-in exercise IDs are stable slugs (not random UUIDs) so re-running the
// seed is idempotent and StrengthResult.exerciseId references stay valid
// across app updates.
interface SeedExercise {
  id: string;
  nameHe: string;
  nameEn: string;
  category: string;
  metricType: ExerciseMetricType;
  aliases?: string[];
}

export const EXERCISE_CATEGORIES = {
  olympic: 'הרמות אולימפיות',
  strength: 'כוח',
  pullPush: 'משיכה ודחיפה',
  gymnastics: 'התעמלות',
  carry: 'נשיאה ואובייקטים',
} as const;

// Bodyweight pull/push and gymnastics movements default to metricType "reps"
// (max reps at bodyweight); users who track weighted variants can duplicate
// the movement as a custom "weight" exercise. Carry/sled movements default to
// "weight" (heaviest load moved). Documented in README as a product default.
const SEED_EXERCISES: SeedExercise[] = [
  // הרמות אולימפיות
  { id: 'ex-snatch', nameHe: 'קפיצת משקל (Snatch)', nameEn: 'Snatch', category: EXERCISE_CATEGORIES.olympic, metricType: 'weight' },
  { id: 'ex-clean', nameHe: 'קלין (Clean)', nameEn: 'Clean', category: EXERCISE_CATEGORIES.olympic, metricType: 'weight' },
  { id: 'ex-clean-and-jerk', nameHe: 'קלין אנד ג׳רק', nameEn: 'Clean & Jerk', category: EXERCISE_CATEGORIES.olympic, metricType: 'weight' },
  { id: 'ex-power-clean', nameHe: 'פאוור קלין', nameEn: 'Power Clean', category: EXERCISE_CATEGORIES.olympic, metricType: 'weight' },
  { id: 'ex-power-snatch', nameHe: 'פאוור סנאץ׳', nameEn: 'Power Snatch', category: EXERCISE_CATEGORIES.olympic, metricType: 'weight' },
  { id: 'ex-hang-clean', nameHe: 'האנג קלין', nameEn: 'Hang Clean', category: EXERCISE_CATEGORIES.olympic, metricType: 'weight' },
  { id: 'ex-hang-snatch', nameHe: 'האנג סנאץ׳', nameEn: 'Hang Snatch', category: EXERCISE_CATEGORIES.olympic, metricType: 'weight' },

  // כוח
  { id: 'ex-deadlift', nameHe: 'הרמת כפיפת גב (דדליפט)', nameEn: 'Deadlift', category: EXERCISE_CATEGORIES.strength, metricType: 'weight' },
  { id: 'ex-sumo-deadlift', nameHe: 'דדליפט סומו', nameEn: 'Sumo Deadlift', category: EXERCISE_CATEGORIES.strength, metricType: 'weight' },
  { id: 'ex-back-squat', nameHe: 'סקוואט גב', nameEn: 'Back Squat', category: EXERCISE_CATEGORIES.strength, metricType: 'weight' },
  { id: 'ex-front-squat', nameHe: 'פרונט סקוואט', nameEn: 'Front Squat', category: EXERCISE_CATEGORIES.strength, metricType: 'weight' },
  { id: 'ex-bench-press', nameHe: 'לחיצת חזה', nameEn: 'Bench Press', category: EXERCISE_CATEGORIES.strength, metricType: 'weight' },
  { id: 'ex-strict-press', nameHe: 'לחיצה תקנית', nameEn: 'Strict Press', category: EXERCISE_CATEGORIES.strength, metricType: 'weight' },
  { id: 'ex-push-press', nameHe: 'פוש פרס', nameEn: 'Push Press', category: EXERCISE_CATEGORIES.strength, metricType: 'weight' },

  // משיכה ודחיפה
  { id: 'ex-pull-up', nameHe: 'מתח', nameEn: 'Pull-up', category: EXERCISE_CATEGORIES.pullPush, metricType: 'reps' },
  { id: 'ex-chest-to-bar', nameHe: 'מתח חזה למוט', nameEn: 'Chest-to-Bar', category: EXERCISE_CATEGORIES.pullPush, metricType: 'reps' },
  { id: 'ex-dip', nameHe: 'מקבילים (דיפ)', nameEn: 'Dip', category: EXERCISE_CATEGORIES.pullPush, metricType: 'reps' },
  { id: 'ex-muscle-up', nameHe: 'מאסל אפ', nameEn: 'Muscle-up', category: EXERCISE_CATEGORIES.pullPush, metricType: 'reps' },
  { id: 'ex-bar-muscle-up', nameHe: 'מאסל אפ מוט', nameEn: 'Bar Muscle-up', category: EXERCISE_CATEGORIES.pullPush, metricType: 'reps' },
  { id: 'ex-ring-muscle-up', nameHe: 'מאסל אפ טבעות', nameEn: 'Ring Muscle-up', category: EXERCISE_CATEGORIES.pullPush, metricType: 'reps' },

  // התעמלות
  { id: 'ex-handstand-push-up', nameHe: 'לחיצת עמידת ידיים', nameEn: 'Handstand Push-up', category: EXERCISE_CATEGORIES.gymnastics, metricType: 'reps' },
  { id: 'ex-toes-to-bar', nameHe: 'בהונות למוט', nameEn: 'Toes-to-Bar', category: EXERCISE_CATEGORIES.gymnastics, metricType: 'reps' },
  { id: 'ex-pistol-squat', nameHe: 'סקוואט פיסטול', nameEn: 'Pistol Squat', category: EXERCISE_CATEGORIES.gymnastics, metricType: 'reps' },

  // נשיאה ואובייקטים
  { id: 'ex-farmer-carry', nameHe: 'נשיאת חקלאי', nameEn: 'Farmer Carry', category: EXERCISE_CATEGORIES.carry, metricType: 'weight' },
  { id: 'ex-sandbag-carry', nameHe: 'נשיאת שק חול', nameEn: 'Sandbag Carry', category: EXERCISE_CATEGORIES.carry, metricType: 'weight' },
  { id: 'ex-sled-push', nameHe: 'דחיפת מזחלת', nameEn: 'Sled Push', category: EXERCISE_CATEGORIES.carry, metricType: 'weight' },
];

export function buildSeedExercises(): Exercise[] {
  return SEED_EXERCISES.map((seed) => ({
    id: seed.id,
    nameHe: seed.nameHe,
    nameEn: seed.nameEn,
    aliases: seed.aliases ?? [],
    category: seed.category,
    metricType: seed.metricType,
    builtIn: true,
    favorite: false,
    hidden: false,
  }));
}
