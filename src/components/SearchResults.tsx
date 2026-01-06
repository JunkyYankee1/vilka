"use client";

import { X, ShoppingCart, ExternalLink } from "lucide-react";
import { useCart } from "@/modules/cart/cartContext";
import type { BaseItemId, CategoryId, SubcategoryId } from "@/modules/catalog/types";
import { useState, useEffect, useRef } from "react";
import { tokenizeRu } from "@/lib/search/normalizeRu";

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

type SearchResultsProps = {
  results: SearchResult[];
  query: string;
  hint?: string;
  error?: string | null;
  onClose: () => void;
  onSelectItem: (itemId: BaseItemId, categoryId: CategoryId, subcategoryId: SubcategoryId) => void;
  getItemId: (menuItemId: number) => BaseItemId | null;
  getCategoryId: (menuItemId: number) => CategoryId | null;
  getSubcategoryId: (menuItemId: number) => SubcategoryId | null;
};

/**
 * Highlights matching tokens in original text safely
 * Uses case-insensitive matching but preserves original case in output
 */
function highlightMatches(text: string, query: string): React.ReactNode {
  if (!query.trim() || !text) return text;
  
  const queryTokens = tokenizeRu(query);
  if (queryTokens.length === 0) return text;
  
  const normalizedText = text.toLowerCase();
  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  const matches: Array<{ start: number; end: number }> = [];
  
  // Find all token matches in normalized text
  for (const token of queryTokens) {
    if (token.length < 2) continue; // Skip very short tokens
    
    let searchIndex = 0;
    while (true) {
      const index = normalizedText.indexOf(token, searchIndex);
      if (index === -1) break;
      matches.push({ start: index, end: index + token.length });
      searchIndex = index + 1;
    }
  }
  
  if (matches.length === 0) return text;
  
  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start);
  
  // Merge overlapping matches
  const mergedMatches: Array<{ start: number; end: number }> = [];
  for (const match of matches) {
    if (mergedMatches.length === 0 || match.start > mergedMatches[mergedMatches.length - 1].end) {
      mergedMatches.push(match);
    } else {
      mergedMatches[mergedMatches.length - 1].end = Math.max(
        mergedMatches[mergedMatches.length - 1].end,
        match.end
      );
    }
  }
  
  // Build highlighted result using original text (preserves case)
  for (const match of mergedMatches) {
    if (match.start > lastIndex) {
      result.push(text.substring(lastIndex, match.start));
    }
    result.push(
      <mark
        key={`${match.start}-${match.end}`}
        className="bg-yellow-200 dark:bg-yellow-900/50 font-semibold"
      >
        {text.substring(match.start, match.end)}
      </mark>
    );
    lastIndex = match.end;
  }
  
  if (lastIndex < text.length) {
    result.push(text.substring(lastIndex));
  }
  
  return result.length > 0 ? <>{result}</> : text;
}

export function SearchResults({
  results,
  query,
  hint,
  error,
  onClose,
  onSelectItem,
  getItemId,
  getCategoryId,
  getSubcategoryId,
}: SearchResultsProps) {
  const { add } = useCart();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (results.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < results.length) {
            const result = results[selectedIndex];
            const itemId = getItemId(result.id);
            const categoryId = getCategoryId(result.id);
            const subcategoryId = getSubcategoryId(result.id);
            if (itemId && categoryId && subcategoryId) {
              onSelectItem(itemId, categoryId, subcategoryId);
              onClose();
            }
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [results, selectedIndex, onSelectItem, onClose, getItemId, getCategoryId, getSubcategoryId]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = itemRefs.current[selectedIndex];
    if (selectedElement && listRef.current) {
      selectedElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedIndex]);

  if (results.length === 0) {
    return (
      <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-border bg-card shadow-lg dark:border-white/10 dark:bg-slate-800">
        <div className="p-6 text-center">
          {error ? (
            <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
          ) : hint ? (
            <p className="text-sm font-medium text-foreground-muted">{hint}</p>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground-muted">
                Ничего не найдено по запросу &quot;{query}&quot;
              </p>
              <p className="mt-2 text-xs text-foreground-muted">
                Попробуйте изменить запрос или выберите категорию
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-border bg-card shadow-lg dark:border-white/10 dark:bg-slate-800">
      <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-4 py-2 dark:border-white/10">
        <span className="text-sm font-semibold text-foreground">
          Найдено: {results.length}
        </span>
        <button
          onClick={onClose}
          className="rounded-full p-1 hover:bg-hover dark:hover:bg-white/10"
          aria-label="Закрыть"
        >
          <X className="h-4 w-4 text-foreground-muted" />
        </button>
      </div>
      <div ref={listRef} className="divide-y divide-border dark:divide-white/10">
        {results.map((result, index) => {
          const itemId = getItemId(result.id);
          const categoryId = getCategoryId(result.id);
          const subcategoryId = getSubcategoryId(result.id);
          const finalPrice = result.discount_percent
            ? Math.round(result.price * (1 - result.discount_percent / 100))
            : result.price;
          const isSelected = index === selectedIndex;

          if (!itemId || !categoryId || !subcategoryId) {
            return null;
          }

          return (
            <div
              key={result.id}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              className={`flex items-center gap-3 p-3 transition-colors ${
                isSelected
                  ? "bg-hover dark:bg-white/10"
                  : "hover:bg-hover dark:hover:bg-white/5"
              }`}
            >
              {result.image_url ? (
                <img
                  src={result.image_url}
                  alt={result.name}
                  className="h-16 w-16 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-skeleton-base border border-border shadow-sm dark:bg-white/10 dark:border-white/10">
                  <span className="text-xs text-foreground-muted">нет фото</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground line-clamp-1">
                  {highlightMatches(result.name, query)}
                </h3>
                {result.description && (
                  <p className="mt-1 text-xs text-foreground-muted line-clamp-2">
                    {highlightMatches(result.description, query)}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-2">
                  {result.discount_percent && (
                    <span className="text-xs font-medium text-red-600 dark:text-red-400">
                      -{result.discount_percent}%
                    </span>
                  )}
                  <span className="text-sm font-bold text-foreground">
                    {finalPrice} ₽
                  </span>
                  {result.discount_percent && (
                    <span className="text-xs text-foreground-muted line-through">
                      {result.price} ₽
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    onSelectItem(itemId, categoryId, subcategoryId);
                    onClose();
                  }}
                  className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-hover dark:border-white/10 dark:hover:bg-white/10"
                  aria-label="Открыть"
                >
                  <ExternalLink className="h-3 w-3" />
                  Открыть
                </button>
                <button
                  onClick={() => {
                    const itemId = getItemId(result.id);
                    if (itemId) {
                      add(String(result.id));
                    }
                  }}
                  className="flex items-center gap-1 rounded-lg border border-border bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark dark:border-white/10"
                  aria-label="В корзину"
                >
                  <ShoppingCart className="h-3 w-3" />
                  В корзину
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {results.length >= 10 && (
        <div className="border-t border-border bg-card px-4 py-2 text-center dark:border-white/10 dark:bg-white/5">
          <p className="text-xs text-foreground-muted">
            Показано {results.length} результатов. Уточните запрос для более точного поиска.
          </p>
        </div>
      )}
    </div>
  );
}
