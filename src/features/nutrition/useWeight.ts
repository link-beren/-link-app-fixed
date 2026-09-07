import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import type { WeightEntry, WeightGoal } from '@/types';

export function useWeightEntries(): WeightEntry[] | undefined {
  return useLiveQuery(() => db.weightEntries.orderBy('measuredAt').toArray(), []);
}

export function useLatestWeightEntry(): WeightEntry | null | undefined {
  return useLiveQuery(async () => (await db.weightEntries.orderBy('measuredAt').last()) ?? null, []);
}

export function useActiveWeightGoal(): WeightGoal | null | undefined {
  return useLiveQuery(async () => {
    const goals = await db.weightGoals.toArray();
    return goals.find((goal) => goal.active) ?? null;
  }, []);
}
