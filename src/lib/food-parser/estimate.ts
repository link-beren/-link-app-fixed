import type { Confidence, FoodReference } from '@/types';
import { SIZE_MULTIPLIERS, type FoodEstimate, type ParsedFoodSegment } from './types';

// Direct weight units convert straight to grams; every other recognized unit
// only makes sense relative to a specific food's serving options.
const GRAM_UNITS: Record<string, number> = {
  'גרם': 1,
  'ק"ג': 1000,
};

// Spec 11.6: conservative-upward estimation, never blocking on ambiguity.
export function estimateFoodItem(food: FoodReference, segment: ParsedFoodSegment): FoodEstimate {
  const sizeMultiplier = SIZE_MULTIPLIERS[segment.size];
  const assumptions: string[] = [];
  let estimatedGrams: number;
  let confidence: Confidence;

  const directGramsPerUnit = segment.unit ? GRAM_UNITS[segment.unit] : undefined;

  if (directGramsPerUnit) {
    estimatedGrams = segment.quantity * directGramsPerUnit * sizeMultiplier;
    confidence = 'high';
  } else {
    const matchedServing = segment.unit
      ? food.servingOptions.find((option) => option.label === segment.unit)
      : undefined;
    const fallbackServing = matchedServing ?? food.servingOptions[0];

    if (!fallbackServing) {
      estimatedGrams = segment.quantity * 100 * sizeMultiplier;
      confidence = 'low';
      assumptions.push('לא נמצאו נתוני מנה למאכל זה; הונח משקל מנה של 100 גרם');
    } else {
      estimatedGrams = segment.quantity * fallbackServing.grams * sizeMultiplier;
      confidence = matchedServing ? 'medium' : 'low';
      assumptions.push(
        matchedServing
          ? `מנה "${matchedServing.label}" הוערכה ב-${matchedServing.grams} גרם למנה`
          : `לא צוינה יחידה מוכרת; הונחה מנת ברירת מחדל של ${fallbackServing.grams} גרם ("${fallbackServing.label}")`,
      );
    }
  }

  if (segment.size !== 'normal') {
    assumptions.push(`תואר גודל "${segment.size}" הוחל כמקדם ${sizeMultiplier}`);
  }

  let kcal = (estimatedGrams / 100) * food.kcalPer100g;
  let conservativeMultiplier = 1;
  if (segment.isFried) {
    conservativeMultiplier = 1.1;
    kcal *= conservativeMultiplier;
    assumptions.push('זוהה טיגון או שמן לא ידוע; נוסף מקדם שמרני של 10% לקלוריות בלבד');
    if (confidence === 'high') confidence = 'medium';
  }
  if (segment.isVague) {
    kcal = Math.ceil(kcal / 25) * 25;
    assumptions.push('הכמות עמומה; הקלוריות עוגלו כלפי מעלה ל-25 הקק"ל הקרובות');
    confidence = 'low';
  }

  // Protein is never rounded up, so a confirmed-looking number never overstates progress.
  const proteinGrams = (estimatedGrams / 100) * food.proteinPer100g;

  return {
    estimatedGrams: Math.round(estimatedGrams),
    kcal: Math.round(kcal),
    proteinGrams: Math.round(proteinGrams * 10) / 10,
    confidence,
    assumption: assumptions.length > 0 ? assumptions.join('; ') : 'הוערך לפי מנה רגילה של המאכל התואם',
    conservativeMultiplier,
  };
}
