import { describe, expect, it } from 'vitest';
import { AppDatabase } from '@/db/database';
import { computeOneRmEstimates } from '@/lib/calculations/one-rm';
import { checkAndMarkGoalAchievement } from '@/lib/goal-achievement';

async function seedExerciseAndProfile(db: AppDatabase) {
  await db.exercises.put({
    id: 'ex-deadlift',
    nameHe: 'דדליפט',
    nameEn: 'Deadlift',
    aliases: [],
    category: 'כוח',
    metricType: 'weight',
    builtIn: true,
    favorite: false,
    hidden: false,
  });
  await db.userProfile.put({
    id: 'local-user',
    biologicalSex: 'male',
    heightCm: 178,
    currentWeightKg: 82,
    nonExerciseActivityLevel: 'moderate',
    proteinGramsPerKg: 1.6,
    oneRmFormula: 'epley',
    theme: 'dark',
    onboardingCompleted: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

describe('checkAndMarkGoalAchievement', () => {
  it('marks the active goal achieved once RM1 reaches the target', async () => {
    const db = new AppDatabase('test-goal-1');
    await seedExerciseAndProfile(db);

    await db.exerciseGoals.add({
      id: 'goal-1',
      exerciseId: 'ex-deadlift',
      targetValue: 140,
      createdAt: new Date().toISOString(),
    });

    const estimates = computeOneRmEstimates(100, 5);
    await db.strengthResults.add({
      id: 'result-1',
      exerciseId: 'ex-deadlift',
      performedAt: new Date().toISOString(),
      weightKg: 100,
      reps: 5,
      estimatedOneRmEpley: estimates.epley!,
      estimatedOneRmBrzycki: estimates.brzycki!,
    });
    await checkAndMarkGoalAchievement(db, 'ex-deadlift');

    let goal = await db.exerciseGoals.get('goal-1');
    expect(goal?.achievedAt).toBeUndefined();

    const bigEstimates = computeOneRmEstimates(150, 1);
    await db.strengthResults.add({
      id: 'result-2',
      exerciseId: 'ex-deadlift',
      performedAt: new Date().toISOString(),
      weightKg: 150,
      reps: 1,
      estimatedOneRmEpley: bigEstimates.epley!,
      estimatedOneRmBrzycki: bigEstimates.brzycki!,
    });
    await checkAndMarkGoalAchievement(db, 'ex-deadlift');

    goal = await db.exerciseGoals.get('goal-1');
    expect(goal?.achievedAt).toBeDefined();

    await db.delete();
  });

  it('lets a new goal be created without deleting the achieved one', async () => {
    const db = new AppDatabase('test-goal-2');
    await seedExerciseAndProfile(db);

    await db.exerciseGoals.add({
      id: 'goal-old',
      exerciseId: 'ex-deadlift',
      targetValue: 100,
      createdAt: '2026-01-01T00:00:00.000Z',
      achievedAt: '2026-01-02T00:00:00.000Z',
    });
    await db.exerciseGoals.add({
      id: 'goal-new',
      exerciseId: 'ex-deadlift',
      targetValue: 160,
      createdAt: '2026-02-01T00:00:00.000Z',
    });

    const estimates = computeOneRmEstimates(150, 1);
    await db.strengthResults.add({
      id: 'result-1',
      exerciseId: 'ex-deadlift',
      performedAt: new Date().toISOString(),
      weightKg: 150,
      reps: 1,
      estimatedOneRmEpley: estimates.epley!,
      estimatedOneRmBrzycki: estimates.brzycki!,
    });
    await checkAndMarkGoalAchievement(db, 'ex-deadlift');

    const oldGoal = await db.exerciseGoals.get('goal-old');
    const newGoal = await db.exerciseGoals.get('goal-new');
    expect(oldGoal?.achievedAt).toBe('2026-01-02T00:00:00.000Z');
    expect(newGoal?.achievedAt).toBeUndefined();

    await db.delete();
  });
});
