import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import type { WeeklyWorkoutTemplate, WorkoutLog } from '@/types';

export function useWeeklyWorkoutTemplates(): WeeklyWorkoutTemplate[] | undefined {
  return useLiveQuery(
    () => db.weeklyWorkoutTemplates.orderBy('weekday').toArray(),
    [],
  );
}

export function useWorkoutLogs(): WorkoutLog[] | undefined {
  return useLiveQuery(() => db.workoutLogs.orderBy('performedAt').reverse().toArray(), []);
}
