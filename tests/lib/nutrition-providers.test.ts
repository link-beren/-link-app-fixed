import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getUsdaFoodDetails,
  parseUsdaDetailsResponse,
  parseUsdaSearchResponse,
  searchUsdaFoods,
} from '@/lib/nutrition-providers/usda';
import {
  getOpenFoodFactsProduct,
  parseOpenFoodFactsProduct,
  parseOpenFoodFactsSearchResponse,
  searchOpenFoodFacts,
} from '@/lib/nutrition-providers/open-food-facts';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('USDA FoodData Central parsing', () => {
  it('parses a search response into id/description pairs', () => {
    const results = parseUsdaSearchResponse({
      foods: [
        { fdcId: 123, description: 'Chicken breast, cooked' },
        { fdcId: 456 }, // missing description: dropped
      ],
    });
    expect(results).toEqual([{ fdcId: 123, description: 'Chicken breast, cooked' }]);
  });

  it('extracts kcal (nutrient 208) and protein (nutrient 203) per 100g from a details response', () => {
    const details = parseUsdaDetailsResponse({
      fdcId: 123,
      description: 'Chicken breast, cooked',
      foodNutrients: [
        { nutrient: { number: '203' }, amount: 31 },
        { nutrient: { number: '208' }, amount: 165 },
        { nutrient: { number: '204' }, amount: 3.6 }, // fat: ignored
      ],
    });
    expect(details).toEqual({ fdcId: 123, description: 'Chicken breast, cooked', kcalPer100g: 165, proteinPer100g: 31 });
  });

  it('returns null for a details response missing required fields', () => {
    expect(parseUsdaDetailsResponse({})).toBeNull();
  });

  it('fetches and parses a search request using the configured API key', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ foods: [{ fdcId: 1, description: 'Rice, white, cooked' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const results = await searchUsdaFoods('rice', 'test-key');
    expect(results).toEqual([{ fdcId: 1, description: 'Rice, white, cooked' }]);
    const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requestedUrl.searchParams.get('api_key')).toBe('test-key');
    expect(requestedUrl.searchParams.get('query')).toBe('rice');
  });

  it('throws when the USDA details request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    await expect(getUsdaFoodDetails(1, 'bad-key')).rejects.toThrow('403');
  });
});

describe('Open Food Facts parsing', () => {
  it('parses a product, preferring the Hebrew name when available', () => {
    const result = parseOpenFoodFactsProduct({
      code: '012345',
      product_name: 'Iced tea',
      product_name_he: 'פיוז טי',
      nutriments: { 'energy-kcal_100g': 30, proteins_100g: 0 },
    });
    expect(result).toEqual({ barcode: '012345', productName: 'פיוז טי', kcalPer100g: 30, proteinPer100g: 0 });
  });

  it('returns null for a product with no name', () => {
    expect(parseOpenFoodFactsProduct({ code: '1', nutriments: {} })).toBeNull();
    expect(parseOpenFoodFactsProduct(null)).toBeNull();
  });

  it('parses a search response into a list of products, dropping unnamed ones', () => {
    const results = parseOpenFoodFactsSearchResponse({
      products: [
        { code: '1', product_name: 'Cola', nutriments: { 'energy-kcal_100g': 42 } },
        { code: '2', nutriments: {} },
      ],
    });
    expect(results).toEqual([{ barcode: '1', productName: 'Cola', kcalPer100g: 42, proteinPer100g: 0 }]);
  });

  it('fetches and parses a search request without requiring an API key', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ products: [{ code: '1', product_name: 'Cola', nutriments: { 'energy-kcal_100g': 42 } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const results = await searchOpenFoodFacts('cola');
    expect(results).toEqual([{ barcode: '1', productName: 'Cola', kcalPer100g: 42, proteinPer100g: 0 }]);
    const requestedUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requestedUrl.searchParams.get('search_terms')).toBe('cola');
  });

  it('fetches and parses a single product lookup by barcode', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ product: { code: '999', product_name: 'Water', nutriments: {} } }),
      }),
    );
    const result = await getOpenFoodFactsProduct('999');
    expect(result).toEqual({ barcode: '999', productName: 'Water', kcalPer100g: 0, proteinPer100g: 0 });
  });
});
