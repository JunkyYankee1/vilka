/**
 * Normalizes search queries for Russian-friendly fuzzy matching
 */
export function normalizeQuery(query: string): string {
  if (!query) return "";
  
  return query
    .toLowerCase()
    .trim()
    // Replace "ё" with "е" for Russian
    .replace(/ё/g, "е")
    // Replace separators with spaces (treat as word boundaries)
    .replace(/[-—/,.]+/g, " ")
    // Remove other punctuation (keep spaces and basic chars)
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    // Collapse multiple spaces into one
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tokenizes a string into words (splits on spaces and separators)
 */
export function tokenize(text: string): string[] {
  if (!text) return [];
  
  const normalized = normalizeQuery(text);
  return normalized.split(/\s+/).filter(token => token.length > 0);
}

/**
 * Normalizes text for matching (same as normalizeQuery but for dish titles/descriptions)
 */
export function normalizeText(text: string): string {
  return normalizeQuery(text);
}

/**
 * Checks if query is too short for fuzzy matching
 */
export function isQueryTooShort(query: string, minLength: number = 3): boolean {
  const tokens = tokenize(query);
  // Check if any token is long enough, or if single token query is long enough
  if (tokens.length === 1) {
    return tokens[0].length < minLength;
  }
  // For multi-word queries, at least one token should be >= minLength
  return !tokens.some(token => token.length >= minLength);
}

