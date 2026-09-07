import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { baselineDailyExpenditureKcal, computeBmr } from '@/lib/calculations/bmr';
import { effectiveDailyNetExerciseKcal } from '@/lib/calculations/workout-plan';
import { requiredWeeklyDeficitKcal } from '@/lib/calculations/weight-goal';
import { daysRemaining, requiredWeeklyRateKg } from '@/lib/calculations/weigh-in';
import {
  computeDailySummary,
  computeWeeklySummary,
  type DailyNutritionSummary,
  type DaySummaryInput,
  type WeeklyNutritionSummary,
} from '@/lib/calculations/nutrition-summary';
import type { FoodLogItem, MealLog, UserProfile, WeeklyWorkoutTemplate, WeightGoal, WorkoutLog } from '@/types';

// Look back far enough before the current week that the forecast's trailing
// average (spec 11.9: last 3-7 complete days) has data even early in a new week.
const TRAILING_DAYS_BEFORE_WEEK = 7;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date): Date {
  const start = startOfDay(date);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** The weekly deficit the plan set out to achieve, fixed at goal creation (not re-derived from progress). */
function weeklyDeficitTargetFor(goal: WeightGoal): number | null {
  const days = daysRemaining(new Date(goal.startDate), new Date(goal.targetDate));
  const weeklyRate = requiredWeeklyRateKg(goal.startWeightKg, goal.targetWeightKg, days);
  return weeklyRate === null ? null : requiredWeeklyDeficitKcal(weeklyRate);
}

function buildDaySummaryInput(
  day: Date,
  now: Date,
  profile: UserProfile,
  weightKg: number,
  templates: WeeklyWorkoutTemplate[],
  workoutLogs: WorkoutLog[],
  mealLogs: MealLog[],
  foodLogItems: FoodLogItem[],
): DaySummaryInput {
  const today = startOfDay(now);
  const dayStart = startOfDay(day);

  const daysMealLogs = mealLogs.filter((meal) => isSameDay(new Date(meal.eatenAt), day));
  const mealIds = new Set(daysMealLogs.map((meal) => meal.id));
  const dayItems = foodLogItems.filter((item) => mealIds.has(item.mealId));

  const kcalEaten = dayItems.reduce((sum, item) => sum + item.kcal, 0);
  const proteinEaten = dayItems.reduce((sum, item) => sum + item.proteinGrams, 0);

  const markedComplete = daysMealLogs.some((meal) => meal.dayCompleteAfterThisMeal);
  const status: DaySummaryInput['status'] =
    dayStart < today ? 'complete' : dayStart > today ? 'future' : markedComplete ? 'complete' : 'partial';

  const bmr = computeBmr(profile, now);
  const baseline = baselineDailyExpenditureKcal(bmr, profile.nonExerciseActivityLevel);
  const exerciseKcal = effectiveDailyNetExerciseKcal(day, templates, workoutLogs, weightKg, now);

  return { status, kcalEaten, proteinEaten, estimatedExpenditureKcal: baseline + exerciseKcal };
}

export interface NutritionSummary {
  daily: DailyNutritionSummary;
  weekly: WeeklyNutritionSummary;
}

export function useNutritionSummary(): NutritionSummary | null | undefined {
  return useLiveQuery(async () => {
    const profile = await db.userProfile.get('local-user');
    if (!profile) return null;

    const now = new Date();
    const weekStart = startOfWeek(now);
    const rangeStart = addDays(weekStart, -TRAILING_DAYS_BEFORE_WEEK);

    const [goals, latestWeight, templates, workoutLogs, mealLogs, foodLogItems] = await Promise.all([
      db.weightGoals.toArray(),
      db.weightEntries.orderBy('measuredAt').last(),
      db.weeklyWorkoutTemplates.toArray(),
      db.workoutLogs.toArray(),
      db.mealLogs.toArray(),
      db.foodLogItems.toArray(),
    ]);

    const activeGoal = goals.find((goal) => goal.active) ?? null;
    const weightKg = latestWeight?.weightKg ?? profile.currentWeightKg;

    const allDays: DaySummaryInput[] = [];
    for (let i = 0; i <= TRAILING_DAYS_BEFORE_WEEK + 6; i++) {
      const day = addDays(rangeStart, i);
      allDays.push(buildDaySummaryInput(day, now, profile, weightKg, templates, workoutLogs, mealLogs, foodLogItems));
    }

    const weekDays = allDays.slice(TRAILING_DAYS_BEFORE_WEEK);
    const trailingCompleteDays = allDays.filter((day) => day.status === 'complete');

    const weeklyDeficitTargetKcal = activeGoal ? weeklyDeficitTargetFor(activeGoal) : null;
    const weekly = computeWeeklySummary({ weekDays, trailingCompleteDays, weeklyDeficitTargetKcal });

    const todayInput = weekDays[now.getDay()];
    const daily = computeDailySummary(todayInput, weightKg, profile.proteinGramsPerKg);

    return { daily, weekly };
  }, []);
}
