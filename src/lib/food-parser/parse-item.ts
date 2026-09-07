import { GENERIC_UNITS, type ParsedFoodSegment, type SizeDescriptor } from './types';

// Spec 11.5 step 3: identify quantity, unit, size descriptor and preparation words.
const EXTRA_LARGE_PHRASE = 'גדולה מאוד';
const LARGE_WORDS = ['גדול', 'גדולה', 'גדולים', 'גדולות'];
const SMALL_WORDS = ['קטן', 'קטנה', 'קטנים', 'קטנות'];
const FRIED_WORDS = ['מטוגן', 'מטוגנת', 'מטוגנים', 'מטוגנות', 'בשמן', 'בטיגון', 'טיגון'];
const VAGUE_WORDS = ['קצת', 'טיפה', 'מעט', 'חופן', 'בערך', 'משהו', 'כמה'];

function removeWords(text: string, words: string[]): { text: string; removed: boolean } {
  let removed = false;
  let result = text;
  for (const word of words) {
    const pattern = new RegExp(`(^|\\s)${word}(\\s|$)`, 'g');
    if (pattern.test(result)) {
      removed = true;
      result = result.replace(pattern, ' ');
    }
  }
  return { text: result.replace(/\s+/g, ' ').trim(), removed };
}

export function parseFoodSegment(rawSegment: string): ParsedFoodSegment {
  let text = rawSegment.trim();
  let size: SizeDescriptor = 'normal';

  if (text.includes(EXTRA_LARGE_PHRASE)) {
    size = 'extraLarge';
    text = text.replace(EXTRA_LARGE_PHRASE, ' ').replace(/\s+/g, ' ').trim();
  } else {
    const large = removeWords(text, LARGE_WORDS);
    if (large.removed) {
      size = 'large';
      text = large.text;
    } else {
      const small = removeWords(text, SMALL_WORDS);
      if (small.removed) {
        size = 'small';
        text = small.text;
      }
    }
  }

  const fried = removeWords(text, FRIED_WORDS);
  text = fried.text;

  const vague = removeWords(text, VAGUE_WORDS);
  text = vague.text;

  const quantityMatch = /^(\d+(?:\.\d+)?)\s*/.exec(text);
  let quantity = 1;
  if (quantityMatch) {
    quantity = Number(quantityMatch[1]);
    text = text.slice(quantityMatch[0].length).trim();
  }

  let unit: string | null = null;
  const firstSpaceIndex = text.indexOf(' ');
  const firstToken = firstSpaceIndex === -1 ? text : text.slice(0, firstSpaceIndex);
  if ((GENERIC_UNITS as readonly string[]).includes(firstToken)) {
    unit = firstToken;
    text = (firstSpaceIndex === -1 ? '' : text.slice(firstSpaceIndex + 1)).trim();
  }

  return {
    rawText: rawSegment.trim(),
    quantity,
    unit,
    size,
    isFried: fried.removed,
    isVague: vague.removed,
    nameText: text,
  };
}
