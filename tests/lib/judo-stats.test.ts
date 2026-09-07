import { describe, expect, it } from 'vitest';
import { computeJudoStats, countdownTarget, selectUpcomingCompetition } from '@/lib/calculations/judo-stats';
import type { JudoCompetition } from '@/types';

function competition(partial: Partial<JudoCompetition>): JudoCompetition {
  return {
    id: crypto.randomUUID(),
    name: 'תחרות',
    startsAt: '2026-03-01T09:00:00.000Z',
    weightClassKg: 73,
    status: 'planned',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('computeJudoStats', () => {
  it('sums wins, losses and medals only from completed competitions', () => {
    const competitions = [
      competition({ status: 'completed', wins: 3, losses: 1, medal: 'gold' }),
      competition({ status: 'completed', wins: 2, losses: 2, medal: 'bronze' }),
      competition({ status: 'planned', wins: 10, losses: 10, medal: 'gold' }),
      competition({ status: 'cancelled' }),
    ];
    const stats = computeJudoStats(competitions);
    expect(stats.completedCount).toBe(2);
    expect(stats.wins).toBe(5);
    expect(stats.losses).toBe(3);
    expect(stats.medals).toEqual({ gold: 1, silver: 0, bronze: 1 });
  });

  it('handles missing win/loss fields as zero', () => {
    const stats = computeJudoStats([competition({ status: 'completed' })]);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
  });
});

describe('selectUpcomingCompetition', () => {
  const now = new Date('2026-02-01T00:00:00.000Z');

  it('picks the nearest future planned competition', () => {
    const far = competition({ startsAt: '2026-06-01T00:00:00.000Z' });
    const near = competition({ startsAt: '2026-03-01T00:00:00.000Z' });
    expect(selectUpcomingCompetition([far, near], now)).toBe(near);
  });

  it('ignores past and non-planned competitions', () => {
    const past = competition({ startsAt: '2026-01-01T00:00:00.000Z' });
    const cancelled = competition({ startsAt: '2026-03-01T00:00:00.000Z', status: 'cancelled' });
    expect(selectUpcomingCompetition([past, cancelled], now)).toBeUndefined();
  });
});

describe('countdownTarget', () => {
  it('counts down to the weigh-in time when set', () => {
    const comp = competition({ startsAt: '2026-03-01T09:00:00.000Z', weighInAt: '2026-02-28T18:00:00.000Z' });
    expect(countdownTarget(comp).toISOString()).toBe('2026-02-28T18:00:00.000Z');
  });

  it('falls back to the competition start time otherwise', () => {
    const comp = competition({ startsAt: '2026-03-01T09:00:00.000Z' });
    expect(countdownTarget(comp).toISOString()).toBe('2026-03-01T09:00:00.000Z');
  });
});
