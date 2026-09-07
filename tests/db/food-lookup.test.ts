import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppDatabase } from '@/db/database';
import { ensureSeedData } from '@/db/seed';
import { parseFoodTextWithLookup, resolveFoodReference } from '@/features/nutrition/food-lookup';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('resolveFoodReference', () => {
  it('returns a local seed match without making any network request', async () => {
    const db = new AppDatabase('test-food-lookup-1');
    await ensureSeedData(db);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await resolveFoodReference('אורז', db);
    expect(result?.id).toBe('rice-white-cooked');
    expect(fetchMock).not.toHaveBeenCalled();

    await db.delete();
  });

  it('falls back to USDA when no local match exists and an API key is configured, then caches the result', async () => {
    const db = new AppDatabase('test-food-lookup-2');
    await ensureSeedData(db);
    await db.appSettings.update('settings', { usdaApiKey: 'test-key' });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          foods: [{ fdcId: 42, description: 'Exotic fruit' }],
          fdcId: 42,
          description: 'Exotic fruit',
          foodNutrients: [
            { nutrient: { number: '208' }, amount: 55 },
            { nutrient: { number: '203' }, amount: 2 },
          ],
        }),
      }),
    );

    const result = await resolveFoodReference('פרי אקזוטי לא קיים', db);
    expect(result).toMatchObject({ source: 'usda', sourceId: '42', kcalPer100g: 55, proteinPer100g: 2 });

    const cachedCount = await db.foodReferences.where('source').equals('usda').count();
    expect(cachedCount).toBe(1);

    // A second lookup for the same text should now hit the local cache, no new fetch.
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const second = await resolveFoodReference('פרי אקזוטי לא קיים', db);
    expect(second?.sourceId).toBe('42');
    expect(fetchMock).not.toHaveBeenCalled();

    await db.delete();
  });

  it('falls back to Open Food Facts when no API key is configured and USDA is skipped', async () => {
    const db = new AppDatabase('test-food-lookup-3');
    await ensureSeedData(db);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ products: [{ code: '111', product_name: 'Packaged snack', nutriments: { 'energy-kcal_100g': 400 } }] }),
      }),
    );

    const result = await resolveFoodReference('חטיף ארוז לא קיים', db);
    expect(result).toMatchObject({ source: 'open-food-facts', sourceId: '111', kcalPer100g: 400 });

    await db.delete();
  });

  it('returns null (for manual entry) when nothing matches anywhere', async () => {
    const db = new AppDatabase('test-food-lookup-4');
    await ensureSeedData(db);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ products: [] }) }));

    const result = await resolveFoodReference('משהו שלא קיים בשום מקום', db);
    expect(result).toBeNull();

    await db.delete();
  });
});

describe('parseFoodTextWithLookup', () => {
  it('parses the spec example sentence entirely from the local cache, with no network calls', async () => {
    const db = new AppDatabase('test-food-lookup-5');
    await ensureSeedData(db);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const entries = await parseFoodTextWithLookup('2 קבבים, 300 גרם אורז וכוס פיוז טי', db);
    expect(entries).toHaveLength(3);
    expect(entries.every((entry) => entry.matchedFood !== null && entry.estimate !== null)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();

    await db.delete();
  });

  it('resolves an unmatched item via Open Food Facts and fills in its estimate', async () => {
    const db = new AppDatabase('test-food-lookup-6');
    await ensureSeedData(db);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ products: [{ code: '222', product_name: 'מוצר לא מוכר', nutriments: { 'energy-kcal_100g': 150, proteins_100g: 5 } }] }),
      }),
    );

    const entries = await parseFoodTextWithLookup('200 גרם מוצר שלא קיים במאגר', db);
    expect(entries).toHaveLength(1);
    expect(entries[0].matchedFood).toMatchObject({ source: 'open-food-facts' });
    expect(entries[0].estimate).toMatchObject({ estimatedGrams: 200, kcal: 300, proteinGrams: 10 });

    await db.delete();
  });
});
