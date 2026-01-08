/**
 * Russian text normalization for search indexing and matching.
 * 
 * Rules:
 * - lowercase
 * - trim + collapse spaces
 * - replace "ё" -> "е"
 * - replace separators with spaces: "-", "—", "_", "/", ".", ",", ":", ";", "(", ")", etc.
 * - remove duplicate spaces again
 */

// All separators that should be replaced with spaces
const SEPARATORS = /[-—_/.,:;()\[\]{}'"!?]/g;
const MULTIPLE_SPACES = /\s+/g;

/**
 * Normalizes Russian text for search indexing.
 * @param text - Input text to normalize
 * @returns Normalized text
 */
export function normalizeRu(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/ё/g, "е")
    .replace(SEPARATORS, " ")
    .replace(MULTIPLE_SPACES, " ")
    .trim();
}

/**
 * Tokenizes normalized text into searchable tokens.
 * Filters out very short tokens (length < 2) except digits.
 * 
 * @param normalizedText - Already normalized text
 * @returns Array of tokens
 */
export function tokenizeRu(normalizedText: string): string[] {
  return normalizedText
    .split(/\s+/)
    .filter((token) => {
      if (token.length === 0) return false;
      // Keep digits and tokens of length >= 2
      if (/^\d+$/.test(token)) return true;
      return token.length >= 2;
    });
}

/**
 * Normalizes and tokenizes text in one step.
 */
export function normalizeAndTokenizeRu(text: string): string[] {
  return tokenizeRu(normalizeRu(text));
}

