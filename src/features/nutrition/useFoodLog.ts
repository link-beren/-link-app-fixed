import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import type { FoodLogItem, MealLog, SavedMeal } from '@/types';

export function useMealLogs(): MealLog[] | undefined {
  return useLiveQuery(() => db.mealLogs.orderBy('eatenAt').reverse().toArray(), []);
}

export function useFoodLogItemsForMeal(mealId: string | undefined): FoodLogItem[] | undefined {
  return useLiveQuery(async () => {
    if (!mealId) return [];
    return db.foodLogItems.where('mealId').equals(mealId).toArray();
  }, [mealId]);
}

export function useAllFoodLogItems(): FoodLogItem[] | undefined {
  return useLiveQuery(() => db.foodLogItems.toArray(), []);
}

export function useSavedMeals(): SavedMeal[] | undefined {
  return useLiveQuery(() => db.savedMeals.orderBy('name').toArray(), []);
}
