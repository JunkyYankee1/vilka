/**
 * Russian-friendly normalization and tokenization utilities
 * Handles "ё" -> "е", separators, and proper tokenization
 */

/**
 * Maps common Latin look-alike letters to Cyrillic equivalents
 * Used to normalize typos where users type Latin letters instead of Cyrillic
 */
const LATIN_TO_CYRILLIC: Record<string, string> = {
  "a": "а", // Latin 'a' -> Cyrillic 'а'
  "e": "е", // Latin 'e' -> Cyrillic 'е'
  "o": "о", // Latin 'o' -> Cyrillic 'о'
  "p": "р", // Latin 'p' -> Cyrillic 'р'
  "c": "с", // Latin 'c' -> Cyrillic 'с'
  "x": "х", // Latin 'x' -> Cyrillic 'х'
  "y": "у", // Latin 'y' -> Cyrillic 'у'
  "k": "к", // Latin 'k' -> Cyrillic 'к'
  "m": "м", // Latin 'm' -> Cyrillic 'м'
  "t": "т", // Latin 't' -> Cyrillic 'т'
  "b": "в", // Latin 'b' -> Cyrillic 'в'
  "h": "н", // Latin 'h' -> Cyrillic 'н'
};

/**
 * Normalizes a string for Russian-friendly search
 * - lowercase
 * - trim + collapse spaces
 * - replace "ё" -> "е"
 * - replace Latin look-alike letters with Cyrillic equivalents
 * - replace separators with spaces: "-", "—", "_", "/", ".", ",", ":", ";", "(", ")", etc.
 * - remove duplicate spaces
 */
export function normalizeRu(text: string): string {
  if (!text) return "";
  
  let normalized = text
    .toLowerCase()
    .trim()
    // Replace "ё" with "е" for Russian
    .replace(/ё/g, "е");
  
  // Replace Latin look-alike letters with Cyrillic equivalents
  // Only replace if the character is actually Latin (not already Cyrillic)
  normalized = normalized.replace(/[a-z]/g, (char) => {
    return LATIN_TO_CYRILLIC[char] || char;
  });
  
  normalized = normalized
    // Replace separators with spaces (treat as word boundaries)
    .replace(/[-—_/.,:;()\[\]{}'"]+/g, " ")
    // Remove other punctuation (keep spaces, letters, numbers)
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    // Collapse multiple spaces into one
    .replace(/\s+/g, " ")
    .trim();
  
  return normalized;
}

/**
 * Tokenizes a string into words
 * - splits by spaces
 * - filters out very short tokens (length < 2) except digits
 * - returns array of normalized tokens
 */
export function tokenizeRu(text: string): string[] {
  if (!text) return [];
  
  const normalized = normalizeRu(text);
  return normalized
    .split(/\s+/)
    .filter(token => {
      // Keep tokens with length >= 2, or digits
      return token.length >= 2 || /^\d+$/.test(token);
    });
}

/**
 * Checks if a query is too short for meaningful search
 */
export function isQueryTooShort(query: string, minLength: number = 2): boolean {
  const tokens = tokenizeRu(query);
  if (tokens.length === 0) return true;
  // For single token, check length
  if (tokens.length === 1) {
    return tokens[0].length < minLength;
  }
  // For multi-word, at least one token should be >= minLength
  return !tokens.some(token => token.length >= minLength);
}

