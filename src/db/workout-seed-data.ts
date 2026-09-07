import { DEFAULT_MET_BY_INTENSITY } from '@/lib/calculations/workout-plan';
import type { SportType, WeeklyWorkoutTemplate } from '@/types';

// Default personal weekly schedule (spec: this app is single-user, built for
// its owner): one high-intensity session per day, Saturday off. Stable slug
// ids (not random UUIDs) keep re-seeding idempotent. Duration/MET/active are
// fully editable afterwards from the "לוח שבועי קבוע" screen — these are just
// the starting defaults.
// weekday: 0 = ראשון (Sunday) ... 6 = שבת (Saturday), matching WorkoutsScreen.
const WEEKLY_SCHEDULE: Array<{ weekday: number; sportType: SportType; title: string }> = [
  { weekday: 0, sportType: 'judo', title: 'ג׳ודו עצים' },
  { weekday: 1, sportType: 'crossfit', title: 'קרוספיט עצים' },
  { weekday: 2, sportType: 'judo', title: 'ג׳ודו עצים' },
  { weekday: 3, sportType: 'judo', title: 'ג׳ודו עצים' },
  { weekday: 4, sportType: 'crossfit', title: 'קרוספיט עצים' },
  { weekday: 5, sportType: 'judo', title: 'ג׳ודו עצים' },
  // weekday 6 (שבת): no session.
];

const DEFAULT_DURATION_MINUTES = 60;
const HIGH_MET = DEFAULT_MET_BY_INTENSITY.high;

export function buildSeedWeeklyWorkoutTemplates(): WeeklyWorkoutTemplate[] {
  return WEEKLY_SCHEDULE.map(({ weekday, sportType, title }) => ({
    id: `seed-${sportType}-high-${weekday}`,
    weekday,
    sportType,
    title,
    durationMinutes: DEFAULT_DURATION_MINUTES,
    intensity: 'high',
    metValue: HIGH_MET,
    active: true,
  }));
}
