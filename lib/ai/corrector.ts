/**
 * OCR correction is deliberately non-operational until every suggestion can be
 * tied to a source row and reviewed by a person. These helpers preserve the
 * original value and make the uncertainty explicit instead of applying a
 * silent character, dictionary, or fuzzy-match replacement.
 */

export interface CorrectionResult {
  text: string
  confidence: 0
  status: 'needs_review'
  corrections: []
  message: string
}

function requiresReview(raw: string): CorrectionResult {
  return {
    text: raw,
    confidence: 0,
    status: 'needs_review',
    corrections: [],
    message: 'Automatic OCR correction is unavailable; review the source row.',
  }
}

export function correct(raw: string): CorrectionResult {
  return requiresReview(raw)
}

export function correctSKU(raw: string): CorrectionResult {
  return requiresReview(raw)
}

export function correctProductName(
  raw: string,
  _candidates?: readonly string[]
): CorrectionResult {
  return requiresReview(raw)
}
