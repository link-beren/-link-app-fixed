import { describe, expect, it } from 'vitest';
import {
  computeOneRmEstimates,
  estimateOneRmBrzycki,
  estimateOneRmEpley,
  isEstimateLessReliable,
} from '@/lib/calculations/one-rm';

describe('estimateOneRmEpley', () => {
  it('computes the standard formula for a multi-rep set', () => {
    expect(estimateOneRmEpley(100, 5)).toBeCloseTo(100 * (1 + 5 / 30));
  });

  it('returns the exact weight for a single rep', () => {
    expect(estimateOneRmEpley(140, 1)).toBe(140);
  });

  it('rejects invalid input', () => {
    expect(estimateOneRmEpley(0, 5)).toBeNull();
    expect(estimateOneRmEpley(-10, 5)).toBeNull();
    expect(estimateOneRmEpley(100, 0)).toBeNull();
    expect(estimateOneRmEpley(100, -1)).toBeNull();
  });
});

describe('estimateOneRmBrzycki', () => {
  it('computes the standard formula for a multi-rep set', () => {
    expect(estimateOneRmBrzycki(100, 5)).toBeCloseTo((100 * 36) / (37 - 5));
  });

  it('returns the exact weight for a single rep', () => {
    expect(estimateOneRmBrzycki(140, 1)).toBe(140);
  });

  it('is undefined at 37 reps and above', () => {
    expect(estimateOneRmBrzycki(100, 37)).toBeNull();
    expect(estimateOneRmBrzycki(100, 40)).toBeNull();
  });

  it('is still defined at 36 reps', () => {
    expect(estimateOneRmBrzycki(100, 36)).toBeCloseTo(3600);
  });

  it('rejects invalid input', () => {
    expect(estimateOneRmBrzycki(0, 5)).toBeNull();
    expect(estimateOneRmBrzycki(100, 0)).toBeNull();
    expect(estimateOneRmBrzycki(100, -3)).toBeNull();
  });
});

describe('isEstimateLessReliable', () => {
  it('is false at exactly 12 reps and below', () => {
    expect(isEstimateLessReliable(12)).toBe(false);
    expect(isEstimateLessReliable(1)).toBe(false);
  });

  it('is true above 12 reps', () => {
    expect(isEstimateLessReliable(13)).toBe(true);
  });
});

describe('computeOneRmEstimates', () => {
  it('bundles both formulas and the reliability flag', () => {
    const result = computeOneRmEstimates(100, 5);
    expect(result.epley).toBeCloseTo(100 * (1 + 5 / 30));
    expect(result.brzycki).toBeCloseTo((100 * 36) / (37 - 5));
    expect(result.lessReliable).toBe(false);
  });

  it('flags low reliability and nulls out Brzycki past 37 reps', () => {
    const result = computeOneRmEstimates(50, 40);
    expect(result.brzycki).toBeNull();
    expect(result.epley).not.toBeNull();
    expect(result.lessReliable).toBe(true);
  });
});
