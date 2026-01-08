/**
 * Keyboard layout swap between EN and RU (phonetic keyboard positions).
 * Useful when user types Russian words on English layout or vice versa.
 */
const EN = "`qwertyuiop[]asdfghjkl;'zxcvbnm,./";
const RU = "ёйцукенгшщзхъфывапролджэячсмитьбю.";

function buildMap(from: string, to: string): Map<string, string> {
  const m = new Map<string, string>();
  for (let i = 0; i < Math.min(from.length, to.length); i++) {
    const a = from[i];
    const b = to[i];
    m.set(a, b);
    m.set(a.toUpperCase(), b.toUpperCase());
  }
  return m;
}

const EN_TO_RU = buildMap(EN, RU);
const RU_TO_EN = buildMap(RU, EN);

export function swapKeyboardLayoutEnToRu(text: string): string {
  return Array.from(text)
    .map((ch) => EN_TO_RU.get(ch) ?? ch)
    .join("");
}

export function swapKeyboardLayoutRuToEn(text: string): string {
  return Array.from(text)
    .map((ch) => RU_TO_EN.get(ch) ?? ch)
    .join("");
}

export function buildQueryVariants(query: string): string[] {
  const variants = [query, swapKeyboardLayoutEnToRu(query), swapKeyboardLayoutRuToEn(query)];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of variants) {
    const trimmed = v.trim();
    if (!trimmed) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

