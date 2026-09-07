import type { FoodReference } from '@/types';
import { normalizeFoodText } from './normalize';
import { splitFoodSegments } from './split';
import { parseFoodSegment } from './parse-item';
import { matchFoodReference } from './match';
import { estimateFoodItem } from './estimate';
import type { ParsedFoodEntry } from './types';

export function parseFoodText(rawText: string, foods: FoodReference[]): ParsedFoodEntry[] {
  const normalized = normalizeFoodText(rawText);
  const segments = splitFoodSegments(normalized);
  return segments.map((rawSegment) => {
    const segment = parseFoodSegment(rawSegment);
    const matchedFood = matchFoodReference(segment.nameText, foods);
    const estimate = matchedFood ? estimateFoodItem(matchedFood, segment) : null;
    return { segment, matchedFood, estimate };
  });
}

export * from './types';
export { normalizeFoodText } from './normalize';
export { splitFoodSegments } from './split';
export { parseFoodSegment } from './parse-item';
export { matchFoodReference } from './match';
export { estimateFoodItem } from './estimate';
