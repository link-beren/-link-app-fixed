import type { FoodReference } from '@/types';

// Spec 11.5 step 4-5: map a Hebrew food name to a canonical local FoodReference
// via exact name/alias match first, then a loose substring match.
export function matchFoodReference(nameText: string, foods: FoodReference[]): FoodReference | null {
  const target = nameText.trim();
  if (!target) return null;

  const exact = foods.find((food) => food.canonicalNameHe === target || food.aliases.includes(target));
  if (exact) return exact;

  const partial = foods.find(
    (food) =>
      food.canonicalNameHe.includes(target) ||
      target.includes(food.canonicalNameHe) ||
      food.aliases.some((alias) => alias.includes(target) || target.includes(alias)),
  );
  return partial ?? null;
}
