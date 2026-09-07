import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import type { Achievement, JudoCompetition } from '@/types';

export function useCompetitions(): JudoCompetition[] | undefined {
  return useLiveQuery(() => db.judoCompetitions.orderBy('startsAt').toArray(), []);
}

export function useCompetition(competitionId: string | undefined): JudoCompetition | null | undefined {
  return useLiveQuery(async () => {
    if (!competitionId) return null;
    return (await db.judoCompetitions.get(competitionId)) ?? null;
  }, [competitionId]);
}

export function useAchievements(): Achievement[] | undefined {
  return useLiveQuery(() => db.achievements.orderBy('achievedOn').reverse().toArray(), []);
}
