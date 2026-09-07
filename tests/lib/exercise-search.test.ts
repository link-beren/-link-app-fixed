import { describe, expect, it } from 'vitest';
import { searchExercises } from '@/lib/exercise-search';
import type { Exercise } from '@/types';

const exercises: Exercise[] = [
  {
    id: 'ex-deadlift',
    nameHe: 'הרמת כפיפת גב (דדליפט)',
    nameEn: 'Deadlift',
    aliases: ['DL'],
    category: 'כוח',
    metricType: 'weight',
    builtIn: true,
    favorite: false,
    hidden: false,
  },
  {
    id: 'ex-pull-up',
    nameHe: 'מתח',
    nameEn: 'Pull-up',
    aliases: [],
    category: 'משיכה ודחיפה',
    metricType: 'reps',
    builtIn: true,
    favorite: false,
    hidden: false,
  },
];

describe('searchExercises', () => {
  it('returns everything for an empty query', () => {
    expect(searchExercises(exercises, '')).toHaveLength(2);
  });

  it('matches the Hebrew name', () => {
    expect(searchExercises(exercises, 'מתח')).toEqual([exercises[1]]);
  });

  it('matches the English name case-insensitively', () => {
    expect(searchExercises(exercises, 'deadLIFT')).toEqual([exercises[0]]);
  });

  it('matches an alias', () => {
    expect(searchExercises(exercises, 'dl')).toEqual([exercises[0]]);
  });

  it('returns nothing when there is no match', () => {
    expect(searchExercises(exercises, 'squat')).toEqual([]);
  });
});
