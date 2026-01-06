/**
 * Regression tests for search precision
 * Ensures exact matches rank higher than soft expansions
 */

import { describe, it, expect } from "vitest";
import { buildSearchIndex, searchMenu } from "../menuSearch";

describe("Search Precision", () => {
  const testIndex = buildSearchIndex([
    {
      id: 1,
      name: "Капучино",
      description: "Кофе с молоком",
      categoryName: "Напитки",
      subcategoryName: "Кофе",
      price: 250,
      discountPercent: null,
      imageUrl: null,
    },
    {
      id: 2,
      name: "Эспрессо",
      description: "Крепкий кофе",
      categoryName: "Напитки",
      subcategoryName: "Кофе",
      price: 200,
      discountPercent: null,
      imageUrl: null,
    },
    {
      id: 3,
      name: "Латте",
      description: "Кофе с молоком",
      categoryName: "Напитки",
      subcategoryName: "Кофе",
      price: 280,
      discountPercent: null,
      imageUrl: null,
    },
    {
      id: 4,
      name: "Чай черный",
      description: "Горячий напиток",
      categoryName: "Напитки",
      subcategoryName: "Чай",
      price: 150,
      discountPercent: null,
      imageUrl: null,
    },
  ]);

  describe("Exact match precision", () => {
    it('query "капучино" -> top result must be "Капучино"', () => {
      const results = searchMenu(testIndex, "капучино");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].item.name).toBe("Капучино");
      expect(results[0].score).toBeGreaterThan(10); // High score for exact match
    });

    it('query "капучино" should rank "Капучино" above generic coffee items', () => {
      const results = searchMenu(testIndex, "капучино");
      const cappuccinoIndex = results.findIndex(r => r.item.name === "Капучино");
      const espressoIndex = results.findIndex(r => r.item.name === "Эспрессо");
      const latteIndex = results.findIndex(r => r.item.name === "Латте");
      
      // Капучино should be first
      expect(cappuccinoIndex).toBe(0);
      
      // If other coffee items appear, they should rank lower (soft expansion)
      if (espressoIndex >= 0) {
        expect(espressoIndex).toBeGreaterThan(cappuccinoIndex);
      }
      if (latteIndex >= 0) {
        expect(latteIndex).toBeGreaterThan(cappuccinoIndex);
      }
    });
  });

  describe("Coffee category search", () => {
    it('query "кофе" -> returns coffee drinks', () => {
      const results = searchMenu(testIndex, "кофе");
      expect(results.length).toBeGreaterThan(0);
      
      // Should include coffee items
      const coffeeItems = results.filter(r => 
        r.item.name.includes("Капучино") ||
        r.item.name.includes("Эспрессо") ||
        r.item.name.includes("Латте")
      );
      expect(coffeeItems.length).toBeGreaterThan(0);
    });

    it('query "кофе" should NOT return tea items', () => {
      const results = searchMenu(testIndex, "кофе");
      const teaItems = results.filter(r => r.item.name.includes("Чай"));
      expect(teaItems.length).toBe(0);
    });
  });

  describe("Latin look-alike normalization", () => {
    it('query "кофe" (latin e) -> behaves like "кофе"', () => {
      const results1 = searchMenu(testIndex, "кофe");
      const results2 = searchMenu(testIndex, "кофе");
      
      // Should return same results
      expect(results1.length).toBe(results2.length);
      expect(results1.map(r => r.item.name)).toEqual(results2.map(r => r.item.name));
    });

    it('query "кофe" should find coffee items', () => {
      const results = searchMenu(testIndex, "кофe");
      expect(results.length).toBeGreaterThan(0);
      
      const coffeeItems = results.filter(r => 
        r.item.name.includes("Капучино") ||
        r.item.name.includes("Эспрессо") ||
        r.item.name.includes("Латте")
      );
      expect(coffeeItems.length).toBeGreaterThan(0);
    });
  });

  describe("Soft expansion behavior", () => {
    it('query "капучино" should find "Капучино" with high score', () => {
      const results = searchMenu(testIndex, "капучино");
      const cappuccino = results.find(r => r.item.name === "Капучино");
      
      expect(cappuccino).toBeDefined();
      // Exact match should have high score (>= 10)
      expect(cappuccino!.score).toBeGreaterThanOrEqual(10);
    });

    it('query "капучино" should find other coffee items with lower score (soft expansion)', () => {
      const results = searchMenu(testIndex, "капучино");
      const espresso = results.find(r => r.item.name === "Эспрессо");
      const latte = results.find(r => r.item.name === "Латте");
      
      // If found via soft expansion, should have lower score
      if (espresso) {
        expect(espresso.score).toBeLessThan(10); // Soft expansion gets 30% weight
      }
      if (latte) {
        expect(latte.score).toBeLessThan(10);
      }
    });
  });
});

