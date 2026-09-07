export type OneRmFormula = 'epley' | 'brzycki';

/**
 * Epley formula. A single rep is treated as an exact max regardless of the
 * formula's own output (spec 8.2), since Epley would otherwise inflate a
 * 1-rep set by ~3.3%.
 */
export function estimateOneRmEpley(weightKg: number, reps: number): number | null {
  if (!(weightKg > 0) || !(reps > 0) || !Number.isFinite(reps)) return null;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

/** Brzycki formula. Undefined (division by zero or negative) at reps >= 37. */
export function estimateOneRmBrzycki(weightKg: number, reps: number): number | null {
  if (!(weightKg > 0) || !(reps > 0) || !Number.isFinite(reps)) return null;
  if (reps === 1) return weightKg;
  if (reps >= 37) return null;
  return (weightKg * 36) / (37 - reps);
}

/** Above 12 reps the RM1 estimate is flagged as less reliable (spec 8.2). */
export function isEstimateLessReliable(reps: number): boolean {
  return reps > 12;
}

export interface OneRmEstimates {
  epley: number | null;
  brzycki: number | null;
  lessReliable: boolean;
}

export function computeOneRmEstimates(weightKg: number, reps: number): OneRmEstimates {
  return {
    epley: estimateOneRmEpley(weightKg, reps),
    brzycki: estimateOneRmBrzycki(weightKg, reps),
    lessReliable: isEstimateLessReliable(reps),
  };
}

export function estimateOneRm(weightKg: number, reps: number, formula: OneRmFormula): number | null {
  return formula === 'epley' ? estimateOneRmEpley(weightKg, reps) : estimateOneRmBrzycki(weightKg, reps);
}
