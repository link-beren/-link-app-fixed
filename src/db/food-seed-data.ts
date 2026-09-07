import type { FoodReference } from '@/types';

/**
 * Offline starter food database (spec 11.7). Per-100g values approximate
 * standard USDA FoodData Central / generic public nutrition-fact figures for
 * common preparations (cooked/prepared unless noted) — not invented. This is
 * a starting point only: live USDA and Open Food Facts lookups (when a USDA
 * key is configured / for packaged products) take precedence and are cached
 * on top of this table over time.
 */
interface SeedFood {
  id: string;
  canonicalNameHe: string;
  canonicalNameEn: string;
  aliases: string[];
  kcalPer100g: number;
  proteinPer100g: number;
  servingOptions: Array<{ label: string; grams: number }>;
}

const SEED_FOODS: SeedFood[] = [
  // Grains, starches, bread
  { id: 'rice-white-cooked', canonicalNameHe: 'אורז לבן מבושל', canonicalNameEn: 'White rice, cooked', aliases: ['אורז', 'אורז לבן'], kcalPer100g: 130, proteinPer100g: 2.7, servingOptions: [{ label: 'כוס', grams: 158 }, { label: 'מנה', grams: 150 }] },
  { id: 'rice-brown-cooked', canonicalNameHe: 'אורז מלא מבושל', canonicalNameEn: 'Brown rice, cooked', aliases: ['אורז מלא'], kcalPer100g: 123, proteinPer100g: 2.7, servingOptions: [{ label: 'כוס', grams: 195 }, { label: 'מנה', grams: 150 }] },
  { id: 'pasta-cooked', canonicalNameHe: 'פסטה מבושלת', canonicalNameEn: 'Pasta, cooked', aliases: ['פסטה', 'ספגטי', 'מקרוני'], kcalPer100g: 158, proteinPer100g: 5.8, servingOptions: [{ label: 'מנה', grams: 200 }, { label: 'כוס', grams: 140 }] },
  { id: 'couscous-cooked', canonicalNameHe: 'קוסקוס מבושל', canonicalNameEn: 'Couscous, cooked', aliases: ['קוסקוס'], kcalPer100g: 112, proteinPer100g: 3.8, servingOptions: [{ label: 'כוס', grams: 157 }, { label: 'מנה', grams: 150 }] },
  { id: 'quinoa-cooked', canonicalNameHe: 'קינואה מבושלת', canonicalNameEn: 'Quinoa, cooked', aliases: ['קינואה'], kcalPer100g: 120, proteinPer100g: 4.4, servingOptions: [{ label: 'כוס', grams: 185 }, { label: 'מנה', grams: 150 }] },
  { id: 'oats-cooked', canonicalNameHe: 'שיבולת שועל מבושלת', canonicalNameEn: 'Oatmeal, cooked', aliases: ['שיבולת שועל', 'קוואקר', 'דייסה'], kcalPer100g: 71, proteinPer100g: 2.5, servingOptions: [{ label: 'כוס', grams: 234 }, { label: 'מנה', grams: 200 }] },
  { id: 'bread-white', canonicalNameHe: 'לחם לבן', canonicalNameEn: 'White bread', aliases: ['לחם'], kcalPer100g: 265, proteinPer100g: 9, servingOptions: [{ label: 'פרוסה', grams: 30 }] },
  { id: 'bread-whole-wheat', canonicalNameHe: 'לחם מלא', canonicalNameEn: 'Whole wheat bread', aliases: ['לחם שיפון', 'לחם דגנים'], kcalPer100g: 247, proteinPer100g: 13, servingOptions: [{ label: 'פרוסה', grams: 30 }] },
  { id: 'pita', canonicalNameHe: 'פיתה', canonicalNameEn: 'Pita bread', aliases: ['פיתות'], kcalPer100g: 275, proteinPer100g: 9, servingOptions: [{ label: 'יחידה', grams: 60 }] },
  { id: 'challah', canonicalNameHe: 'חלה', canonicalNameEn: 'Challah bread', aliases: [], kcalPer100g: 290, proteinPer100g: 8, servingOptions: [{ label: 'פרוסה', grams: 50 }] },
  { id: 'potato-cooked', canonicalNameHe: 'תפוח אדמה מבושל', canonicalNameEn: 'Potato, boiled', aliases: ['תפוח אדמה', 'תפוחי אדמה', 'בטטה מבושלת'], kcalPer100g: 87, proteinPer100g: 1.9, servingOptions: [{ label: 'יחידה בינונית', grams: 170 }] },
  { id: 'sweet-potato-cooked', canonicalNameHe: 'בטטה אפויה', canonicalNameEn: 'Sweet potato, baked', aliases: ['בטטה'], kcalPer100g: 90, proteinPer100g: 2, servingOptions: [{ label: 'יחידה בינונית', grams: 180 }] },
  { id: 'french-fries', canonicalNameHe: 'צ׳יפס', canonicalNameEn: 'French fries', aliases: ['תפוגן', 'טוגנים'], kcalPer100g: 312, proteinPer100g: 3.4, servingOptions: [{ label: 'מנה', grams: 150 }] },

  // Proteins: meat, poultry, fish, eggs
  { id: 'chicken-breast-cooked', canonicalNameHe: 'חזה עוף מבושל', canonicalNameEn: 'Chicken breast, cooked', aliases: ['חזה עוף', 'פרגית'], kcalPer100g: 165, proteinPer100g: 31, servingOptions: [{ label: 'מנה', grams: 150 }, { label: 'יחידה', grams: 120 }] },
  { id: 'chicken-thigh-cooked', canonicalNameHe: 'שוק עוף מבושל', canonicalNameEn: 'Chicken thigh, cooked', aliases: ['שוק עוף', 'ירך עוף'], kcalPer100g: 209, proteinPer100g: 26, servingOptions: [{ label: 'יחידה', grams: 120 }] },
  { id: 'chicken-wings-cooked', canonicalNameHe: 'כנפי עוף', canonicalNameEn: 'Chicken wings, cooked', aliases: ['כנפיים', 'כנפי עוף אפויות'], kcalPer100g: 203, proteinPer100g: 30, servingOptions: [{ label: 'יחידה', grams: 30 }, { label: 'מנה', grams: 200 }] },
  { id: 'turkey-breast-cooked', canonicalNameHe: 'חזה הודו מבושל', canonicalNameEn: 'Turkey breast, cooked', aliases: ['הודו', 'חזה הודו'], kcalPer100g: 135, proteinPer100g: 30, servingOptions: [{ label: 'מנה', grams: 150 }] },
  { id: 'kebab-grilled', canonicalNameHe: 'קבב', canonicalNameEn: 'Kebab, grilled', aliases: ['קבבים', 'קבב על האש'], kcalPer100g: 250, proteinPer100g: 18, servingOptions: [{ label: 'יחידה', grams: 60 }] },
  { id: 'ground-beef-cooked', canonicalNameHe: 'בשר טחון מבושל', canonicalNameEn: 'Ground beef, cooked', aliases: ['בשר טחון', 'קציצות'], kcalPer100g: 254, proteinPer100g: 26, servingOptions: [{ label: 'מנה', grams: 150 }] },
  { id: 'beef-steak-cooked', canonicalNameHe: 'סטייק בקר', canonicalNameEn: 'Beef steak, cooked', aliases: ['אנטריקוט', 'פילה בקר', 'סטייק'], kcalPer100g: 271, proteinPer100g: 25, servingOptions: [{ label: 'מנה', grams: 200 }] },
  { id: 'shawarma', canonicalNameHe: 'שווארמה', canonicalNameEn: 'Shawarma', aliases: [], kcalPer100g: 220, proteinPer100g: 20, servingOptions: [{ label: 'מנה', grams: 200 }] },
  { id: 'schnitzel', canonicalNameHe: 'שניצל', canonicalNameEn: 'Chicken schnitzel, fried', aliases: ['שניצל עוף'], kcalPer100g: 280, proteinPer100g: 20, servingOptions: [{ label: 'יחידה', grams: 150 }] },
  { id: 'salmon-cooked', canonicalNameHe: 'סלמון מבושל', canonicalNameEn: 'Salmon, cooked', aliases: ['סלמון'], kcalPer100g: 208, proteinPer100g: 20, servingOptions: [{ label: 'מנה', grams: 150 }] },
  { id: 'tuna-canned', canonicalNameHe: 'טונה משומרת', canonicalNameEn: 'Tuna, canned in water', aliases: ['טונה'], kcalPer100g: 116, proteinPer100g: 26, servingOptions: [{ label: 'קופסה', grams: 140 }] },
  { id: 'tilapia-cooked', canonicalNameHe: 'אמנון מבושל', canonicalNameEn: 'Tilapia, cooked', aliases: ['אמנון', 'דג לבן'], kcalPer100g: 128, proteinPer100g: 26, servingOptions: [{ label: 'מנה', grams: 150 }] },
  { id: 'egg-cooked', canonicalNameHe: 'ביצה מבושלת', canonicalNameEn: 'Egg, cooked', aliases: ['ביצה', 'ביצים', 'חביתה'], kcalPer100g: 155, proteinPer100g: 13, servingOptions: [{ label: 'יחידה', grams: 50 }] },
  { id: 'tofu', canonicalNameHe: 'טופו', canonicalNameEn: 'Tofu', aliases: [], kcalPer100g: 76, proteinPer100g: 8, servingOptions: [{ label: 'מנה', grams: 150 }] },

  // Legumes
  { id: 'hummus', canonicalNameHe: 'חומוס', canonicalNameEn: 'Hummus', aliases: [], kcalPer100g: 166, proteinPer100g: 8, servingOptions: [{ label: 'מנה', grams: 200 }, { label: 'כף', grams: 15 }] },
  { id: 'lentils-cooked', canonicalNameHe: 'עדשים מבושלות', canonicalNameEn: 'Lentils, cooked', aliases: ['עדשים'], kcalPer100g: 116, proteinPer100g: 9, servingOptions: [{ label: 'כוס', grams: 198 }] },
  { id: 'chickpeas-cooked', canonicalNameHe: 'חומוס גרגירים מבושל', canonicalNameEn: 'Chickpeas, cooked', aliases: ['גרגירי חומוס'], kcalPer100g: 164, proteinPer100g: 9, servingOptions: [{ label: 'כוס', grams: 164 }] },
  { id: 'black-beans-cooked', canonicalNameHe: 'שעועית שחורה מבושלת', canonicalNameEn: 'Black beans, cooked', aliases: ['שעועית שחורה'], kcalPer100g: 132, proteinPer100g: 8.9, servingOptions: [{ label: 'כוס', grams: 172 }] },
  { id: 'kidney-beans-cooked', canonicalNameHe: 'שעועית אדומה מבושלת', canonicalNameEn: 'Kidney beans, cooked', aliases: ['שעועית אדומה', 'שעועית'], kcalPer100g: 127, proteinPer100g: 8.7, servingOptions: [{ label: 'כוס', grams: 177 }] },
  { id: 'edamame', canonicalNameHe: 'אדממה', canonicalNameEn: 'Edamame', aliases: ['פולי סויה'], kcalPer100g: 122, proteinPer100g: 11, servingOptions: [{ label: 'מנה', grams: 150 }] },
  { id: 'falafel', canonicalNameHe: 'פלאפל', canonicalNameEn: 'Falafel', aliases: [], kcalPer100g: 333, proteinPer100g: 13, servingOptions: [{ label: 'כדור', grams: 17 }, { label: 'מנה', grams: 120 }] },

  // Dairy
  { id: 'milk-3', canonicalNameHe: 'חלב 3%', canonicalNameEn: 'Milk, whole', aliases: ['חלב'], kcalPer100g: 61, proteinPer100g: 3.2, servingOptions: [{ label: 'כוס', grams: 244 }] },
  { id: 'milk-1', canonicalNameHe: 'חלב 1%', canonicalNameEn: 'Milk, low-fat', aliases: ['חלב דל שומן'], kcalPer100g: 42, proteinPer100g: 3.4, servingOptions: [{ label: 'כוס', grams: 244 }] },
  { id: 'chocolate-milk', canonicalNameHe: 'שוקו', canonicalNameEn: 'Chocolate milk', aliases: ['חלב שוקולד'], kcalPer100g: 83, proteinPer100g: 3.2, servingOptions: [{ label: 'כוס', grams: 244 }] },
  { id: 'yogurt-plain', canonicalNameHe: 'יוגורט טבעי', canonicalNameEn: 'Plain yogurt', aliases: ['יוגורט'], kcalPer100g: 61, proteinPer100g: 3.5, servingOptions: [{ label: 'גביע', grams: 150 }] },
  { id: 'greek-yogurt', canonicalNameHe: 'יוגורט יווני', canonicalNameEn: 'Greek yogurt', aliases: [], kcalPer100g: 97, proteinPer100g: 9, servingOptions: [{ label: 'גביע', grams: 150 }] },
  { id: 'cottage-cheese-5', canonicalNameHe: 'קוטג׳ 5%', canonicalNameEn: 'Cottage cheese, 5%', aliases: ['קוטג׳'], kcalPer100g: 98, proteinPer100g: 11, servingOptions: [{ label: 'גביע', grams: 250 }] },
  { id: 'labaneh', canonicalNameHe: 'לבנה', canonicalNameEn: 'Labneh', aliases: [], kcalPer100g: 130, proteinPer100g: 5, servingOptions: [{ label: 'כף', grams: 20 }] },
  { id: 'cream-cheese', canonicalNameHe: 'גבינה לבנה', canonicalNameEn: 'Cream cheese, spreadable', aliases: ['גבינת שמנת'], kcalPer100g: 175, proteinPer100g: 7, servingOptions: [{ label: 'כף', grams: 20 }] },
  { id: 'yellow-cheese', canonicalNameHe: 'גבינה צהובה', canonicalNameEn: 'Semi-hard cheese', aliases: ['גבינה קשה'], kcalPer100g: 350, proteinPer100g: 25, servingOptions: [{ label: 'פרוסה', grams: 25 }] },
  { id: 'feta-cheese', canonicalNameHe: 'גבינת פטה', canonicalNameEn: 'Feta cheese', aliases: ['פטה', 'גבינה בולגרית'], kcalPer100g: 264, proteinPer100g: 14, servingOptions: [{ label: 'מנה', grams: 50 }] },

  // Vegetables
  { id: 'tomato', canonicalNameHe: 'עגבנייה', canonicalNameEn: 'Tomato', aliases: ['עגבניות'], kcalPer100g: 18, proteinPer100g: 0.9, servingOptions: [{ label: 'יחידה', grams: 120 }] },
  { id: 'cucumber', canonicalNameHe: 'מלפפון', canonicalNameEn: 'Cucumber', aliases: ['מלפפונים'], kcalPer100g: 15, proteinPer100g: 0.7, servingOptions: [{ label: 'יחידה', grams: 120 }] },
  { id: 'bell-pepper', canonicalNameHe: 'פלפל', canonicalNameEn: 'Bell pepper', aliases: ['פלפלים'], kcalPer100g: 31, proteinPer100g: 1, servingOptions: [{ label: 'יחידה', grams: 120 }] },
  { id: 'onion', canonicalNameHe: 'בצל', canonicalNameEn: 'Onion', aliases: [], kcalPer100g: 40, proteinPer100g: 1.1, servingOptions: [{ label: 'יחידה', grams: 110 }] },
  { id: 'carrot', canonicalNameHe: 'גזר', canonicalNameEn: 'Carrot', aliases: ['גזרים'], kcalPer100g: 41, proteinPer100g: 0.9, servingOptions: [{ label: 'יחידה', grams: 60 }] },
  { id: 'zucchini-cooked', canonicalNameHe: 'קישוא מבושל', canonicalNameEn: 'Zucchini, cooked', aliases: ['קישוא', 'קישואים'], kcalPer100g: 17, proteinPer100g: 1.2, servingOptions: [{ label: 'מנה', grams: 150 }] },
  { id: 'eggplant-cooked', canonicalNameHe: 'חציל מבושל', canonicalNameEn: 'Eggplant, cooked', aliases: ['חציל', 'חצילים'], kcalPer100g: 35, proteinPer100g: 0.8, servingOptions: [{ label: 'מנה', grams: 150 }] },
  { id: 'lettuce', canonicalNameHe: 'חסה', canonicalNameEn: 'Lettuce', aliases: [], kcalPer100g: 15, proteinPer100g: 1.4, servingOptions: [{ label: 'מנה', grams: 60 }] },
  { id: 'cabbage', canonicalNameHe: 'כרוב', canonicalNameEn: 'Cabbage', aliases: [], kcalPer100g: 25, proteinPer100g: 1.3, servingOptions: [{ label: 'מנה', grams: 100 }] },
  { id: 'broccoli-cooked', canonicalNameHe: 'ברוקולי מבושל', canonicalNameEn: 'Broccoli, cooked', aliases: ['ברוקולי'], kcalPer100g: 35, proteinPer100g: 2.4, servingOptions: [{ label: 'מנה', grams: 150 }] },
  { id: 'spinach-cooked', canonicalNameHe: 'תרד מבושל', canonicalNameEn: 'Spinach, cooked', aliases: ['תרד'], kcalPer100g: 23, proteinPer100g: 3, servingOptions: [{ label: 'מנה', grams: 150 }] },
  { id: 'corn-cooked', canonicalNameHe: 'תירס מבושל', canonicalNameEn: 'Corn, cooked', aliases: ['תירס'], kcalPer100g: 96, proteinPer100g: 3.4, servingOptions: [{ label: 'קלח', grams: 150 }] },
  { id: 'mushroom-cooked', canonicalNameHe: 'פטריות מבושלות', canonicalNameEn: 'Mushrooms, cooked', aliases: ['פטריות'], kcalPer100g: 28, proteinPer100g: 2.5, servingOptions: [{ label: 'מנה', grams: 100 }] },
  { id: 'israeli-salad', canonicalNameHe: 'סלט ישראלי', canonicalNameEn: 'Israeli salad', aliases: ['סלט קצוץ'], kcalPer100g: 35, proteinPer100g: 1, servingOptions: [{ label: 'מנה', grams: 150 }] },

  // Fruits
  { id: 'apple', canonicalNameHe: 'תפוח עץ', canonicalNameEn: 'Apple', aliases: ['תפוח'], kcalPer100g: 52, proteinPer100g: 0.3, servingOptions: [{ label: 'יחידה', grams: 180 }] },
  { id: 'banana', canonicalNameHe: 'בננה', canonicalNameEn: 'Banana', aliases: [], kcalPer100g: 89, proteinPer100g: 1.1, servingOptions: [{ label: 'יחידה', grams: 120 }] },
  { id: 'orange', canonicalNameHe: 'תפוז', canonicalNameEn: 'Orange', aliases: [], kcalPer100g: 47, proteinPer100g: 0.9, servingOptions: [{ label: 'יחידה', grams: 180 }] },
  { id: 'grapes', canonicalNameHe: 'ענבים', canonicalNameEn: 'Grapes', aliases: [], kcalPer100g: 69, proteinPer100g: 0.7, servingOptions: [{ label: 'כוס', grams: 150 }] },
  { id: 'watermelon', canonicalNameHe: 'אבטיח', canonicalNameEn: 'Watermelon', aliases: [], kcalPer100g: 30, proteinPer100g: 0.6, servingOptions: [{ label: 'פרוסה', grams: 280 }] },
  { id: 'strawberries', canonicalNameHe: 'תותים', canonicalNameEn: 'Strawberries', aliases: ['תות'], kcalPer100g: 32, proteinPer100g: 0.7, servingOptions: [{ label: 'כוס', grams: 150 }] },
  { id: 'mango', canonicalNameHe: 'מנגו', canonicalNameEn: 'Mango', aliases: [], kcalPer100g: 60, proteinPer100g: 0.8, servingOptions: [{ label: 'יחידה', grams: 200 }] },
  { id: 'dates', canonicalNameHe: 'תמרים', canonicalNameEn: 'Dates', aliases: ['תמר'], kcalPer100g: 282, proteinPer100g: 2.5, servingOptions: [{ label: 'יחידה', grams: 24 }] },
  { id: 'avocado', canonicalNameHe: 'אבוקדו', canonicalNameEn: 'Avocado', aliases: [], kcalPer100g: 160, proteinPer100g: 2, servingOptions: [{ label: 'יחידה', grams: 150 }] },
  { id: 'pomegranate', canonicalNameHe: 'רימון', canonicalNameEn: 'Pomegranate', aliases: [], kcalPer100g: 83, proteinPer100g: 1.7, servingOptions: [{ label: 'יחידה', grams: 280 }] },

  // Nuts, seeds, spreads
  { id: 'almonds', canonicalNameHe: 'שקדים', canonicalNameEn: 'Almonds', aliases: [], kcalPer100g: 579, proteinPer100g: 21, servingOptions: [{ label: 'כף', grams: 15 }, { label: 'כוס', grams: 143 }] },
  { id: 'peanuts', canonicalNameHe: 'בוטנים', canonicalNameEn: 'Peanuts', aliases: [], kcalPer100g: 567, proteinPer100g: 26, servingOptions: [{ label: 'כף', grams: 15 }] },
  { id: 'cashews', canonicalNameHe: 'קשיו', canonicalNameEn: 'Cashews', aliases: [], kcalPer100g: 553, proteinPer100g: 18, servingOptions: [{ label: 'כף', grams: 15 }] },
  { id: 'walnuts', canonicalNameHe: 'אגוזי מלך', canonicalNameEn: 'Walnuts', aliases: ['אגוזים'], kcalPer100g: 654, proteinPer100g: 15, servingOptions: [{ label: 'כף', grams: 15 }] },
  { id: 'sunflower-seeds', canonicalNameHe: 'גרעינים', canonicalNameEn: 'Sunflower seeds', aliases: ['גרעיני חמנייה'], kcalPer100g: 584, proteinPer100g: 21, servingOptions: [{ label: 'כף', grams: 15 }] },
  { id: 'tahini', canonicalNameHe: 'טחינה', canonicalNameEn: 'Tahini', aliases: ['טחינה גולמית'], kcalPer100g: 595, proteinPer100g: 17, servingOptions: [{ label: 'כף', grams: 15 }] },
  { id: 'peanut-butter', canonicalNameHe: 'חמאת בוטנים', canonicalNameEn: 'Peanut butter', aliases: [], kcalPer100g: 588, proteinPer100g: 25, servingOptions: [{ label: 'כף', grams: 16 }] },

  // Oils and condiments
  { id: 'olive-oil', canonicalNameHe: 'שמן זית', canonicalNameEn: 'Olive oil', aliases: ['שמן'], kcalPer100g: 884, proteinPer100g: 0, servingOptions: [{ label: 'כף', grams: 14 }] },
  { id: 'mayonnaise', canonicalNameHe: 'מיונז', canonicalNameEn: 'Mayonnaise', aliases: [], kcalPer100g: 680, proteinPer100g: 1, servingOptions: [{ label: 'כף', grams: 14 }] },
  { id: 'ketchup', canonicalNameHe: 'קטשופ', canonicalNameEn: 'Ketchup', aliases: [], kcalPer100g: 112, proteinPer100g: 1.2, servingOptions: [{ label: 'כף', grams: 17 }] },
  { id: 'silan', canonicalNameHe: 'סילאן', canonicalNameEn: 'Date syrup', aliases: ['דבש תמרים'], kcalPer100g: 285, proteinPer100g: 1, servingOptions: [{ label: 'כף', grams: 20 }] },
  { id: 'honey', canonicalNameHe: 'דבש', canonicalNameEn: 'Honey', aliases: [], kcalPer100g: 304, proteinPer100g: 0.3, servingOptions: [{ label: 'כף', grams: 21 }] },

  // Snacks and sweets
  { id: 'chocolate-milk-bar', canonicalNameHe: 'שוקולד חלב', canonicalNameEn: 'Milk chocolate', aliases: ['שוקולד'], kcalPer100g: 535, proteinPer100g: 7.7, servingOptions: [{ label: 'חפיסה', grams: 100 }, { label: 'קוביה', grams: 10 }] },
  { id: 'cookies-plain', canonicalNameHe: 'עוגיות', canonicalNameEn: 'Plain cookies', aliases: ['עוגייה', 'ביסקוויט'], kcalPer100g: 480, proteinPer100g: 6, servingOptions: [{ label: 'יחידה', grams: 15 }] },
  { id: 'ice-cream', canonicalNameHe: 'גלידה', canonicalNameEn: 'Ice cream', aliases: [], kcalPer100g: 207, proteinPer100g: 3.5, servingOptions: [{ label: 'כדור', grams: 60 }] },
  { id: 'bamba', canonicalNameHe: 'במבה', canonicalNameEn: 'Bamba (peanut snack)', aliases: [], kcalPer100g: 545, proteinPer100g: 13, servingOptions: [{ label: 'שקית', grams: 25 }] },
  { id: 'bissli', canonicalNameHe: 'ביסלי', canonicalNameEn: 'Bissli (wheat snack)', aliases: [], kcalPer100g: 480, proteinPer100g: 9, servingOptions: [{ label: 'שקית', grams: 25 }] },
  { id: 'potato-chips', canonicalNameHe: 'צ׳יפס תפוצ׳יפס', canonicalNameEn: 'Potato chips', aliases: ['ציפס שקית', 'תפוצ׳יפס'], kcalPer100g: 536, proteinPer100g: 7, servingOptions: [{ label: 'שקית', grams: 40 }] },
  { id: 'halva', canonicalNameHe: 'חלבה', canonicalNameEn: 'Halva', aliases: [], kcalPer100g: 500, proteinPer100g: 11, servingOptions: [{ label: 'פרוסה', grams: 40 }] },
  { id: 'popcorn', canonicalNameHe: 'פופקורן', canonicalNameEn: 'Popcorn', aliases: [], kcalPer100g: 387, proteinPer100g: 13, servingOptions: [{ label: 'כוס', grams: 8 }] },
  { id: 'protein-bar', canonicalNameHe: 'חטיף חלבון', canonicalNameEn: 'Protein bar', aliases: ['פרוטין בר'], kcalPer100g: 375, proteinPer100g: 30, servingOptions: [{ label: 'יחידה', grams: 60 }] },

  // Beverages
  { id: 'water', canonicalNameHe: 'מים', canonicalNameEn: 'Water', aliases: [], kcalPer100g: 0, proteinPer100g: 0, servingOptions: [{ label: 'כוס', grams: 240 }, { label: 'בקבוק', grams: 500 }] },
  { id: 'cola', canonicalNameHe: 'קולה', canonicalNameEn: 'Cola', aliases: ['קוקה קולה', 'משקה קל'], kcalPer100g: 42, proteinPer100g: 0, servingOptions: [{ label: 'כוס', grams: 240 }, { label: 'פחית', grams: 330 }] },
  { id: 'diet-cola', canonicalNameHe: 'קולה זירו', canonicalNameEn: 'Diet cola', aliases: ['קולה דיאט'], kcalPer100g: 0.3, proteinPer100g: 0, servingOptions: [{ label: 'פחית', grams: 330 }] },
  { id: 'orange-juice', canonicalNameHe: 'מיץ תפוזים', canonicalNameEn: 'Orange juice', aliases: ['מיץ'], kcalPer100g: 45, proteinPer100g: 0.7, servingOptions: [{ label: 'כוס', grams: 240 }] },
  { id: 'iced-tea', canonicalNameHe: 'פיוז טי', canonicalNameEn: 'Sweetened iced tea', aliases: ['תה קר', 'ניצת קר', 'פיוזטי'], kcalPer100g: 30, proteinPer100g: 0, servingOptions: [{ label: 'כוס', grams: 240 }, { label: 'בקבוק', grams: 500 }] },
  { id: 'beer', canonicalNameHe: 'בירה', canonicalNameEn: 'Beer', aliases: [], kcalPer100g: 43, proteinPer100g: 0.5, servingOptions: [{ label: 'פחית', grams: 330 }] },
  { id: 'red-wine', canonicalNameHe: 'יין אדום', canonicalNameEn: 'Red wine', aliases: ['יין'], kcalPer100g: 85, proteinPer100g: 0.1, servingOptions: [{ label: 'כוס', grams: 150 }] },
  { id: 'coffee-with-milk', canonicalNameHe: 'קפה הפוך', canonicalNameEn: 'Coffee with milk', aliases: ['קפה עם חלב', 'קפוצ׳ינו'], kcalPer100g: 30, proteinPer100g: 1.5, servingOptions: [{ label: 'כוס', grams: 200 }] },
  { id: 'black-coffee', canonicalNameHe: 'קפה שחור', canonicalNameEn: 'Black coffee', aliases: ['אספרסו'], kcalPer100g: 1, proteinPer100g: 0.1, servingOptions: [{ label: 'כוס', grams: 200 }] },
  { id: 'protein-shake', canonicalNameHe: 'שייק חלבון', canonicalNameEn: 'Protein shake', aliases: ['אבקת חלבון'], kcalPer100g: 90, proteinPer100g: 15, servingOptions: [{ label: 'כוס', grams: 300 }] },

  // Combination dishes
  { id: 'shakshuka', canonicalNameHe: 'שקשוקה', canonicalNameEn: 'Shakshuka', aliases: [], kcalPer100g: 120, proteinPer100g: 6, servingOptions: [{ label: 'מנה', grams: 300 }] },
  { id: 'sabich', canonicalNameHe: 'סביח', canonicalNameEn: 'Sabich', aliases: [], kcalPer100g: 220, proteinPer100g: 7, servingOptions: [{ label: 'מנה', grams: 350 }] },
  { id: 'malawach', canonicalNameHe: 'מלאווח', canonicalNameEn: 'Malawach', aliases: [], kcalPer100g: 380, proteinPer100g: 7, servingOptions: [{ label: 'יחידה', grams: 120 }] },
  { id: 'jachnun', canonicalNameHe: 'ג׳חנון', canonicalNameEn: 'Jachnun', aliases: [], kcalPer100g: 350, proteinPer100g: 6, servingOptions: [{ label: 'יחידה', grams: 150 }] },
  { id: 'cholent', canonicalNameHe: 'חמין', canonicalNameEn: 'Cholent', aliases: ['צ׳ולנט'], kcalPer100g: 150, proteinPer100g: 8, servingOptions: [{ label: 'מנה', grams: 350 }] },
  { id: 'pizza-slice', canonicalNameHe: 'פיצה', canonicalNameEn: 'Pizza', aliases: ['פרוסת פיצה'], kcalPer100g: 266, proteinPer100g: 11, servingOptions: [{ label: 'פרוסה', grams: 110 }] },
  { id: 'burger-beef', canonicalNameHe: 'המבורגר', canonicalNameEn: 'Beef burger', aliases: ['בורגר'], kcalPer100g: 250, proteinPer100g: 18, servingOptions: [{ label: 'יחידה', grams: 200 }] },
  { id: 'sushi-roll', canonicalNameHe: 'סושי', canonicalNameEn: 'Sushi roll', aliases: ['רול סושי'], kcalPer100g: 150, proteinPer100g: 5, servingOptions: [{ label: 'רול', grams: 200 }] },
  { id: 'sandwich-cheese', canonicalNameHe: 'כריך גבינה', canonicalNameEn: 'Cheese sandwich', aliases: ['סנדוויץ׳'], kcalPer100g: 280, proteinPer100g: 12, servingOptions: [{ label: 'יחידה', grams: 150 }] },
  { id: 'granola', canonicalNameHe: 'גרנולה', canonicalNameEn: 'Granola', aliases: [], kcalPer100g: 471, proteinPer100g: 10, servingOptions: [{ label: 'כוס', grams: 100 }] },
];

export function buildSeedFoodReferences(): FoodReference[] {
  return SEED_FOODS.map((food) => ({
    id: food.id,
    canonicalNameHe: food.canonicalNameHe,
    canonicalNameEn: food.canonicalNameEn,
    aliases: food.aliases,
    kcalPer100g: food.kcalPer100g,
    proteinPer100g: food.proteinPer100g,
    servingOptions: food.servingOptions,
    source: 'local',
  }));
}
