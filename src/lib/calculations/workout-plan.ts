import type { WeeklyWorkoutTemplate, WorkoutLog } from '@/types';

export const DEFAULT_MET_BY_INTENSITY: Record<WeeklyWorkoutTemplate['intensity'], number> = {
  low: 3,
  moderate: 5,
  high: 8,
};

export function netExerciseKcal(metValue: number, weightKg: number, durationMinutes: number): number {
  return Math.max(0, metValue - 1) * weightKg * (durationMinutes / 60);
}

function isSameDate(isoDate: string, day: Date): boolean {
  const date = new Date(isoDate);
  return (
    date.getFullYear() === day.getFullYear() && date.getMonth() === day.getMonth() && date.getDate() === day.getDate()
  );
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Combines the fixed weekly template with actual logs for a single day, per
 * spec 10.2: past days use only what was actually logged; today/future use
 * today's logs plus not-yet-due planned sessions; a log linked to a template
 * replaces it rather than adding to it.
 */
export function effectiveDailyNetExerciseKcal(
  day: Date,
  templates: WeeklyWorkoutTemplate[],
  logs: WorkoutLog[],
  weightKg: number,
  now: Date,
): number {
  const dayLogs = logs.filter((log) => isSameDate(log.performedAt, day));
  const loggedKcal = dayLogs.reduce((sum, log) => sum + log.estimatedNetKcal, 0);

  const dayStart = startOfDay(day);
  const nowStart = startOfDay(now);
  if (dayStart < nowStart) {
    return loggedKcal;
  }

  const loggedTemplateIds = new Set(dayLogs.map((log) => log.templateId).filter((id): id is string => id != null));
  const weekday = day.getDay();
  const isFutureDay = dayStart > nowStart;

  const stillPlanned = templates.filter((template) => {
    if (!template.active || template.weekday !== weekday || loggedTemplateIds.has(template.id)) return false;
    if (isFutureDay || !template.plannedStartTime) return true;
    const [hours, minutes] = template.plannedStartTime.split(':').map(Number);
    const plannedAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes);
    return plannedAt.getTime() >= now.getTime();
  });

  const plannedKcal = stillPlanned.reduce(
    (sum, template) => sum + netExerciseKcal(template.metValue, weightKg, template.durationMinutes),
    0,
  );

  return loggedKcal + plannedKcal;
}
