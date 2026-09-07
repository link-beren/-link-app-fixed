// Spec 11.7 complementary source: Open Food Facts (community-edited, read-only
// here). Callers must only invoke this on an explicit click or after a long
// debounce — never as the user types — and should cache results locally.
const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/api/v2/search';
const OFF_PRODUCT_URL = 'https://world.openfoodfacts.org/api/v3/product';

export interface OpenFoodFactsResult {
  barcode: string;
  productName: string;
  kcalPer100g: number;
  proteinPer100g: number;
}

interface RawOffProduct {
  code?: string;
  _id?: string;
  product_name?: string;
  product_name_he?: string;
  nutriments?: Record<string, number | string | undefined>;
}

export function parseOpenFoodFactsProduct(rawProduct: unknown): OpenFoodFactsResult | null {
  const product = rawProduct as RawOffProduct | null | undefined;
  if (!product) return null;

  const productName = product.product_name_he || product.product_name || '';
  if (!productName) return null;

  const nutriments = product.nutriments ?? {};
  const kcal = Number(nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal'] ?? 0);
  const protein = Number(nutriments['proteins_100g'] ?? nutriments.proteins ?? 0);

  return {
    barcode: String(product.code ?? product._id ?? ''),
    productName,
    kcalPer100g: Number.isFinite(kcal) ? kcal : 0,
    proteinPer100g: Number.isFinite(protein) ? protein : 0,
  };
}

export function parseOpenFoodFactsSearchResponse(json: unknown): OpenFoodFactsResult[] {
  const products = (json as { products?: unknown[] })?.products ?? [];
  return products
    .map((product) => parseOpenFoodFactsProduct(product))
    .filter((result): result is OpenFoodFactsResult => result !== null);
}

export async function searchOpenFoodFacts(query: string, signal?: AbortSignal): Promise<OpenFoodFactsResult[]> {
  const url = new URL(OFF_SEARCH_URL);
  url.searchParams.set('search_terms', query);
  url.searchParams.set('page_size', '10');
  url.searchParams.set('fields', 'code,product_name,product_name_he,nutriments');
  const response = await fetch(url.toString(), { signal });
  if (!response.ok) throw new Error(`Open Food Facts search failed with status ${response.status}`);
  return parseOpenFoodFactsSearchResponse(await response.json());
}

export async function getOpenFoodFactsProduct(barcode: string, signal?: AbortSignal): Promise<OpenFoodFactsResult | null> {
  const url = new URL(`${OFF_PRODUCT_URL}/${barcode}.json`);
  url.searchParams.set('fields', 'code,product_name,product_name_he,nutriments');
  const response = await fetch(url.toString(), { signal });
  if (!response.ok) throw new Error(`Open Food Facts product lookup failed with status ${response.status}`);
  const data = (await response.json()) as { product?: unknown };
  return parseOpenFoodFactsProduct(data.product);
}
