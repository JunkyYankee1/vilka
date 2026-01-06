/**
 * Test cases for Russian morphology (stemming)
 */

import { describe, it, expect } from "vitest";
import { stemRu, getStemVariants } from "../morphology";

describe("Russian Morphology", () => {
  describe("stemRu", () => {
    it("should stem куриный to курин", () => {
      expect(stemRu("куриный")).toBe("курин");
    });

    it("should stem куриная to курин", () => {
      expect(stemRu("куриная")).toBe("курин");
    });

    it("should stem куриное to курин", () => {
      expect(stemRu("куриное")).toBe("курин");
    });

    it("should stem куриные to курин", () => {
      expect(stemRu("куриные")).toBe("курин");
    });

    it("should NOT stem short tokens (< 5 chars)", () => {
      expect(stemRu("суп")).toBe("суп");
      expect(stemRu("вок")).toBe("вок");
      expect(stemRu("ланч")).toBe("ланч");
    });

    it("should return original if no stem found", () => {
      expect(stemRu("бизнес")).toBe("бизнес");
      expect(stemRu("пицца")).toBe("пицца");
    });

    it("should handle case insensitivity", () => {
      expect(stemRu("КУРИНЫЙ")).toBe("курин");
      expect(stemRu("Куриная")).toBe("курин");
    });
  });

  describe("getStemVariants", () => {
    it("should return original and stem for long tokens", () => {
      const variants = getStemVariants("куриный");
      expect(variants).toContain("куриный");
      expect(variants).toContain("курин");
    });

    it("should return only original for short tokens", () => {
      const variants = getStemVariants("суп");
      expect(variants).toEqual(["суп"]);
    });

    it("should return only original if no stem found", () => {
      const variants = getStemVariants("бизнес");
      expect(variants).toEqual(["бизнес"]);
    });
  });
});

