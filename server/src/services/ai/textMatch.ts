/** Lowercase and strip Turkish diacritics so "ÖDEV" and "odev" match. */
export function normalize(text: string): string {
  return text
    .replace(/[İIı]/g, 'i')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

// Keywords match from a word start, so "odev" finds "odevlerim" but "not" misses "kanot".
export function hasKeyword(text: string, keyword: string): boolean {
  return ` ${text}`.includes(` ${keyword}`);
}

export function hasAny(text: string, words: string[]): boolean {
  return words.some((word) => hasKeyword(text, word));
}
