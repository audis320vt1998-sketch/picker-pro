export interface ConfidenceScore {
  score: number
  status: string
  message: string
}

/** Calculate OCR confidence for a correction count. */
export function calculateConfidence(correctionCount: number): ConfidenceScore {
  const score = Math.max(0, 1 - correctionCount * 0.15)
  const status = score >= 0.9 ? 'high' : score >= 0.7 ? 'medium' : 'low'
  const message = score >= 0.9
    ? 'High confidence'
    : score >= 0.7
    ? 'Medium confidence - review recommended'
    : 'Low confidence - manual verification required'
  return { score, status, message }
}
