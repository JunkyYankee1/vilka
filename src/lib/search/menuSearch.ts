import type { BaseItem, BaseItemId, CatalogData } from "@/modules/catalog/types";
import { normalizeRu, normalizeAndTokenizeRu } from "./normalizeRu";
import { isSimilar } from "./levenshtein";
import { expandSynonyms } from "./synonymsRu";

/**
 * Search index entry for a menu item (BaseItem).
 */
export type SearchIndexEntry = {
  item: BaseItem;
  normalizedTitle: string;
  titleTokens: string[];
  normalizedDescription: string;
  descriptionTokens: string[];
  categoryTokens: string[];
};

/**
 * Search result with score and match details.
 */
export type SearchResult = {
  item: BaseItem;
  score: number;
  matchType: "exact" | "prefix" | "substring" | "typo" | "mixed";
  // For tie-breaking: best match type priority (0=exact, 1=prefix, 2=typo, 3=substring)
  matchTypePriority: number;
  titleLength: number;
  tokenCount: number;
};

// Scoring weights
const SCORE_EXACT_TOKEN = 10;
const SCORE_PREFIX_MATCH = 6;
const SCORE_SUBSTRING_MATCH = 3;
const SCORE_TYPO_MATCH = 4;

// Field weights
const WEIGHT_TITLE = 1.0;
const WEIGHT_DESCRIPTION = 0.3;
const WEIGHT_CATEGORY = 0.6;

// Thresholds
const MIN_SCORE = 6;
const AUTO_OPEN_MIN_SCORE = 8;
const MIN_QUERY_LENGTH_FOR_FUZZY = 4;

/**
 * Builds a search index from catalog data.
 */
export function buildSearchIndex(catalog: CatalogData): Map<BaseItemId, SearchIndexEntry> {
  const index = new Map<string, SearchIndexEntry>();

  for (const item of catalog.baseItems) {
    const normalizedTitle = normalizeRu(item.name);
    const titleTokens = normalizeAndTokenizeRu(item.name);
    const normalizedDescription = normalizeRu(item.description ?? "");
    const descriptionTokens = normalizeAndTokenizeRu(item.description ?? "");

    // Get category name tokens
    const category = catalog.categories.find((c) => c.id === item.categoryId);
    const categoryTokens = category ? normalizeAndTokenizeRu(category.name) : [];

    index.set(item.id, {
      item,
      normalizedTitle,
      titleTokens,
      normalizedDescription,
      descriptionTokens,
      categoryTokens,
    });
  }

  return index;
}

/**
 * Matches a query token against a target token.
 * Returns the match type and score contribution.
 */
function matchToken(
  queryToken: string,
  targetToken: string,
  allowTypo: boolean
): { matched: boolean; score: number; matchType: "exact" | "prefix" | "typo" | "substring" | null } {
  // Exact match
  if (queryToken === targetToken) {
    return { matched: true, score: SCORE_EXACT_TOKEN, matchType: "exact" };
  }

  // Prefix match
  if (targetToken.startsWith(queryToken)) {
    return { matched: true, score: SCORE_PREFIX_MATCH, matchType: "prefix" };
  }

  // Typo match (only if allowed and token length is appropriate)
  if (allowTypo) {
    const tokenLen = queryToken.length;
    let maxDistance = 0;
    if (tokenLen >= 4 && tokenLen <= 8) {
      maxDistance = 1;
    } else if (tokenLen > 8) {
      maxDistance = 2;
    }

    if (maxDistance > 0 && isSimilar(queryToken, targetToken, maxDistance)) {
      return { matched: true, score: SCORE_TYPO_MATCH, matchType: "typo" };
    }
  }

  return { matched: false, score: 0, matchType: null };
}

/**
 * Scores a search index entry against a query.
 */
function scoreEntry(
  entry: SearchIndexEntry,
  queryTokens: string[],
  normalizedQuery: string,
  allowFuzzy: boolean
): { 
  score: number; 
  matchType: SearchResult["matchType"];
  matchTypePriority: number;
  titleLength: number;
  tokenCount: number;
} {
  let totalScore = 0;
  const matchTypes: Set<SearchResult["matchType"]> = new Set();

  // Match each query token
  for (const queryToken of queryTokens) {
    let tokenMatched = false;
    let bestTokenScore = 0;
    let bestTokenMatchType: "exact" | "prefix" | "typo" | "substring" | null = null;

    // Try matching against title tokens
    for (const titleToken of entry.titleTokens) {
      const match = matchToken(queryToken, titleToken, allowFuzzy);
      if (match.matched) {
        tokenMatched = true;
        const weightedScore = match.score * WEIGHT_TITLE;
        if (weightedScore > bestTokenScore) {
          bestTokenScore = weightedScore;
          bestTokenMatchType = match.matchType;
        }
      }
    }

    // Try matching against description tokens
    if (!tokenMatched || allowFuzzy) {
      for (const descToken of entry.descriptionTokens) {
        const match = matchToken(queryToken, descToken, allowFuzzy);
        if (match.matched) {
          tokenMatched = true;
          const weightedScore = match.score * WEIGHT_DESCRIPTION;
          if (weightedScore > bestTokenScore) {
            bestTokenScore = weightedScore;
            bestTokenMatchType = match.matchType;
          }
        }
      }
    }

    // Try matching against category tokens
    if (!tokenMatched || allowFuzzy) {
      for (const catToken of entry.categoryTokens) {
        const match = matchToken(queryToken, catToken, allowFuzzy);
        if (match.matched) {
          tokenMatched = true;
          const weightedScore = match.score * WEIGHT_CATEGORY;
          if (weightedScore > bestTokenScore) {
            bestTokenScore = weightedScore;
            bestTokenMatchType = match.matchType;
          }
        }
      }
    }

    // Fallback: substring match on normalized title (only if no token match found)
    if (!tokenMatched) {
      // Check if the query token appears as substring in the normalized title
      if (entry.normalizedTitle.includes(queryToken)) {
        tokenMatched = true;
        bestTokenScore = SCORE_SUBSTRING_MATCH * WEIGHT_TITLE;
        bestTokenMatchType = "substring";
      }
    }

    if (tokenMatched && bestTokenMatchType) {
      totalScore += bestTokenScore;
      if (bestTokenMatchType === "exact") matchTypes.add("exact");
      else if (bestTokenMatchType === "prefix") matchTypes.add("prefix");
      else if (bestTokenMatchType === "typo") matchTypes.add("typo");
      else matchTypes.add("substring");
    }
  }

  // Determine overall match type
  let overallMatchType: SearchResult["matchType"] = "mixed";
  let matchTypePriority = 3; // Default to substring (lowest priority)
  
  if (matchTypes.size === 1) {
    overallMatchType = Array.from(matchTypes)[0];
  } else if (matchTypes.size > 1) {
    overallMatchType = "mixed";
  }
  
  // Calculate match type priority for tie-breaking
  // Priority: exact=0, prefix=1, typo=2, substring=3, mixed=2.5
  if (matchTypes.has("exact")) {
    matchTypePriority = 0;
  } else if (matchTypes.has("prefix")) {
    matchTypePriority = 1;
  } else if (matchTypes.has("typo")) {
    matchTypePriority = 2;
  } else if (matchTypes.has("substring")) {
    matchTypePriority = 3;
  } else {
    matchTypePriority = 2.5; // mixed
  }

  return { 
    score: totalScore, 
    matchType: overallMatchType,
    matchTypePriority,
    titleLength: entry.item.name.length,
    tokenCount: entry.titleTokens.length,
  };
}

/**
 * Searches the menu using the provided index and query.
 * @param index - Search index
 * @param query - Search query text
 * @param limit - Maximum number of results (default: 10)
 * @returns Array of search results sorted by score (descending)
 */
export function searchMenu(
  index: Map<string, SearchIndexEntry>,
  query: string,
  limit: number = 10
): SearchResult[] {
  const trimmedQuery = query.trim();
  
  // Filter very short queries
  if (trimmedQuery.length < 2) {
    return [];
  }

  const normalizedQuery = normalizeRu(trimmedQuery);
  let queryTokens = normalizeAndTokenizeRu(trimmedQuery);
  
  if (queryTokens.length === 0) {
    return [];
  }

  // Expand with synonyms
  queryTokens = expandSynonyms(queryTokens);

  const allowFuzzy = trimmedQuery.length >= MIN_QUERY_LENGTH_FOR_FUZZY;
  const results: SearchResult[] = [];

  // Score all entries
  for (const entry of index.values()) {
    const { score, matchType, matchTypePriority, titleLength, tokenCount } = scoreEntry(
      entry, 
      queryTokens, 
      normalizedQuery, 
      allowFuzzy
    );
    
    if (score >= MIN_SCORE) {
      results.push({
        item: entry.item,
        score,
        matchType,
        matchTypePriority,
        titleLength,
        tokenCount,
      });
    }
  }

  // Sort with tie-breakers:
  // 1. Score (descending)
  // 2. Match type priority (ascending: exact=0 < prefix=1 < typo=2 < substring=3)
  // 3. Title length (ascending: shorter is better)
  // 4. Token count (ascending: fewer tokens is better)
  // 5. Alphabetical by title (ascending)
  results.sort((a, b) => {
    // Primary: score
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    
    // Secondary: match type priority
    if (a.matchTypePriority !== b.matchTypePriority) {
      return a.matchTypePriority - b.matchTypePriority;
    }
    
    // Tertiary: title length
    if (a.titleLength !== b.titleLength) {
      return a.titleLength - b.titleLength;
    }
    
    // Quaternary: token count
    if (a.tokenCount !== b.tokenCount) {
      return a.tokenCount - b.tokenCount;
    }
    
    // Quinary: alphabetical
    return a.item.name.localeCompare(b.item.name, "ru");
  });

  // Return top results
  return results.slice(0, limit);
}

/**
 * Determines if auto-navigation should occur.
 * Auto-navigates only when:
 * - resultsCount === 1
 * - query length >= 4
 * - resultScore >= AUTO_OPEN_MIN_SCORE
 * - matchType is not "substring" (substring matches are less confident)
 */
export function shouldAutoNavigate(
  results: SearchResult[],
  query: string
): boolean {
  if (results.length !== 1) return false;
  if (query.trim().length < 4) return false;
  if (results[0].score < AUTO_OPEN_MIN_SCORE) return false;
  // Don't auto-navigate on substring-only matches (less confident)
  if (results[0].matchType === "substring") return false;
  return true;
}

