import { db as defaultDb, type AppDatabase } from '@/db/database';
import { buildSeedExercises } from '@/db/seed-exercises';
import { buildSeedFoodReferences } from '@/db/food-seed-data';
import { buildSeedWeeklyWorkoutTemplates } from '@/db/workout-seed-data';
import { CURRENT_SCHEMA_VERSION } from '@/db/migrations';

// Idempotent: safe to call on every app startup. For built-in exercises and
// food references that already exist, only the shared "content" fields are
// refreshed so a future app update can fix a seed entry; the user's own
// favorite/hidden flags (exercises) or custom foods (distinct ids) are
// preserved rather than overwritten.
export async function ensureSeedData(db: AppDatabase = defaultDb): Promise<void> {
  await db.transaction('rw', db.exercises, db.appSettings, db.foodReferences, db.weeklyWorkoutTemplates, async () => {
    const existing = new Map((await db.exercises.toArray()).map((exercise) => [exercise.id, exercise]));

    for (const seed of buildSeedExercises()) {
      const current = existing.get(seed.id);
      if (!current) {
        await db.exercises.put(seed);
      } else {
        await db.exercises.update(seed.id, {
          nameHe: seed.nameHe,
          nameEn: seed.nameEn,
          aliases: seed.aliases,
          category: seed.category,
          metricType: seed.metricType,
          builtIn: seed.builtIn,
        });
      }
    }

    const existingFoods = new Map((await db.foodReferences.toArray()).map((food) => [food.id, food]));

    for (const seed of buildSeedFoodReferences()) {
      const current = existingFoods.get(seed.id);
      if (!current) {
        await db.foodReferences.put(seed);
      } else {
        await db.foodReferences.update(seed.id, {
          canonicalNameHe: seed.canonicalNameHe,
          canonicalNameEn: seed.canonicalNameEn,
          aliases: seed.aliases,
          kcalPer100g: seed.kcalPer100g,
          proteinPer100g: seed.proteinPer100g,
          servingOptions: seed.servingOptions,
        });
      }
    }

    const templateCount = await db.weeklyWorkoutTemplates.count();
    if (templateCount === 0) {
      await db.weeklyWorkoutTemplates.bulkAdd(buildSeedWeeklyWorkoutTemplates());
    }

    const settings = await db.appSettings.get('settings');
    if (!settings) {
      await db.appSettings.put({
        id: 'settings',
        notificationMode: 'in-app',
        schemaVersion: CURRENT_SCHEMA_VERSION,
      });
    }
  });
}
