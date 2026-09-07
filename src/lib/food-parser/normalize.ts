// Spec 11.5 step 1: normalize Hebrew punctuation, numeral words and unit spelling
// variants so later parsing stages only have to deal with one canonical spelling.
const WORD_NUMBER_TOKENS: Record<string, string> = {
  'חצי': '0.5',
  'רבע': '0.25',
  'אחד': '1',
  'אחת': '1',
  'שניים': '2',
  'שתיים': '2',
  'שני': '2',
  'שתי': '2',
  'שלושה': '3',
  'שלוש': '3',
  'ארבעה': '4',
  'ארבע': '4',
  'חמישה': '5',
  'חמש': '5',
  'שישה': '6',
  'שש': '6',
  'שבעה': '7',
  'שבע': '7',
  'שמונה': '8',
  'תשעה': '9',
  'תשע': '9',
  'עשרה': '10',
  'עשר': '10',
};

const UNIT_SPELLING_TOKENS: Record<string, string> = {
  'גר׳': 'גרם',
  "גר'": 'גרם',
  'גרמים': 'גרם',
  'גרם': 'גרם',
  'ק״ג': 'ק"ג',
  'ק"ג': 'ק"ג',
  'קילוגרם': 'ק"ג',
  'קילו': 'ק"ג',
  'כוסות': 'כוס',
  'כוס': 'כוס',
  'כפות': 'כף',
  'כף': 'כף',
  'כפיות': 'כפית',
  'כפית': 'כפית',
  'מנות': 'מנה',
  'מנה': 'מנה',
  'יחידות': 'יחידה',
  'יחידה': 'יחידה',
};

function canonicalizeToken(token: string): string {
  // Split off trailing punctuation (e.g. a comma glued to the previous word)
  // so the lookup tables match even when a segment wasn't comma-separated
  // with surrounding whitespace.
  const trailingPunctuation = /[.,!?;:]+$/.exec(token)?.[0] ?? '';
  const core = trailingPunctuation ? token.slice(0, -trailingPunctuation.length) : token;
  const replacement = WORD_NUMBER_TOKENS[core] ?? UNIT_SPELLING_TOKENS[core] ?? core;
  return replacement + trailingPunctuation;
}

export function normalizeFoodText(input: string): string {
  const collapsed = input.trim().replace(/\s+/g, ' ');
  if (!collapsed) return '';
  return collapsed.split(' ').map(canonicalizeToken).join(' ');
}
