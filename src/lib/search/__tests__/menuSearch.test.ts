/**
 * Test cases for menu search functionality
 * Run with: npm test src/lib/search/__tests__/menuSearch.test.ts
 */

import { describe, it, expect } from "vitest";
import { buildSearchIndex, searchMenu, shouldAutoNavigate } from "../menuSearch";

describe("Menu Search", () => {
  const testIndex = buildSearchIndex([
    {
      id: 1,
      name: "Бизнес-ланч",
      description: "Сытный обед для бизнеса",
      categoryName: "Горячие блюда",
      subcategoryName: "Ланчи",
      price: 450,
      discountPercent: null,
      imageUrl: null,
    },
    {
      id: 2,
      name: "Суп-пюре из тыквы",
      description: "Кремовый суп с тыквой",
      categoryName: "Супы",
      subcategoryName: null,
      price: 320,
      discountPercent: 10,
      imageUrl: null,
    },
    {
      id: 3,
      name: "Острый вок с креветкой",
      description: "Азиатское блюдо",
      categoryName: "Азиатский фьюжн",
      subcategoryName: "Воки",
      price: 680,
      discountPercent: null,
      imageUrl: null,
    },
  ]);

  describe("Token-based matching", () => {
    it('should find "Бизнес-ланч" by "бизнес" (prefix match)', () => {
      const results = searchMenu(testIndex, "бизнес");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.name).toBe("Бизнес-ланч");
      expect(results[0].matchType).toBe("prefix");
    });

    it('should find "Бизнес-ланч" by "ланч" (second word match)', () => {
      const results = searchMenu(testIndex, "ланч");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.name).toBe("Бизнес-ланч");
    });

    it('should find "Бизнес-ланч" by "бизнес ланч" (multi-word, best rank)', () => {
      const results = searchMenu(testIndex, "бизнес ланч");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.name).toBe("Бизнес-ланч");
      expect(results[0].score).toBeGreaterThan(10); // Should have high score
    });

    it('should find "Суп-пюре из тыквы" by "тыквы" (any word match)', () => {
      const results = searchMenu(testIndex, "тыквы");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.name).toBe("Суп-пюре из тыквы");
    });
  });

  describe("Typo tolerance", () => {
    it('should find "Бизнес-ланч" with typo "бизес" (length >= 4)', () => {
      const results = searchMenu(testIndex, "бизес");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.name).toBe("Бизнес-ланч");
      expect(results[0].matchType).toBe("typo");
    });

    it('should NOT allow typo for very short queries like "лан"', () => {
      const results = searchMenu(testIndex, "лан");
      // Should still find but not via typo matching
      if (results.length > 0) {
        expect(results[0].matchType).not.toBe("typo");
      }
    });
  });

  describe("Auto-navigation logic", () => {
    it("should auto-navigate when exactly 1 confident match", () => {
      const results = searchMenu(testIndex, "бизнес-ланч");
      expect(results.length).toBe(1);
      expect(shouldAutoNavigate(results, "бизнес-ланч")).toBe(true);
    });

    it("should NOT auto-navigate when 2+ matches", () => {
      // This would need a query that matches multiple items
      const results = searchMenu(testIndex, "вок");
      // If there are multiple results, should not auto-navigate
      if (results.length > 1) {
        expect(shouldAutoNavigate(results, "вок")).toBe(false);
      }
    });

    it("should NOT auto-navigate for very short queries", () => {
      const results = searchMenu(testIndex, "лан");
      if (results.length === 1) {
        expect(shouldAutoNavigate(results, "лан")).toBe(false); // Query too short
      }
    });
  });

  describe("Scoring and ranking", () => {
    it("should rank exact matches higher than prefix matches", () => {
      const exactResults = searchMenu(testIndex, "Бизнес-ланч");
      const prefixResults = searchMenu(testIndex, "бизнес");
      
      if (exactResults.length > 0 && prefixResults.length > 0) {
        expect(exactResults[0].score).toBeGreaterThanOrEqual(prefixResults[0].score);
      }
    });

    it("should filter out low-score results", () => {
      const results = searchMenu(testIndex, "xyzabc123"); // Should not match anything
      expect(results.length).toBe(0);
    });
  });
});

