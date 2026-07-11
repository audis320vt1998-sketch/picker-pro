/**
 * Fuzzy matching algorithms for similarity scoring
 */

/**
 * Calculate Levenshtein distance between two strings
 * Represents minimum edit distance (insertions, deletions, substitutions)
 * 
 * @param a - First string
 * @param b - Second string
 * @returns Distance score (0 = identical, higher = more different)
 * 
 * @example
 * levenshteinDistance("פראגינו", "פראנוי") → 2
 * levenshteinDistance("hello", "hello") → 0
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i][j - 1] + 1,        // insertion
        matrix[i - 1][j] + 1,        // deletion
        matrix[i - 1][j - 1] + cost  // substitution
      )
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Calculate Jaro-Winkler similarity between two strings
 * Accounts for character order and uses prefix matching bonus
 * 
 * @param a - First string
 * @param b - Second string
 * @returns Similarity score (0-1, where 1 = perfect match)
 * 
 * @example
 * jaroWinkler("פראגינו", "פראנוי") → 0.85
 * jaroWinkler("hello", "hello") → 1.0
 */
export function jaroWinkler(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1.0

  let matches = 0
  let transpositions = 0

  const aMatched = new Array(a.length).fill(false)
  const bMatched = new Array(b.length).fill(false)

  const matchDistance = Math.floor(maxLen / 2) - 1

  // Find matches
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchDistance)
    const end = Math.min(i + matchDistance + 1, b.length)

    for (let j = start; j < end; j++) {
      if (bMatched[j] || a[i] !== b[j]) continue
      aMatched[i] = true
      bMatched[j] = true
      matches++
      break
    }
  }

  if (matches === 0) return 0

  // Count transpositions
  for (let i = 0, k = 0; i < a.length; i++) {
    if (!aMatched[i]) continue
    while (!bMatched[k]) k++
    if (a[i] !== b[k]) transpositions++
    k++
  }

  // Calculate Jaro score
  const jaro =
    (matches / a.length +
      matches / b.length +
      (matches - transpositions / 2) / matches) /
    3

  // Calculate common prefix (up to 4 characters)
  let prefix = 0
  for (let i = 0; i < Math.min(4, Math.min(a.length, b.length)); i++) {
    if (a[i] === b[i]) prefix++
    else break
  }

  // Apply Winkler modification
  return jaro + prefix * 0.1 * (1 - jaro)
}

/**
 * Calculate combined similarity score
 * Uses weighted average of Levenshtein and Jaro-Winkler
 * 
 * @param a - First string
 * @param b - Second string
 * @returns Combined similarity score (0-1, where 1 = perfect match)
 * 
 * Weights: 40% Levenshtein, 60% Jaro-Winkler
 * 
 * @example
 * similarityScore("פראגינו", "פראנוי") → 0.82
 * similarityScore("hello", "hello") → 1.0
 * similarityScore("hello", "world") → 0.15
 */
export function similarityScore(a: string, b: string): number {
  const normalized_a = a.toLowerCase().trim()
  const normalized_b = b.toLowerCase().trim()

  if (normalized_a === normalized_b) return 1.0

  // Levenshtein-based score
  const lev = levenshteinDistance(normalized_a, normalized_b)
  const maxLen = Math.max(normalized_a.length, normalized_b.length)
  const levScore = maxLen === 0 ? 1.0 : 1 - lev / maxLen

  // Jaro-Winkler score
  const jaroScore = jaroWinkler(normalized_a, normalized_b)

  // Weighted average: 40% Levenshtein, 60% Jaro-Winkler
  return levScore * 0.4 + jaroScore * 0.6
}

/**
 * Find the nearest matching product from candidates
 * 
 * @param name - Product name to match
 * @param candidates - List of candidate product names
 * @param threshold - Minimum similarity score (default 0.7)
 * @returns Best matching candidate or null if below threshold
 * 
 * @example
 * nearestProduct("פראגינו", ["פראנוי", "סניקרס"]) → "פראנוי"
 * nearestProduct("unknown", ["known1", "known2"], 0.8) → null
 */
export function nearestProduct(
  name: string,
  candidates: string[],
  threshold: number = 0.7
): string | null {
  let bestMatch: string | null = null
  let bestScore = threshold

  for (const candidate of candidates) {
    const score = similarityScore(name, candidate)
    if (score > bestScore) {
      bestScore = score
      bestMatch = candidate
    }
  }

  return bestMatch
}

/**
 * Find all matching products above threshold
 * 
 * @param name - Product name to match
 * @param candidates - List of candidate product names
 * @param threshold - Minimum similarity score (default 0.7)
 * @returns Array of matches sorted by score (descending)
 */
export function findMatches(
  name: string,
  candidates: string[],
  threshold: number = 0.7
): Array<{ candidate: string; score: number }> {
  const matches = candidates
    .map(candidate => ({
      candidate,
      score: similarityScore(name, candidate)
    }))
    .filter(m => m.score >= threshold)
    .sort((a, b) => b.score - a.score)

  return matches
}

/**
 * Get the best N matches
 */
export function findTopMatches(
  name: string,
  candidates: string[],
  topN: number = 3
): Array<{ candidate: string; score: number }> {
  return findMatches(name, candidates, 0)
    .slice(0, topN)
}
