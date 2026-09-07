import type { AppDatabase } from '@/db/database';
import { currentBestValue, isGoalAchieved, selectActiveGoal } from '@/lib/calculations/exercise-stats';

/**
 * Checks the current active goal for an exercise against its result history
 * and marks it achieved if the target has been reached. Call this after
 * adding/editing a result or after creating a new goal.
 */
export async function checkAndMarkGoalAchievement(db: AppDatabase, exerciseId: string): Promise<void> {
  const exercise = await db.exercises.get(exerciseId);
  if (!exercise) return;

  const goals = await db.exerciseGoals.where('exerciseId').equals(exerciseId).toArray();
  const activeGoal = selectActiveGoal(goals);
  if (!activeGoal || activeGoal.achievedAt) return;

  const profile = await db.userProfile.get('local-user');
  const formula = profile?.oneRmFormula ?? 'epley';
  const results = await db.strengthResults.where('exerciseId').equals(exerciseId).toArray();
  const current = currentBestValue(results, exercise.metricType, formula);
  if (current === null) return;

  if (isGoalAchieved(current, activeGoal.targetValue, exercise.metricType)) {
    await db.exerciseGoals.update(activeGoal.id, { achievedAt: new Date().toISOString() });
  }
}
