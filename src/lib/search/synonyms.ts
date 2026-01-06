/**
 * Russian synonym mappings for search queries
 * Editable dictionary for true synonyms/variants/typos only
 * 
 * Note: 
 * - Tokenization already handles compound words (e.g. "ланч" matches "бизнес-ланч")
 * - Latin look-alike letters are handled in normalizeRu.ts (e.g. "кофe" -> "кофе")
 * 
 * Soft expansions (category-level): Lower weight, only used if no exact/prefix match found
 */

// True synonyms (same weight as original)
const TRUE_SYNONYMS: Record<string, string[]> = {
  // Шаурма variants (true synonyms/typos)
  "шаверма": ["шаурма"],
  "шаурма": ["шаверма"],
  "шавурма": ["шаурма"],
  
  // Пицца variants (typos)
  "питца": ["пицца"],
  
  // Суп variants (diminutive)
  "супчик": ["суп"],
  
  // Вок variants (transliteration)
  "wok": ["вок"],
  
  // Десерт variants (typos)
  "дессерт": ["десерт"],
};

// Soft expansions (category-level, lower weight)
// These are NOT true synonyms but related items that should rank lower
const SOFT_EXPANSIONS: Record<string, string[]> = {
  // "капучино" is a type of coffee, but exact matches should rank higher
  "капучино": ["кофе"],
};

/**
 * Expands query tokens with synonyms
 * Returns array of all possible token variants (including original)
 * 
 * @param tokens - Query tokens to expand
 * @param includeSoft - Whether to include soft expansions (default: true)
 */
export function expandTokensWithSynonyms(
  tokens: string[],
  includeSoft: boolean = true
): string[] {
  const expanded = new Set<string>();
  
  for (const token of tokens) {
    // Add original token
    expanded.add(token);
    
    // Add true synonyms
    const trueSynonyms = TRUE_SYNONYMS[token.toLowerCase()];
    if (trueSynonyms) {
      for (const synonym of trueSynonyms) {
        expanded.add(synonym);
      }
    }
    
    // Add soft expansions (if enabled)
    if (includeSoft) {
      const softExpansions = SOFT_EXPANSIONS[token.toLowerCase()];
      if (softExpansions) {
        for (const expansion of softExpansions) {
          expanded.add(expansion);
        }
      }
    }
  }
  
  return Array.from(expanded);
}

/**
 * Check if a token match is a soft expansion (category-level, not true synonym)
 */
export function isSoftExpansion(queryToken: string, matchedToken: string): boolean {
  const q = queryToken.toLowerCase();
  const m = matchedToken.toLowerCase();
  
  const softExpansions = SOFT_EXPANSIONS[q];
  return softExpansions ? softExpansions.includes(m) : false;
}

/**
 * Get all synonyms for a token (including the token itself)
 */
export function getSynonyms(token: string): string[] {
  const normalized = token.toLowerCase();
  const trueSynonyms = TRUE_SYNONYMS[normalized] || [];
  const softExpansions = SOFT_EXPANSIONS[normalized] || [];
  return [normalized, ...trueSynonyms, ...softExpansions];
}

/**
 * Check if two tokens are synonyms
 */
export function areSynonyms(token1: string, token2: string): boolean {
  const t1 = token1.toLowerCase();
  const t2 = token2.toLowerCase();
  
  if (t1 === t2) return true;
  
  const synonyms1 = TRUE_SYNONYMS[t1] || [];
  const synonyms2 = TRUE_SYNONYMS[t2] || [];
  
  return synonyms1.includes(t2) || synonyms2.includes(t1);
}
