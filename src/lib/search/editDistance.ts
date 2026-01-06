/**
 * Simple Damerau-Levenshtein distance implementation
 * For typo tolerance in search
 */

/**
 * Calculate Damerau-Levenshtein distance between two strings
 * Returns the minimum number of operations (insert, delete, substitute, transpose) needed
 */
export function damerauLevenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const lenA = a.length;
  const lenB = b.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= lenA; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= lenB; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );

      // Transposition (Damerau extension)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matrix[i][j] = Math.min(
          matrix[i][j],
          matrix[i - 2][j - 2] + cost
        );
      }
    }
  }

  return matrix[lenA][lenB];
}

/**
 * Check if two strings are similar within a given edit distance threshold
 */
export function isSimilar(a: string, b: string, maxDistance: number): boolean {
  return damerauLevenshteinDistance(a, b) <= maxDistance;
}

