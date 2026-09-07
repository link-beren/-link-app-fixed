import { db as defaultDb, type AppDatabase } from '@/db/database';
import type { FoodReference } from '@/types';
import { matchFoodReference, parseFoodSegment, parseFoodText, splitFoodSegments, normalizeFoodText } from '@/lib/food-parser';
import type { ParsedFoodEntry } from '@/lib/food-parser';
import { estimateFoodItem } from '@/lib/food-parser/estimate';
import { getUsdaFoodDetails, searchUsdaFoods } from '@/lib/nutrition-providers/usda';
import { searchOpenFoodFacts } from '@/lib/nutrition-providers/open-food-facts';

const FALLBACK_SERVING = [{ label: 'מנה', grams: 100 }];

// Spec 11.5 steps 5-8: local cache first, then USDA (if an API key is
// configured), then Open Food Facts, then give up and let the caller show a
// manual-entry item. Any remote hit is cached into foodReferences so later
// lookups (including offline) hit the local cache first.
export async function resolveFoodReference(nameText: string, database: AppDatabase = defaultDb): Promise<FoodReference | null> {
  const cached = await database.foodReferences.toArray();
  const localMatch = matchFoodReference(nameText, cached);
  if (localMatch) return localMatch;

  const settings = await database.appSettings.get('settings');
  if (settings?.usdaApiKey) {
    try {
      const results = await searchUsdaFoods(nameText, settings.usdaApiKey);
      const best = results[0];
      if (best) {
        const details = await getUsdaFoodDetails(best.fdcId, settings.usdaApiKey);
        if (details) {
          const foodReference: FoodReference = {
            id: crypto.randomUUID(),
            canonicalNameHe: nameText,
            canonicalNameEn: details.description,
            aliases: [nameText],
            kcalPer100g: details.kcalPer100g,
            proteinPer100g: details.proteinPer100g,
            servingOptions: FALLBACK_SERVING,
            source: 'usda',
            sourceId: String(details.fdcId),
            cachedAt: new Date().toISOString(),
          };
          await database.foodReferences.add(foodReference);
          return foodReference;
        }
      }
    } catch {
      // USDA unreachable (offline, rate-limited, bad key): fall through.
    }
  }

  try {
    const offResults = await searchOpenFoodFacts(nameText);
    const best = offResults[0];
    if (best) {
      const foodReference: FoodReference = {
        id: crypto.randomUUID(),
        canonicalNameHe: best.productName,
        canonicalNameEn: best.productName,
        aliases: [nameText],
        kcalPer100g: best.kcalPer100g,
        proteinPer100g: best.proteinPer100g,
        servingOptions: FALLBACK_SERVING,
        source: 'open-food-facts',
        sourceId: best.barcode,
        cachedAt: new Date().toISOString(),
      };
      await database.foodReferences.add(foodReference);
      return foodReference;
    }
  } catch {
    // Open Food Facts unreachable: caller falls back to manual entry.
  }

  return null;
}

// Full spec 11.5 pipeline: parse locally first (offline, no network), then
// resolve any unmatched item remotely. Call only on an explicit user action
// (e.g. a "פרק לפריטים" button), never on every keystroke (spec 11.7).
export async function parseFoodTextWithLookup(rawText: string, database: AppDatabase = defaultDb): Promise<ParsedFoodEntry[]> {
  const cached = await database.foodReferences.toArray();
  const localEntries = parseFoodText(rawText, cached);

  const resolved = await Promise.all(
    localEntries.map(async (entry) => {
      if (entry.matchedFood) return entry;
      const matchedFood = await resolveFoodReference(entry.segment.nameText, database);
      if (!matchedFood) return entry;
      return { ...entry, matchedFood, estimate: estimateFoodItem(matchedFood, entry.segment) };
    }),
  );

  return resolved;
}

// Re-parse a single edited segment against the (possibly newly-cached) local
// food table, e.g. after the user edits the free-text for one item.
export function reparseSegment(rawSegmentText: string, foods: FoodReference[]): ParsedFoodEntry {
  const [segmentText] = splitFoodSegments(normalizeFoodText(rawSegmentText));
  const segment = parseFoodSegment(segmentText ?? rawSegmentText);
  const matchedFood = matchFoodReference(segment.nameText, foods);
  const estimate = matchedFood ? estimateFoodItem(matchedFood, segment) : null;
  return { segment, matchedFood, estimate };
}
