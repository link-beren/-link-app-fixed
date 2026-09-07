import type { Confidence, FoodReference } from '@/types';

export type SizeDescriptor = 'small' | 'normal' | 'large' | 'extraLarge';

// Spec 11.6: קטן=0.75, ללא תיאור=1.0, גדול=1.25, מנה גדולה מאוד=1.5.
export const SIZE_MULTIPLIERS: Record<SizeDescriptor, number> = {
  small: 0.75,
  normal: 1,
  large: 1.25,
  extraLarge: 1.5,
};

// Spec 11.5 step 1: the generic unit words the normalizer/parser recognize.
export const GENERIC_UNITS = ['גרם', 'ק"ג', 'כוס', 'כף', 'כפית', 'מנה', 'יחידה'] as const;

export interface ParsedFoodSegment {
  rawText: string;
  quantity: number;
  unit: string | null;
  size: SizeDescriptor;
  isFried: boolean;
  isVague: boolean;
  nameText: string;
}

export interface FoodEstimate {
  estimatedGrams: number;
  kcal: number;
  proteinGrams: number;
  confidence: Confidence;
  assumption: string;
  conservativeMultiplier: number;
}

export interface ParsedFoodEntry {
  segment: ParsedFoodSegment;
  matchedFood: FoodReference | null;
  estimate: FoodEstimate | null;
}
