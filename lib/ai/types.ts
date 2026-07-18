/**
 * AI Corrector Types
 */

export interface CorrectionResult {
  text: string
  confidence: number
  status: string
  corrections: string[]
  message: string
}
