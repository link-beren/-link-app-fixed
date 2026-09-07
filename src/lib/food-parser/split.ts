import { GENERIC_UNITS } from './types';

// Spec 11.5 step 2: split free text into individual food items by commas,
// newlines and the Hebrew "ו" (and) connective prefix, e.g.
// "300 גרם אורז וכוס פיוז טי" -> ["300 גרם אורז", "כוס פיוז טי"].
// The lookahead is derived from GENERIC_UNITS so every recognized unit word
// (not just a hardcoded subset) triggers a split.
const CONJUNCTION_PATTERN = new RegExp(`\\s+ו(?=(?:${GENERIC_UNITS.join('|')}|\\d))`);

function splitConjunctions(segment: string): string[] {
  const parts: string[] = [];
  let remaining = segment;
  let match = CONJUNCTION_PATTERN.exec(remaining);
  while (match) {
    parts.push(remaining.slice(0, match.index));
    remaining = remaining.slice(match.index + match[0].length);
    match = CONJUNCTION_PATTERN.exec(remaining);
  }
  parts.push(remaining);
  return parts.map((part) => part.trim()).filter(Boolean);
}

export function splitFoodSegments(normalizedText: string): string[] {
  const withCommas = normalizedText.replace(/\n+/g, ',');
  const commaParts = withCommas
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return commaParts.flatMap(splitConjunctions);
}
