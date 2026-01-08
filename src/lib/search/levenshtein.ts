/**
 * Simple Levenshtein distance implementation for typo tolerance.
 * Used for tokens of length 4-8 (distance <= 1) and longer (distance <= 2).
 */

/**
 * Computes Levenshtein distance between two strings.
 * @param a - First string
 * @param b - Second string
 * @returns Edit distance
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  
  // Create a matrix
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));
  
  // Initialize base cases
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }
  
  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1,     // insertion
          dp[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Checks if two strings are similar within the allowed edit distance.
 * @param a - First string
 * @param b - Second string
 * @param maxDistance - Maximum allowed distance
 * @returns True if distance <= maxDistance
 */
export function isSimilar(a: string, b: string, maxDistance: number): boolean {
  return levenshteinDistance(a, b) <= maxDistance;
}

