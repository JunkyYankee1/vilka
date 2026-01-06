/**
 * Test cases for synonym expansion
 */

import { describe, it, expect } from "vitest";
import { expandTokensWithSynonyms, getSynonyms, areSynonyms, isSoftExpansion } from "../synonyms";

describe("Synonyms", () => {
  describe("expandTokensWithSynonyms", () => {
    it("should expand шаверма to include шаурма (true synonym)", () => {
      const expanded = expandTokensWithSynonyms(["шаверма"]);
      expect(expanded).toContain("шаверма");
      expect(expanded).toContain("шаурма");
    });

    it("should expand капучино to include кофе (soft expansion)", () => {
      const expanded = expandTokensWithSynonyms(["капучино"]);
      expect(expanded).toContain("капучино");
      expect(expanded).toContain("кофе");
    });

    it("should handle multiple tokens", () => {
      const expanded = expandTokensWithSynonyms(["шаверма", "пицца"]);
      expect(expanded.length).toBeGreaterThan(2);
    });

    it("should return original token if no synonyms", () => {
      const expanded = expandTokensWithSynonyms(["xyzabc"]);
      expect(expanded).toEqual(["xyzabc"]);
    });

    it("should exclude soft expansions when includeSoft=false", () => {
      const expanded = expandTokensWithSynonyms(["капучино"], false);
      expect(expanded).toEqual(["капучино"]); // No soft expansion
    });
  });

  describe("isSoftExpansion", () => {
    it("should return true for капучино -> кофе", () => {
      expect(isSoftExpansion("капучино", "кофе")).toBe(true);
    });

    it("should return false for true synonyms", () => {
      expect(isSoftExpansion("шаверма", "шаурма")).toBe(false);
    });

    it("should return false for non-synonyms", () => {
      expect(isSoftExpansion("пицца", "бургер")).toBe(false);
    });
  });

  describe("getSynonyms", () => {
    it("should return synonyms for шаверма", () => {
      const synonyms = getSynonyms("шаверма");
      expect(synonyms).toContain("шаверма");
      expect(synonyms).toContain("шаурма");
    });

    it("should return original token if no synonyms", () => {
      const synonyms = getSynonyms("xyzabc");
      expect(synonyms).toEqual(["xyzabc"]);
    });
  });

  describe("areSynonyms", () => {
    it("should return true for шаверма and шаурма", () => {
      expect(areSynonyms("шаверма", "шаурма")).toBe(true);
      expect(areSynonyms("шаурма", "шаверма")).toBe(true);
    });

    it("should return true for identical tokens", () => {
      expect(areSynonyms("пицца", "пицца")).toBe(true);
    });

    it("should return false for non-synonyms", () => {
      expect(areSynonyms("пицца", "бургер")).toBe(false);
    });
  });
});

