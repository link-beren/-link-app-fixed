import type { JudoCompetition } from '@/types';

export interface JudoStats {
  completedCount: number;
  wins: number;
  losses: number;
  medals: { gold: number; silver: number; bronze: number };
}

/**
 * Wins/losses/medals are always derived from completed competitions rather
 * than stored as a separate counter, so they can never drift out of sync
 * (spec 9.3).
 */
export function computeJudoStats(competitions: JudoCompetition[]): JudoStats {
  const completed = competitions.filter((competition) => competition.status === 'completed');
  return {
    completedCount: completed.length,
    wins: completed.reduce((sum, competition) => sum + (competition.wins ?? 0), 0),
    losses: completed.reduce((sum, competition) => sum + (competition.losses ?? 0), 0),
    medals: {
      gold: completed.filter((competition) => competition.medal === 'gold').length,
      silver: completed.filter((competition) => competition.medal === 'silver').length,
      bronze: completed.filter((competition) => competition.medal === 'bronze').length,
    },
  };
}

export function selectUpcomingCompetition(competitions: JudoCompetition[], now: Date): JudoCompetition | undefined {
  return competitions
    .filter((competition) => competition.status === 'planned' && new Date(competition.startsAt).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];
}

/** Countdown target: the weigh-in time if set, otherwise the competition start (spec 9.1). */
export function countdownTarget(competition: JudoCompetition): Date {
  return new Date(competition.weighInAt ?? competition.startsAt);
}

export const MEDAL_LABELS: Record<'gold' | 'silver' | 'bronze', string> = {
  gold: 'זהב',
  silver: 'כסף',
  bronze: 'ארד',
};
