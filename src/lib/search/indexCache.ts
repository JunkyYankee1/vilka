/**
 * In-memory cache for search index
 * Invalidates on menu data changes (could be extended with Redis)
 */

import { buildSearchIndex, type MenuItemIndex } from "./menuSearch";

type CachedIndex = {
  index: MenuItemIndex[];
  timestamp: number;
  itemCount: number;
};

// Cache with TTL (5 minutes)
const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedIndex: CachedIndex | null = null;

/**
 * Get or build search index (cached)
 */
export function getCachedIndex(
  items: Array<{
    id: number;
    name: string;
    description: string | null;
    categoryName: string | null;
    subcategoryName: string | null;
    price: number;
    discountPercent: number | null;
    imageUrl: string | null;
  }>,
  options: { forceRebuild?: boolean } = {}
): { index: MenuItemIndex[]; fromCache: boolean; buildTimeMs: number } {
  const startTime = Date.now();
  const now = Date.now();

  // Check if cache is valid
  if (
    !options.forceRebuild &&
    cachedIndex &&
    now - cachedIndex.timestamp < CACHE_TTL_MS &&
    cachedIndex.itemCount === items.length
  ) {
    const buildTimeMs = Date.now() - startTime;
    return { index: cachedIndex.index, fromCache: true, buildTimeMs };
  }

  // Build new index
  const index = buildSearchIndex(items);
  cachedIndex = {
    index,
    timestamp: now,
    itemCount: items.length,
  };

  const buildTimeMs = Date.now() - startTime;
  return { index, fromCache: false, buildTimeMs };
}

/**
 * Invalidate cache (call when menu data changes)
 */
export function invalidateCache(): void {
  cachedIndex = null;
}

