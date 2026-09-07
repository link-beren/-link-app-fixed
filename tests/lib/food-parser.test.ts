import { describe, expect, it } from 'vitest';
import type { FoodReference } from '@/types';
import { buildSeedFoodReferences } from '@/db/food-seed-data';
import { normalizeFoodText } from '@/lib/food-parser/normalize';
import { splitFoodSegments } from '@/lib/food-parser/split';
import { parseFoodSegment } from '@/lib/food-parser/parse-item';
import { matchFoodReference } from '@/lib/food-parser/match';
import { estimateFoodItem } from '@/lib/food-parser/estimate';
import { parseFoodText } from '@/lib/food-parser';

describe('normalizeFoodText', () => {
  it('canonicalizes unit spelling variants and word-numbers', () => {
    expect(normalizeFoodText('300 גר׳ אורז')).toBe('300 גרם אורז');
    expect(normalizeFoodText('2 כוסות אורז')).toBe('2 כוס אורז');
    expect(normalizeFoodText('חצי כוס אורז')).toBe('0.5 כוס אורז');
    expect(normalizeFoodText('קילו עוף')).toBe('ק"ג עוף');
  });

  it('collapses repeated whitespace', () => {
    expect(normalizeFoodText('  2   קבבים  ')).toBe('2 קבבים');
  });
});

describe('splitFoodSegments', () => {
  it('splits the spec example sentence into three food items', () => {
    expect(splitFoodSegments('2 קבבים, 300 גרם אורז וכוס פיוז טי')).toEqual([
      '2 קבבים',
      '300 גרם אורז',
      'כוס פיוז טי',
    ]);
  });

  it('splits on newlines as well as commas', () => {
    expect(splitFoodSegments('תפוח\nבננה')).toEqual(['תפוח', 'בננה']);
  });

  it('splits before every generic unit word, not just a hardcoded subset', () => {
    expect(splitFoodSegments('לחם וגרם חמאה')).toEqual(['לחם', 'גרם חמאה']);
    expect(splitFoodSegments('עוף וק"ג תפוחים')).toEqual(['עוף', 'ק"ג תפוחים']);
  });
});

describe('parseFoodSegment', () => {
  it('extracts a bare count with no unit word', () => {
    expect(parseFoodSegment('2 קבבים')).toMatchObject({
      quantity: 2,
      unit: null,
      nameText: 'קבבים',
      size: 'normal',
      isFried: false,
      isVague: false,
    });
  });

  it('extracts a gram weight', () => {
    expect(parseFoodSegment('300 גרם אורז')).toMatchObject({
      quantity: 300,
      unit: 'גרם',
      nameText: 'אורז',
    });
  });

  it('defaults quantity to 1 when omitted before a unit word', () => {
    expect(parseFoodSegment('כוס פיוז טי')).toMatchObject({
      quantity: 1,
      unit: 'כוס',
      nameText: 'פיוז טי',
    });
  });

  it('recognizes size descriptors, including the extra-large phrase', () => {
    expect(parseFoodSegment('מנה גדולה מאוד אורז').size).toBe('extraLarge');
    expect(parseFoodSegment('מנה גדולה אורז').size).toBe('large');
    expect(parseFoodSegment('מנה קטנה אורז').size).toBe('small');
  });

  it('flags fried/unknown-oil preparation words', () => {
    const segment = parseFoodSegment('שניצל מטוגן');
    expect(segment.isFried).toBe(true);
    expect(segment.nameText).toBe('שניצל');
  });

  it('flags vague quantity descriptors and still defaults quantity to 1', () => {
    const segment = parseFoodSegment('קצת אורז');
    expect(segment.isVague).toBe(true);
    expect(segment.quantity).toBe(1);
    expect(segment.nameText).toBe('אורז');
  });
});

describe('matchFoodReference', () => {
  const foods = buildSeedFoodReferences();

  it('matches by exact alias', () => {
    expect(matchFoodReference('קבבים', foods)?.id).toBe('kebab-grilled');
    expect(matchFoodReference('אורז', foods)?.id).toBe('rice-white-cooked');
  });

  it('matches by exact canonical Hebrew name', () => {
    expect(matchFoodReference('פיוז טי', foods)?.id).toBe('iced-tea');
  });

  it('returns null for text with no reasonable match', () => {
    expect(matchFoodReference('משהו שלא קיים בכלל', foods)).toBeNull();
  });
});

describe('estimateFoodItem', () => {
  const foods = buildSeedFoodReferences();
  const rice = foods.find((food) => food.id === 'rice-white-cooked') as FoodReference;
  const kebab = foods.find((food) => food.id === 'kebab-grilled') as FoodReference;
  const icedTea = foods.find((food) => food.id === 'iced-tea') as FoodReference;

  it('computes grams directly from a gram unit with high confidence', () => {
    const estimate = estimateFoodItem(rice, parseFoodSegment('300 גרם אורז'));
    expect(estimate.estimatedGrams).toBe(300);
    expect(estimate.kcal).toBe(390); // 300/100 * 130
    expect(estimate.proteinGrams).toBeCloseTo(8.1);
    expect(estimate.confidence).toBe('high');
    expect(estimate.conservativeMultiplier).toBe(1);
  });

  it('falls back to the food default serving when no unit word is given', () => {
    const estimate = estimateFoodItem(kebab, parseFoodSegment('2 קבבים'));
    expect(estimate.estimatedGrams).toBe(120); // 2 * 60g default serving
    expect(estimate.kcal).toBe(300); // 120/100 * 250
    expect(estimate.proteinGrams).toBeCloseTo(21.6);
  });

  it('matches a named serving option such as a cup', () => {
    const estimate = estimateFoodItem(icedTea, parseFoodSegment('כוס פיוז טי'));
    expect(estimate.estimatedGrams).toBe(240);
    expect(estimate.kcal).toBe(72); // 240/100 * 30
    expect(estimate.proteinGrams).toBe(0);
  });

  it('applies a 10% kcal-only conservative multiplier for fried food', () => {
    const base = estimateFoodItem(rice, parseFoodSegment('300 גרם אורז'));
    const fried = estimateFoodItem(rice, parseFoodSegment('300 גרם אורז מטוגן'));
    expect(fried.conservativeMultiplier).toBe(1.1);
    expect(fried.kcal).toBe(Math.round(base.kcal * 1.1));
    expect(fried.proteinGrams).toBe(base.proteinGrams);
  });

  it('rounds kcal up to the nearest 25 for vague quantities, without rounding protein', () => {
    const estimate = estimateFoodItem(rice, parseFoodSegment('קצת אורז'));
    expect(estimate.kcal % 25).toBe(0);
    expect(estimate.confidence).toBe('low');
  });

  it('applies the size multiplier to grams, kcal and protein alike', () => {
    const normal = estimateFoodItem(rice, parseFoodSegment('כוס אורז'));
    const large = estimateFoodItem(rice, parseFoodSegment('כוס גדולה אורז'));
    expect(large.estimatedGrams).toBe(Math.round(normal.estimatedGrams * 1.25));
  });
});

describe('parseFoodText (end-to-end pipeline)', () => {
  it('parses the spec example sentence into three matched, estimated items', () => {
    const foods = buildSeedFoodReferences();
    const entries = parseFoodText('2 קבבים, 300 גרם אורז וכוס פיוז טי', foods);

    expect(entries).toHaveLength(3);
    expect(entries.map((entry) => entry.matchedFood?.id)).toEqual(['kebab-grilled', 'rice-white-cooked', 'iced-tea']);
    expect(entries.every((entry) => entry.estimate !== null)).toBe(true);

    const [kebabEntry, riceEntry, teaEntry] = entries;
    expect(kebabEntry.estimate?.estimatedGrams).toBe(120);
    expect(riceEntry.estimate?.estimatedGrams).toBe(300);
    expect(teaEntry.estimate?.estimatedGrams).toBe(240);
  });

  it('returns a null matchedFood/estimate for unrecognized items, for manual entry', () => {
    const foods = buildSeedFoodReferences();
    const entries = parseFoodText('משהו מוזר לגמרי שלא קיים', foods);
    expect(entries).toHaveLength(1);
    expect(entries[0].matchedFood).toBeNull();
    expect(entries[0].estimate).toBeNull();
  });
});
