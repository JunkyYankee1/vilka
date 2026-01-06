import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { searchMenu, shouldAutoNavigate } from "@/lib/search/menuSearch";
import { getCachedIndex } from "@/lib/search/indexCache";
import { normalizeRu } from "@/lib/search/normalizeRu";

export const runtime = "nodejs";

type SearchResult = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  discount_percent: number | null;
  image_url: string | null;
  category_name: string | null;
  subcategory_name: string | null;
  score: number;
  match_type: "exact" | "prefix" | "substring" | "typo" | "trigram";
};

// Configuration constants
const MAX_RESULTS = 10;
const MIN_QUERY_LENGTH_FOR_RESULTS = 3; // Show hint if < 3

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const queryText = searchParams.get("q") || "";
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") || String(MAX_RESULTS), 10), 1),
    MAX_RESULTS
  );
  const debug = searchParams.get("debug") === "true";

  const normalizedQuery = normalizeRu(queryText);
  
  // Handle very short queries
  if (normalizedQuery.length < MIN_QUERY_LENGTH_FOR_RESULTS) {
    return NextResponse.json({
      results: [],
      count: 0,
      query: queryText,
      hint: normalizedQuery.length < 2 
        ? "Введите хотя бы 2 символа"
        : "Введите минимум 3 символа для поиска",
    });
  }

  if (!queryText.trim()) {
    return NextResponse.json({ results: [], count: 0, query: queryText });
  }

  const requestStartTime = Date.now();
  let indexBuildTime = 0;
  let searchTime = 0;

  try {
    // Fetch all active menu items with their categories
    const dbStartTime = Date.now();
    const { rows } = await query<{
      id: number;
      name: string;
      composition: string | null;
      price: number;
      discount_percent: number | null;
      image_url: string | null;
      category_name: string | null;
      subcategory_name: string | null;
    }>(
      `
      SELECT 
        mi.id,
        mi.name,
        mi.composition,
        mi.price,
        mi.discount_percent,
        mi.image_url,
        c1.name AS category_name,
        c2.name AS subcategory_name
      FROM menu_items mi
      JOIN ref_dish_categories c ON c.id = mi.ref_category_id
      LEFT JOIN ref_dish_categories c1 ON c1.id = COALESCE(c.parent_id, c.id) AND c1.level = 1
      LEFT JOIN ref_dish_categories c2 ON c2.id = CASE 
        WHEN c.level = 2 THEN c.id 
        WHEN c.level = 3 THEN c.parent_id 
        ELSE NULL 
      END
      WHERE mi.is_active = TRUE
        AND c.is_active = TRUE
      ORDER BY mi.name
      `
    );
    const dbTime = Date.now() - dbStartTime;

    // Get or build cached search index
    const indexStartTime = Date.now();
    const { index, fromCache, buildTimeMs } = getCachedIndex(
      rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.composition,
        categoryName: row.category_name,
        subcategoryName: row.subcategory_name,
        price: Number(row.price),
        discountPercent: row.discount_percent ? Number(row.discount_percent) : null,
        imageUrl: row.image_url,
      }))
    );
    indexBuildTime = Date.now() - indexStartTime;

    // Determine search options based on query length
    const queryLength = normalizedQuery.length;
    const allowTypo = queryLength >= 4;
    const allowFuzzy = queryLength >= 4;

    // Perform search
    const searchStartTime = Date.now();
    const matches = searchMenu(index, queryText, {
      maxResults: limit,
      minScore: 6, // MIN_SCORE from menuSearch.ts
      allowTypo,
      allowFuzzy,
    });
    searchTime = Date.now() - searchStartTime;

    // Convert to API response format
    const results: SearchResult[] = matches.map(match => ({
      id: match.item.id,
      name: match.item.name,
      description: match.item.description,
      price: match.item.price,
      discount_percent: match.item.discountPercent,
      image_url: match.item.imageUrl,
      category_name: match.item.categoryName,
      subcategory_name: match.item.subcategoryName,
      score: match.score,
      match_type: match.matchType,
    }));

    // Determine if we should auto-navigate (ONLY when exactly 1 confident match)
    const autoNavigate = shouldAutoNavigate(matches, queryText);

    const totalTime = Date.now() - requestStartTime;

    if (debug || process.env.NODE_ENV === "development") {
      console.log("[search] Performance:", {
        query: queryText,
        dbTime: `${dbTime}ms`,
        indexBuildTime: `${indexBuildTime}ms`,
        indexFromCache: fromCache,
        searchTime: `${searchTime}ms`,
        totalTime: `${totalTime}ms`,
        resultsCount: results.length,
      });
    }

    if (debug) {
      console.log("[search] Debug:", {
        query: queryText,
        normalizedQuery,
        resultsCount: results.length,
        topResults: results.slice(0, 3).map((r) => ({
          name: r.name,
          score: r.score,
          matchType: r.match_type,
        })),
        shouldAutoNavigate: autoNavigate,
      });
    }

    return NextResponse.json({
      results,
      count: results.length,
      query: queryText,
      shouldAutoNavigate: autoNavigate,
      debug: debug
        ? {
            topScores: results.slice(0, 3).map((r) => r.score),
            matches: matches.slice(0, 3).map((m) => ({
              name: m.item.name,
              score: m.score,
              matchType: m.matchType,
              matchedTokens: m.matchedTokens,
            })),
            performance: {
              dbTime: `${dbTime}ms`,
              indexBuildTime: `${indexBuildTime}ms`,
              indexFromCache: fromCache,
              searchTime: `${searchTime}ms`,
              totalTime: `${totalTime}ms`,
            },
          }
        : undefined,
    });
  } catch (e: any) {
    console.error("[search] Error:", e);
    return NextResponse.json(
      { error: String(e?.message ?? e), results: [], count: 0 },
      { status: 500 }
    );
  }
}
