/**
 * Russian synonym mappings for menu search.
 * Maps alternative terms to canonical search tokens.
 * 
 * Format: canonical -> [alternatives]
 */
export const SYNONYMS_RU: Record<string, string[]> = {
  // Шаурма variants
  "шаурма": ["шаверма"],
  "шаверма": ["шаурма"],
  
  // Fries variants
  "фри": ["картошка", "картофель", "картошка фри"],
  "картошка": ["фри", "картошка фри"],
  "картофель": ["фри"],
  "картошка фри": ["фри", "картошка"],
  
  // Combo/set variants
  "комбо": ["набор", "сет", "комплекс"],
  "набор": ["комбо", "сет", "комплекс"],
  "сет": ["комбо", "набор", "комплекс"],
  "комплекс": ["комбо", "набор", "сет"],
  
  // Common abbreviations
  "бургер": ["гамбургер"],
  "гамбургер": ["бургер"],
  
  // Drink variants
  "напиток": ["напитки"],
  "напитки": ["напиток"],
  
  // Dessert variants
  "десерт": ["сладости", "сладкое"],
  "сладости": ["десерт", "сладкое"],
  "сладкое": ["десерт", "сладости"],
};

/**
 * Expands query tokens with synonyms.
 * @param tokens - Original query tokens
 * @returns Expanded set of tokens (original + synonyms)
 */
export function expandSynonyms(tokens: string[]): string[] {
  const expanded = new Set<string>();
  
  for (const token of tokens) {
    // Add original token
    expanded.add(token);
    
    // Add synonyms
    const synonyms = SYNONYMS_RU[token];
    if (synonyms) {
      for (const synonym of synonyms) {
        // Tokenize synonym in case it's a phrase
        const synonymTokens = synonym.split(/\s+/);
        for (const st of synonymTokens) {
          if (st.length >= 2) {
            expanded.add(st);
          }
        }
      }
    }
    
    // Also check reverse lookup (if token is a synonym, add canonical)
    for (const [canonical, alternatives] of Object.entries(SYNONYMS_RU)) {
      if (alternatives.includes(token)) {
        expanded.add(canonical);
        const canonicalTokens = canonical.split(/\s+/);
        for (const ct of canonicalTokens) {
          if (ct.length >= 2) {
            expanded.add(ct);
          }
        }
      }
    }
  }
  
  return Array.from(expanded);
}

