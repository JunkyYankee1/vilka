/**
 * Test cases for Russian normalization (including Latin look-alike handling)
 */

import { describe, it, expect } from "vitest";
import { normalizeRu, tokenizeRu } from "../normalizeRu";

describe("Russian Normalization", () => {
  describe("Latin look-alike letters", () => {
    it("should normalize кофe (latin e) to кофе (cyrillic е)", () => {
      expect(normalizeRu("кофe")).toBe("кофе");
    });

    it("should normalize салaт (latin a) to салат (cyrillic а)", () => {
      expect(normalizeRu("салaт")).toBe("салат");
    });

    it("should normalize напитoк (latin o) to напиток (cyrillic о)", () => {
      expect(normalizeRu("напитoк")).toBe("напиток");
    });

    it("should normalize лапшa (latin a) to лапша (cyrillic а)", () => {
      expect(normalizeRu("лапшa")).toBe("лапша");
    });

    it("should handle mixed latin and cyrillic", () => {
      expect(normalizeRu("кофe и чай")).toBe("кофе и чай");
    });

    it("should not affect pure cyrillic text", () => {
      expect(normalizeRu("кофе")).toBe("кофе");
      expect(normalizeRu("салат")).toBe("салат");
    });
  });

  describe("Basic normalization", () => {
    it("should replace ё with е", () => {
      expect(normalizeRu("ёлка")).toBe("елка");
    });

    it("should handle separators", () => {
      expect(normalizeRu("бизнес-ланч")).toBe("бизнес ланч");
      expect(normalizeRu("суп/пюре")).toBe("суп пюре");
    });

    it("should collapse spaces", () => {
      expect(normalizeRu("кофе   и   чай")).toBe("кофе и чай");
    });

    it("should lowercase", () => {
      expect(normalizeRu("КОФЕ")).toBe("кофе");
    });
  });

  describe("Tokenization", () => {
    it("should tokenize бизнес-ланч correctly", () => {
      const tokens = tokenizeRu("бизнес-ланч");
      expect(tokens).toContain("бизнес");
      expect(tokens).toContain("ланч");
    });

    it("should handle latin look-alikes in tokenization", () => {
      const tokens = tokenizeRu("кофe");
      expect(tokens).toEqual(["кофе"]);
    });
  });
});

