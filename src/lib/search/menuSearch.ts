/**
 * High-quality menu search with token-based matching and typo tolerance
 */

import { normalizeRu, tokenizeRu } from "./normalizeRu";
import { damerauLevenshteinDistance } from "./editDistance";
import { expandTokensWithSynonyms, isSoftExpansion } from "./synonyms";
import { getStemVariants } from "./morphology";

export type MenuItemIndex = {
  id: number;
  name: string;
  normalizedTitle: string;
  titleTokens: string[];
  description: string | null;
  normalizedDescription: string;
  descriptionTokens: string[];
  categoryName: string | null;
  categoryTokens: string[];
  subcategoryName: string | null;
  subcategoryTokens: string[];
  price: number;
  discountPercent: number | null;
  imageUrl: string | null;
};

export type SearchMatch = {
  item: MenuItemIndex;
  score: number;
  matchType: "exact" | "prefix" | "substring" | "typo" | "trigram";
  matchedTokens: string[];
};

// Scoring weights
const SCORE_EXACT_TOKEN = 10;
const SCORE_PREFIX_MATCH = 6;
const SCORE_SUBSTRING_MATCH = 3;
const SCORE_TYPO_MATCH = 4;
const SCORE_TRIGRAM_BASE = 4;

// Field weights
const WEIGHT_TITLE = 1.0;
const WEIGHT_CATEGORY = 0.6;
const WEIGHT_DESCRIPTION = 0.3;

// Thresholds
const MIN_QUERY_LENGTH = 2;
const MIN_QUERY_LENGTH_FOR_RESULTS = 3; // Show hint if < 3, no results
const MIN_SCORE = 6;
const AUTO_OPEN_MIN_SCORE = 8;
const AUTO_OPEN_MIN_QUERY_LENGTH = 4;
const AUTO_OPEN_SCORE_GAP_RATIO = 1.25;

/**
 * Build search index from menu items
 */
export function buildSearchIndex(items: Array<{
  id: number;
  name: string;
  description: string | null;
  categoryName: string | null;
  subcategoryName: string | null;
  price: number;
  discountPercent: number | null;
  imageUrl: string | null;
}>): MenuItemIndex[] {
  return items.map(item => ({
    id: item.id,
    name: item.name,
    normalizedTitle: normalizeRu(item.name),
    titleTokens: tokenizeRu(item.name),
    description: item.description,
    normalizedDescription: normalizeRu(item.description || ""),
    descriptionTokens: tokenizeRu(item.description || ""),
    categoryName: item.categoryName,
    categoryTokens: tokenizeRu(item.categoryName || ""),
    subcategoryName: item.subcategoryName,
    subcategoryTokens: tokenizeRu(item.subcategoryName || ""),
    price: item.price,
    discountPercent: item.discountPercent,
    imageUrl: item.imageUrl,
  }));
}

/**
 * Calculate simple trigram similarity (approximation)
 * Returns value between 0 and 1
 */
function trigramSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (a.length === 0 || b.length === 0) return 0;

  const getTrigrams = (str: string): Set<string> => {
    const trigrams = new Set<string>();
    for (let i = 0; i <= str.length - 3; i++) {
      trigrams.add(str.substring(i, i + 3));
    }
    return trigrams;
  };

  const trigramsA = getTrigrams(a);
  const trigramsB = getTrigrams(b);
  
  if (trigramsA.size === 0 || trigramsB.size === 0) return 0;

  let intersection = 0;
  for (const trigram of trigramsA) {
    if (trigramsB.has(trigram)) {
      intersection++;
    }
  }

  const union = trigramsA.size + trigramsB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Match a query token against a target token
 * Returns match type and score contribution
 * 
 * @param queryToken - The query token to match
 * @param targetToken - The target token to match against
 * @param allowTypo - Whether to allow typo matching
 * @param originalQueryToken - The original query token (before synonym expansion) for soft expansion detection
 */
function matchToken(
  queryToken: string,
  targetToken: string,
  allowTypo: boolean,
  originalQueryToken?: string
): { matched: boolean; score: number; matchType: SearchMatch["matchType"] } {
  // Exact match (highest priority)
  if (targetToken === queryToken) {
    // Check if this is a soft expansion (category-level, not true synonym)
    // Soft expansions get lower weight to ensure exact matches rank higher
    const isSoft = originalQueryToken && isSoftExpansion(originalQueryToken, targetToken);
    const score = isSoft ? SCORE_EXACT_TOKEN * 0.3 : SCORE_EXACT_TOKEN; // 30% weight for soft expansions
    return { matched: true, score, matchType: "exact" };
  }

  // Prefix match
  if (targetToken.startsWith(queryToken)) {
    const isSoft = originalQueryToken && isSoftExpansion(originalQueryToken, targetToken);
    const score = isSoft ? SCORE_PREFIX_MATCH * 0.3 : SCORE_PREFIX_MATCH;
    return { matched: true, score, matchType: "prefix" };
  }

  // Substring match
  if (targetToken.includes(queryToken)) {
    const isSoft = originalQueryToken && isSoftExpansion(originalQueryToken, targetToken);
    const score = isSoft ? SCORE_SUBSTRING_MATCH * 0.3 : SCORE_SUBSTRING_MATCH;
    return { matched: true, score, matchType: "substring" };
  }

  // Typo match (if allowed)
  if (allowTypo) {
    const tokenLength = queryToken.length;
    let maxDistance = 0;
    
    if (tokenLength >= 4 && tokenLength <= 8) {
      maxDistance = 1;
    } else if (tokenLength > 8) {
      maxDistance = 2;
    }

    if (maxDistance > 0) {
      const distance = damerauLevenshteinDistance(queryToken, targetToken);
      if (distance <= maxDistance) {
        const isSoft = originalQueryToken && isSoftExpansion(originalQueryToken, targetToken);
        const score = isSoft ? SCORE_TYPO_MATCH * 0.3 : SCORE_TYPO_MATCH;
        return { matched: true, score, matchType: "typo" };
      }
    }
  }

  return { matched: false, score: 0, matchType: "exact" };
}

/**
 * Search menu items with token-based matching
 */
export function searchMenu(
  index: MenuItemIndex[],
  query: string,
  options: {
    maxResults?: number;
    minScore?: number;
    allowTypo?: boolean;
    allowFuzzy?: boolean;
  } = {}
): SearchMatch[] {
  const { maxResults = 10, minScore = MIN_SCORE } = options;

  // Normalize and tokenize query
  const normalizedQuery = normalizeRu(query);
  const queryTokens = tokenizeRu(normalizedQuery);

  // Filter out very short queries
  if (queryTokens.length === 0 || normalizedQuery.length < MIN_QUERY_LENGTH) {
    return [];
  }

  // Determine if we should allow typo matching and fuzzy search
  // For length == 3: only exact/prefix (no typo/trigram)
  // For length >= 4: allow typo and trigram
  const queryLength = normalizedQuery.length;
  const allowTypo = options.allowTypo !== undefined 
    ? options.allowTypo 
    : queryLength >= 4;
  const allowFuzzy = options.allowFuzzy !== undefined 
    ? options.allowFuzzy 
    : queryLength >= 4;

  const matches: SearchMatch[] = [];

  for (const item of index) {
    let totalScore = 0;
    const matchedTokens: string[] = [];
    let bestMatchType: SearchMatch["matchType"] = "exact";

    // Match each query token (two-pass: exact/prefix first, then soft expansions)
    for (const originalQueryToken of queryTokens) {
      // Get stem variants for long tokens (morphology)
      const originalQueryTokenVariants = originalQueryToken.length >= 5 
        ? getStemVariants(originalQueryToken)
        : [originalQueryToken];
      
      let tokenMatched = false;
      let tokenScore = 0;
      let tokenMatchType: SearchMatch["matchType"] = "exact";
      let foundExactOrPrefix = false;

      // FIRST PASS: Try exact/prefix matches with original token only (no soft expansions)
      for (const queryVariant of originalQueryTokenVariants) {
        // Try matching in title tokens (with morphology)
        for (const titleToken of item.titleTokens) {
          const titleTokenVariants = titleToken.length >= 5
            ? getStemVariants(titleToken)
            : [titleToken];
          
          for (const titleVariant of titleTokenVariants) {
            const match = matchToken(queryVariant, titleVariant, allowTypo, originalQueryToken);
            if (match.matched) {
              const isSoft = isSoftExpansion(originalQueryToken, titleVariant);
              const isExactOrPrefix = match.matchType === "exact" || match.matchType === "prefix";
              
              // Only accept soft expansions if we haven't found exact/prefix match yet
              if (!isSoft || !foundExactOrPrefix) {
                tokenMatched = true;
                const weightedScore = match.score * WEIGHT_TITLE;
                if (weightedScore > tokenScore) {
                  tokenScore = weightedScore;
                  tokenMatchType = match.matchType;
                }
                if (isExactOrPrefix && !isSoft) {
                  foundExactOrPrefix = true;
                }
              }
            }
          }
        }

        // Try category (with morphology)
        if (!tokenMatched || !foundExactOrPrefix) {
          for (const catToken of item.categoryTokens) {
            const catTokenVariants = catToken.length >= 5
              ? getStemVariants(catToken)
              : [catToken];
            
            for (const catVariant of catTokenVariants) {
              const match = matchToken(queryVariant, catVariant, allowTypo, originalQueryToken);
              if (match.matched) {
                const isSoft = isSoftExpansion(originalQueryToken, catVariant);
                const isExactOrPrefix = match.matchType === "exact" || match.matchType === "prefix";
                
                if (!isSoft || !foundExactOrPrefix) {
                  tokenMatched = true;
                  const weightedScore = match.score * WEIGHT_CATEGORY;
                  if (weightedScore > tokenScore) {
                    tokenScore = weightedScore;
                    tokenMatchType = match.matchType;
                  }
                  if (isExactOrPrefix && !isSoft) {
                    foundExactOrPrefix = true;
                  }
                }
              }
            }
          }
        }

        // Try description (with morphology)
        if (!tokenMatched || !foundExactOrPrefix) {
          for (const descToken of item.descriptionTokens) {
            const descTokenVariants = descToken.length >= 5
              ? getStemVariants(descToken)
              : [descToken];
            
            for (const descVariant of descTokenVariants) {
              const match = matchToken(queryVariant, descVariant, allowTypo, originalQueryToken);
              if (match.matched) {
                const isSoft = isSoftExpansion(originalQueryToken, descVariant);
                const isExactOrPrefix = match.matchType === "exact" || match.matchType === "prefix";
                
                if (!isSoft || !foundExactOrPrefix) {
                  tokenMatched = true;
                  const weightedScore = match.score * WEIGHT_DESCRIPTION;
                  if (weightedScore > tokenScore) {
                    tokenScore = weightedScore;
                    tokenMatchType = match.matchType;
                  }
                  if (isExactOrPrefix && !isSoft) {
                    foundExactOrPrefix = true;
                  }
                }
              }
            }
          }
        }
      }

      // SECOND PASS: If no exact/prefix match found, try with synonym expansion (including soft)
      if (!foundExactOrPrefix) {
        const expandedQueryTokens = expandTokensWithSynonyms([originalQueryToken], true);
        
        for (const expandedToken of expandedQueryTokens) {
          // Skip original token (already tried in first pass)
          if (expandedToken === originalQueryToken) continue;
          
          const expandedTokenVariants = expandedToken.length >= 5 
            ? getStemVariants(expandedToken)
            : [expandedToken];
          
          for (const queryVariant of expandedTokenVariants) {
            // Try title
            for (const titleToken of item.titleTokens) {
              const titleTokenVariants = titleToken.length >= 5
                ? getStemVariants(titleToken)
                : [titleToken];
              
              for (const titleVariant of titleTokenVariants) {
                const match = matchToken(queryVariant, titleVariant, allowTypo, originalQueryToken);
                if (match.matched) {
                  tokenMatched = true;
                  const weightedScore = match.score * WEIGHT_TITLE;
                  if (weightedScore > tokenScore) {
                    tokenScore = weightedScore;
                    tokenMatchType = match.matchType;
                  }
                }
              }
            }

            // Try category
            for (const catToken of item.categoryTokens) {
              const catTokenVariants = catToken.length >= 5
                ? getStemVariants(catToken)
                : [catToken];
              
              for (const catVariant of catTokenVariants) {
                const match = matchToken(queryVariant, catVariant, allowTypo, originalQueryToken);
                if (match.matched) {
                  tokenMatched = true;
                  const weightedScore = match.score * WEIGHT_CATEGORY;
                  if (weightedScore > tokenScore) {
                    tokenScore = weightedScore;
                    tokenMatchType = match.matchType;
                  }
                }
              }
            }

            // Try description
            for (const descToken of item.descriptionTokens) {
              const descTokenVariants = descToken.length >= 5
                ? getStemVariants(descToken)
                : [descToken];
              
              for (const descVariant of descTokenVariants) {
                const match = matchToken(queryVariant, descVariant, allowTypo, originalQueryToken);
                if (match.matched) {
                  tokenMatched = true;
                  const weightedScore = match.score * WEIGHT_DESCRIPTION;
                  if (weightedScore > tokenScore) {
                    tokenScore = weightedScore;
                    tokenMatchType = match.matchType;
                  }
                }
              }
            }
          }
        }
      }

      // Fallback: substring match on full normalized title (with morphology)
      if (!tokenMatched) {
        for (const queryVariant of originalQueryTokenVariants) {
          if (item.normalizedTitle.includes(queryVariant)) {
            tokenMatched = true;
            tokenScore = SCORE_SUBSTRING_MATCH * WEIGHT_TITLE;
            tokenMatchType = "substring";
            break;
          }
        }
      }

      // Fallback: trigram similarity (if fuzzy allowed, with morphology)
      if (!tokenMatched && allowFuzzy) {
        for (const queryVariant of originalQueryTokenVariants) {
          const similarity = trigramSimilarity(queryVariant, item.normalizedTitle);
          if (similarity > 0.3) {
            tokenMatched = true;
            tokenScore = similarity * SCORE_TRIGRAM_BASE * WEIGHT_TITLE;
            tokenMatchType = "trigram";
            break;
          }
        }
      }

      if (tokenMatched) {
        totalScore += tokenScore;
        matchedTokens.push(originalQueryToken);
        // Track best match type (exact > prefix > substring > typo > trigram)
        if (
          tokenMatchType === "exact" ||
          (tokenMatchType === "prefix" && bestMatchType !== "exact") ||
          (tokenMatchType === "substring" && !["exact", "prefix"].includes(bestMatchType)) ||
          (tokenMatchType === "typo" && !["exact", "prefix", "substring"].includes(bestMatchType))
        ) {
          bestMatchType = tokenMatchType;
        }
      }
    }

    // Only include if at least one token matched and score meets threshold
    if (matchedTokens.length > 0 && totalScore >= minScore) {
      matches.push({
        item,
        score: totalScore,
        matchType: bestMatchType,
        matchedTokens,
      });
    }
  }

  // Sort by score (descending), then by name (ascending), then by id (ascending)
  // This ensures stable, deterministic ranking to prevent result jitter
  matches.sort((a, b) => {
    // Primary: score (descending)
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Secondary: name (ascending, case-insensitive)
    const nameCompare = a.item.name.localeCompare(b.item.name, "ru", { sensitivity: "base" });
    if (nameCompare !== 0) {
      return nameCompare;
    }
    // Tertiary: id (ascending) for complete stability
    return a.item.id - b.item.id;
  });

  return matches.slice(0, maxResults);
}

/**
 * Determine if we should auto-navigate to a single result
 */
export function shouldAutoNavigate(
  matches: SearchMatch[],
  query: string
): boolean {
  // Only auto-navigate if exactly 1 result
  if (matches.length !== 1) {
    return false;
  }

  const match = matches[0];

  // Query must be long enough
  if (query.length < AUTO_OPEN_MIN_QUERY_LENGTH) {
    return false;
  }

  // Score must be high enough
  if (match.score < AUTO_OPEN_MIN_SCORE) {
    return false;
  }

  return true;
}

