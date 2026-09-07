import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import type { Exercise, ExerciseGoal, StrengthResult } from '@/types';

export function useExercises(): Exercise[] | undefined {
  return useLiveQuery(() => db.exercises.toArray(), []);
}

export function useExercise(exerciseId: string | undefined): Exercise | null | undefined {
  return useLiveQuery(async () => {
    if (!exerciseId) return null;
    return (await db.exercises.get(exerciseId)) ?? null;
  }, [exerciseId]);
}

export function useStrengthResults(exerciseId: string | undefined): StrengthResult[] | undefined {
  return useLiveQuery(async () => {
    if (!exerciseId) return [];
    return db.strengthResults.where('exerciseId').equals(exerciseId).sortBy('performedAt');
  }, [exerciseId]);
}

export function useExerciseGoals(exerciseId: string | undefined): ExerciseGoal[] | undefined {
  return useLiveQuery(async () => {
    if (!exerciseId) return [];
    return db.exerciseGoals.where('exerciseId').equals(exerciseId).sortBy('createdAt');
  }, [exerciseId]);
}

export interface LatestStrengthResult {
  result: StrengthResult;
  exercise: Exercise;
}

export function useLatestStrengthResult(): LatestStrengthResult | null | undefined {
  return useLiveQuery(async () => {
    const result = await db.strengthResults.orderBy('performedAt').last();
    if (!result) return null;
    const exercise = await db.exercises.get(result.exerciseId);
    if (!exercise) return null;
    return { result, exercise };
  }, []);
}
