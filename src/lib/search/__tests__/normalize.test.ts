import { describe, it, expect } from "vitest";
import { normalizeQuery, tokenize, normalizeText, isQueryTooShort } from "../normalize";

describe("normalizeQuery", () => {
  it("should normalize Russian text", () => {
    expect(normalizeQuery("Бизнес-ланч")).toBe("бизнес ланч");
    expect(normalizeQuery("Острый вок")).toBe("острый вок");
    expect(normalizeQuery("ёлка")).toBe("елка");
  });

  it("should handle separators", () => {
    expect(normalizeQuery("бизнес-ланч")).toBe("бизнес ланч");
    expect(normalizeQuery("бизнес—ланч")).toBe("бизнес ланч");
    expect(normalizeQuery("бизнес/ланч")).toBe("бизнес ланч");
    expect(normalizeQuery("бизнес,ланч")).toBe("бизнес ланч");
    expect(normalizeQuery("бизнес.ланч")).toBe("бизнес ланч");
  });

  it("should collapse spaces", () => {
    expect(normalizeQuery("бизнес   ланч")).toBe("бизнес ланч");
    expect(normalizeQuery("  бизнес  ланч  ")).toBe("бизнес ланч");
  });

  it("should remove punctuation", () => {
    expect(normalizeQuery("бизнес-ланч!")).toBe("бизнес ланч");
    expect(normalizeQuery("бизнес?ланч")).toBe("бизнесланч"); // "?" is not a separator, so it's removed
    expect(normalizeQuery("бизнес-ланч!")).toBe("бизнес ланч"); // "-" is a separator, becomes space
  });
});

describe("tokenize", () => {
  it("should split on spaces and separators", () => {
    expect(tokenize("бизнес-ланч")).toEqual(["бизнес", "ланч"]);
    expect(tokenize("острый вок")).toEqual(["острый", "вок"]);
    expect(tokenize("бизнес—ланч")).toEqual(["бизнес", "ланч"]);
  });

  it("should handle empty strings", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("   ")).toEqual([]);
  });
});

describe("isQueryTooShort", () => {
  it("should check single token length", () => {
    expect(isQueryTooShort("во", 3)).toBe(true);
    expect(isQueryTooShort("вок", 3)).toBe(false);
  });

  it("should check multi-word queries", () => {
    expect(isQueryTooShort("во ок", 3)).toBe(true); // both tokens too short
    expect(isQueryTooShort("вок ок", 3)).toBe(false); // at least one token >= 3
    expect(isQueryTooShort("бизнес ланч", 3)).toBe(false);
  });
});

describe("Search matching scenarios", () => {
  it("should find 'бизнес-ланч' with query 'бизнес'", () => {
    const query = normalizeQuery("бизнес");
    const title = normalizeText("бизнес-ланч");
    const queryTokens = tokenize(query);
    const titleTokens = tokenize(title);
    
    expect(queryTokens).toEqual(["бизнес"]);
    expect(titleTokens).toEqual(["бизнес", "ланч"]);
    expect(titleTokens.some(t => t.startsWith(queryTokens[0]))).toBe(true);
  });

  it("should find 'бизнес-ланч' with query 'ланч'", () => {
    const query = normalizeQuery("ланч");
    const title = normalizeText("бизнес-ланч");
    const queryTokens = tokenize(query);
    const titleTokens = tokenize(title);
    
    expect(queryTokens).toEqual(["ланч"]);
    expect(titleTokens).toEqual(["бизнес", "ланч"]);
    expect(titleTokens.some(t => t === queryTokens[0] || t.startsWith(queryTokens[0]))).toBe(true);
  });

  it("should find 'бизнес-ланч' with query 'бизнес ланч'", () => {
    const query = normalizeQuery("бизнес ланч");
    const title = normalizeText("бизнес-ланч");
    const queryTokens = tokenize(query);
    const titleTokens = tokenize(title);
    
    expect(queryTokens).toEqual(["бизнес", "ланч"]);
    expect(titleTokens).toEqual(["бизнес", "ланч"]);
    // Both tokens should match
    expect(queryTokens.every(qt => 
      titleTokens.some(tt => tt === qt || tt.startsWith(qt))
    )).toBe(true);
  });
});

