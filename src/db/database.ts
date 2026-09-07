import Dexie, { type EntityTable } from 'dexie';
import type {
  Achievement,
  AppSettings,
  Exercise,
  ExerciseGoal,
  FoodLogItem,
  FoodReference,
  JudoCompetition,
  MealLog,
  SavedMeal,
  StrengthResult,
  UserProfile,
  WeeklyWorkoutTemplate,
  WeightEntry,
  WeightGoal,
  WorkoutLog,
} from '@/types';

export class AppDatabase extends Dexie {
  userProfile!: EntityTable<UserProfile, 'id'>;
  exercises!: EntityTable<Exercise, 'id'>;
  strengthResults!: EntityTable<StrengthResult, 'id'>;
  exerciseGoals!: EntityTable<ExerciseGoal, 'id'>;
  judoCompetitions!: EntityTable<JudoCompetition, 'id'>;
  achievements!: EntityTable<Achievement, 'id'>;
  weeklyWorkoutTemplates!: EntityTable<WeeklyWorkoutTemplate, 'id'>;
  workoutLogs!: EntityTable<WorkoutLog, 'id'>;
  weightEntries!: EntityTable<WeightEntry, 'id'>;
  weightGoals!: EntityTable<WeightGoal, 'id'>;
  foodReferences!: EntityTable<FoodReference, 'id'>;
  foodLogItems!: EntityTable<FoodLogItem, 'id'>;
  mealLogs!: EntityTable<MealLog, 'id'>;
  savedMeals!: EntityTable<SavedMeal, 'id'>;
  appSettings!: EntityTable<AppSettings, 'id'>;

  constructor(name = 'personal-sport-app') {
    super(name);

    // Schema version 1 — see README "Schema migrations" for change policy.
    this.version(1).stores({
      userProfile: 'id',
      exercises: 'id, category, nameEn, builtIn, hidden',
      strengthResults: 'id, exerciseId, performedAt, [exerciseId+performedAt]',
      exerciseGoals: 'id, exerciseId, achievedAt',
      judoCompetitions: 'id, startsAt, status',
      achievements: 'id, achievedOn, competitionId, type',
      weeklyWorkoutTemplates: 'id, weekday, active',
      workoutLogs: 'id, performedAt, templateId',
      weightEntries: 'id, measuredAt',
      weightGoals: 'id, active, targetDate',
      foodReferences: 'id, canonicalNameEn, source',
      foodLogItems: 'id, mealId, foodReferenceId',
      mealLogs: 'id, eatenAt',
      savedMeals: 'id, name',
      appSettings: 'id',
    });
  }
}

export const db = new AppDatabase();
