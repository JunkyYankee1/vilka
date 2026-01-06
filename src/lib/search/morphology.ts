/**
 * Conservative Russian morphology (stemming) for search
 * Strips common endings from long tokens (len >= 5) to improve matching
 * Handles: куриный/куриная/куриное -> курин
 */

/**
 * Strip common Russian endings from a token
 * Only applies to tokens length >= 5 to avoid over-stemming
 * Returns the stem or original token if no stem found
 */
export function stemRu(token: string): string {
  if (token.length < 5) {
    return token; // Too short, don't stem
  }

  const lower = token.toLowerCase();
  
  // Common adjective endings (куриный -> курин, куриная -> курин, куриное -> курин)
  const adjectiveEndings = [
    /ный$/i,    // куриный
    /ная$/i,    // куриная
    /ное$/i,    // куриное
    /ные$/i,    // куриные
    /нным$/i,   // куриным
    /нными$/i,  // куриными
    /нном$/i,   // курином
    /нной$/i,   // куриной
    /нную$/i,   // куриную
    /нными$/i,  // куриными
  ];

  // Common noun endings
  const nounEndings = [
    /ов$/i,     // супов
    /ов$/i,     // блюдов
    /ами$/i,    // блюдами
    /ах$/i,     // блюдах
    /ей$/i,     // блюдей
    /ям$/i,     // блюдам
    /ях$/i,     // блюдях
  ];

  // Try adjective endings first (more common in dish names)
  for (const ending of adjectiveEndings) {
    if (ending.test(lower)) {
      const stem = lower.replace(ending, "");
      // Ensure stem is at least 3 chars
      if (stem.length >= 3) {
        return stem;
      }
    }
  }

  // Try noun endings
  for (const ending of nounEndings) {
    if (ending.test(lower)) {
      const stem = lower.replace(ending, "");
      if (stem.length >= 3) {
        return stem;
      }
    }
  }

  return token; // No stem found, return original
}

/**
 * Get stem variants for a token (original + stem if different)
 */
export function getStemVariants(token: string): string[] {
  const stem = stemRu(token);
  if (stem === token) {
    return [token];
  }
  return [token, stem];
}

