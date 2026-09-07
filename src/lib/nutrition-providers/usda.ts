// Spec 11.7 primary source: USDA FoodData Central Food Search + Food Details
// APIs. Requires a free data.gov API key, entered by the user in Settings and
// stored only in IndexedDB (never hardcoded/committed) — see AppSettings.
const USDA_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const USDA_DETAILS_URL = 'https://api.nal.usda.gov/fdc/v1/food';

// FoodData Central nutrient numbers: 208/957 = Energy (kcal), 203 = Protein.
const ENERGY_KCAL_NUTRIENT_NUMBERS = ['208', '957'];
const PROTEIN_NUTRIENT_NUMBER = '203';

export interface UsdaSearchResult {
  fdcId: number;
  description: string;
}

export interface UsdaFoodDetails {
  fdcId: number;
  description: string;
  kcalPer100g: number;
  proteinPer100g: number;
}

interface RawUsdaNutrient {
  nutrientNumber?: string;
  value?: number;
}

function findNutrientValue(nutrients: RawUsdaNutrient[], nutrientNumbers: string[]): number {
  const match = nutrients.find((nutrient) => nutrient.nutrientNumber && nutrientNumbers.includes(nutrient.nutrientNumber));
  return match?.value ?? 0;
}

export function parseUsdaSearchResponse(json: unknown): UsdaSearchResult[] {
  const foods = (json as { foods?: unknown[] })?.foods ?? [];
  return foods
    .map((food) => {
      const item = food as { fdcId?: number; description?: string };
      if (typeof item.fdcId !== 'number' || !item.description) return null;
      return { fdcId: item.fdcId, description: item.description };
    })
    .filter((result): result is UsdaSearchResult => result !== null);
}

export function parseUsdaDetailsResponse(json: unknown): UsdaFoodDetails | null {
  const data = json as { fdcId?: number; description?: string; foodNutrients?: unknown[] };
  if (typeof data.fdcId !== 'number' || !data.description) return null;

  const nutrients: RawUsdaNutrient[] = (data.foodNutrients ?? []).map((entry) => {
    const raw = entry as { nutrient?: { number?: string }; nutrientNumber?: string; amount?: number; value?: number };
    return {
      nutrientNumber: raw.nutrient?.number ?? raw.nutrientNumber,
      value: raw.amount ?? raw.value,
    };
  });

  return {
    fdcId: data.fdcId,
    description: data.description,
    kcalPer100g: findNutrientValue(nutrients, ENERGY_KCAL_NUTRIENT_NUMBERS),
    proteinPer100g: findNutrientValue(nutrients, [PROTEIN_NUTRIENT_NUMBER]),
  };
}

export async function searchUsdaFoods(query: string, apiKey: string, signal?: AbortSignal): Promise<UsdaSearchResult[]> {
  const url = new URL(USDA_SEARCH_URL);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('query', query);
  url.searchParams.set('pageSize', '10');
  const response = await fetch(url.toString(), { signal });
  if (!response.ok) throw new Error(`USDA search failed with status ${response.status}`);
  return parseUsdaSearchResponse(await response.json());
}

export async function getUsdaFoodDetails(
  fdcId: number,
  apiKey: string,
  signal?: AbortSignal,
): Promise<UsdaFoodDetails | null> {
  const url = new URL(`${USDA_DETAILS_URL}/${fdcId}`);
  url.searchParams.set('api_key', apiKey);
  const response = await fetch(url.toString(), { signal });
  if (!response.ok) throw new Error(`USDA details failed with status ${response.status}`);
  return parseUsdaDetailsResponse(await response.json());
}
