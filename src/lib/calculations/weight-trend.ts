import type { WeightEntry } from '@/types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface WeightTrendPoint {
  measuredAt: string;
  weightKg: number;
  movingAverageKg: number;
}

/**
 * Spec 11.4: a trailing 7-day moving average per entry, used as the trend
 * line. Entries marked excludedFromTrend are dropped entirely — they never
 * appear on the trend line or feed into anyone else's average, but are not
 * deleted from the log itself.
 */
export function computeWeightTrend(entries: WeightEntry[], windowDays = 7): WeightTrendPoint[] {
  const eligible = [...entries]
    .filter((entry) => !entry.excludedFromTrend)
    .sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime());

  return eligible.map((entry, index) => {
    const cutoff = new Date(entry.measuredAt).getTime() - windowDays * MS_PER_DAY;
    const window = eligible
      .slice(0, index + 1)
      .filter((candidate) => new Date(candidate.measuredAt).getTime() > cutoff);
    const average = window.reduce((sum, candidate) => sum + candidate.weightKg, 0) / window.length;
    return { measuredAt: entry.measuredAt, weightKg: entry.weightKg, movingAverageKg: average };
  });
}

/**
 * Actual weekly rate of change (spec 11.4 "קצב ירידה בפועל מול הקצב הנדרש"):
 * the most recent 7-day average minus the 7-day average from one week
 * earlier. Positive = weight gained, negative = weight lost. Null when there
 * isn't at least one eligible entry in both windows.
 */
export function actualWeeklyRateKg(entries: WeightEntry[], now: Date): number | null {
  const eligible = entries.filter((entry) => !entry.excludedFromTrend);
  const nowMs = now.getTime();

  const recentWindow = eligible.filter((entry) => {
    const age = nowMs - new Date(entry.measuredAt).getTime();
    return age >= 0 && age <= 7 * MS_PER_DAY;
  });
  const priorWindow = eligible.filter((entry) => {
    const age = nowMs - new Date(entry.measuredAt).getTime();
    return age > 7 * MS_PER_DAY && age <= 14 * MS_PER_DAY;
  });

  if (recentWindow.length === 0 || priorWindow.length === 0) return null;

  const average = (list: WeightEntry[]) => list.reduce((sum, entry) => sum + entry.weightKg, 0) / list.length;
  return average(recentWindow) - average(priorWindow);
}
