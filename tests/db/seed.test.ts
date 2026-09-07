import { describe, expect, it } from 'vitest';
import { AppDatabase } from '@/db/database';
import { buildSeedExercises } from '@/db/seed-exercises';
import { buildSeedFoodReferences } from '@/db/food-seed-data';
import { CURRENT_SCHEMA_VERSION } from '@/db/migrations';
import { ensureSeedData } from '@/db/seed';

describe('seed data', () => {
  it('populates the built-in exercise library with required lifts', async () => {
    const db = new AppDatabase('test-seed-1');
    await ensureSeedData(db);

    const count = await db.exercises.count();
    expect(count).toBeGreaterThanOrEqual(25);

    const deadlift = await db.exercises.get('ex-deadlift');
    expect(deadlift).toMatchObject({ nameEn: 'Deadlift', metricType: 'weight', builtIn: true });

    const snatch = await db.exercises.get('ex-snatch');
    expect(snatch?.category).toBe('הרמות אולימפיות');

    await db.delete();
  });

  it('creates default app settings exactly once', async () => {
    const db = new AppDatabase('test-seed-2');
    await ensureSeedData(db);
    await ensureSeedData(db); // idempotent re-run

    const allSettings = await db.appSettings.toArray();
    expect(allSettings).toHaveLength(1);
    expect(allSettings[0]).toMatchObject({ notificationMode: 'in-app', schemaVersion: CURRENT_SCHEMA_VERSION });

    await db.delete();
  });

  it('is idempotent: re-seeding does not duplicate exercises or drop custom edits', async () => {
    const db = new AppDatabase('test-seed-3');
    await ensureSeedData(db);
    await db.exercises.update('ex-deadlift', { favorite: true });

    await ensureSeedData(db);

    const countAfter = await db.exercises.count();
    const deadlift = await db.exercises.get('ex-deadlift');
    expect(countAfter).toBe(buildSeedExercises().length);
    expect(deadlift?.favorite).toBe(true);

    await db.delete();
  });

  it('populates at least 100 local food references, including the ones from the spec example sentence', async () => {
    const db = new AppDatabase('test-seed-4');
    await ensureSeedData(db);

    const count = await db.foodReferences.count();
    expect(count).toBeGreaterThanOrEqual(100);

    const kebab = await db.foodReferences.get('kebab-grilled');
    expect(kebab).toMatchObject({ source: 'local', aliases: expect.arrayContaining(['קבבים']) });

    const rice = await db.foodReferences.get('rice-white-cooked');
    expect(rice).toMatchObject({ source: 'local', kcalPer100g: 130 });

    await db.delete();
  });

  it('is idempotent for food references: re-seeding does not duplicate rows or drop custom foods', async () => {
    const db = new AppDatabase('test-seed-5');
    await ensureSeedData(db);
    await db.foodReferences.add({
      id: 'custom-user-food',
      canonicalNameHe: 'מאכל אישי',
      canonicalNameEn: 'Custom food',
      aliases: [],
      kcalPer100g: 200,
      proteinPer100g: 10,
      servingOptions: [{ label: 'מנה', grams: 100 }],
      source: 'custom',
    });

    await ensureSeedData(db);

    const countAfter = await db.foodReferences.count();
    expect(countAfter).toBe(buildSeedFoodReferences().length + 1);
    const custom = await db.foodReferences.get('custom-user-food');
    expect(custom?.source).toBe('custom');

    await db.delete();
  });
});
