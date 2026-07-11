import type { CorrectionResult } from './types'
import { calculateConfidence } from './confidence'
import { fixCharacterErrors, lookupCorrection } from './dictionary'
import { nearestProduct } from './fuzzy'
import { validateEAN13, correctEAN13 } from './ean'

/**
 * Correct a raw OCR text input
 * Applies character fixes, dictionary lookups, and confidence scoring
 * @param raw - Raw text from OCR
 * @returns CorrectionResult with corrected text and metadata
 */
export function correct(raw: string): CorrectionResult {
  let text = raw.trim()
  const corrections: string[] = []

  // Step 1: Fix character errors (O→0, I→1, etc.)
  const fixedText = fixCharacterErrors(text)
  if (fixedText !== text) {
    corrections.push(`Character fix: "${text}" → "${fixedText}"`)
    text = fixedText
  }

  // Step 2: Dictionary lookup for product names
  const dictionaryMatch = lookupCorrection(text)
  if (dictionaryMatch) {
    corrections.push(`Dictionary: "${text}" → "${dictionaryMatch}"`)
    text = dictionaryMatch
  }

  // Calculate confidence
  const conf = calculateConfidence(corrections.length)

  return {
    text,
    confidence: conf.score,
    status: conf.status,
    corrections,
    message: conf.message
  }
}

/**
 * Correct a SKU/barcode
 * Applies character fixes and EAN-13 validation
 * @param raw - Raw SKU from OCR
 * @returns CorrectionResult with corrected SKU
 */
export function correctSKU(raw: string): CorrectionResult {
  let text = raw.trim()
  const corrections: string[] = []

  // Fix character errors first
  const fixedText = fixCharacterErrors(text)
  if (fixedText !== text) {
    corrections.push(`Character fix: "${text}" → "${fixedText}"`)
    text = fixedText
  }

  // Remove any remaining non-digit characters (except hyphen for ranges)
  const cleanText = text.replace(/[^\d\-]/g, '')
  if (cleanText !== text) {
    corrections.push(`Cleaning: "${text}" → "${cleanText}"`)
    text = cleanText
  }

  // Validate/correct EAN-13 if it looks like a barcode
  if (/^\d{12,13}$/.test(text)) {
    const isValid = text.length === 13 ? validateEAN13(text) : false
    if (!isValid) {
      const correctedEAN = correctEAN13(text)
      corrections.push(`EAN-13: "${text}" → "${correctedEAN}"`)
      text = correctedEAN
    }
  }

  const conf = calculateConfidence(corrections.length)

  return {
    text,
    confidence: conf.score,
    status: conf.status,
    corrections,
    message: conf.message
  }
}

/**
 * Correct a product name with fuzzy matching fallback
 * @param raw - Raw product name from OCR
 * @param candidates - List of known product names for fuzzy matching
 * @returns CorrectionResult with corrected name
 */
export function correctProductName(
  raw: string,
  candidates?: string[]
): CorrectionResult {
  let text = raw.trim()
  const corrections: string[] = []

  // Step 1: Character fixes
  const fixedText = fixCharacterErrors(text)
  if (fixedText !== text) {
    corrections.push(`Character fix: "${text}" → "${fixedText}"`)
    text = fixedText
  }

  // Step 2: Dictionary lookup
  const dictionaryMatch = lookupCorrection(text)
  if (dictionaryMatch) {
    corrections.push(`Dictionary: "${text}" → "${dictionaryMatch}"`)
    text = dictionaryMatch
  }

  // Step 3: Fuzzy matching if candidates provided
  if (candidates && candidates.length > 0) {
    const fuzzyMatch = nearestProduct(text, candidates, 0.85)
    if (fuzzyMatch && fuzzyMatch !== text) {
      corrections.push(`Fuzzy match: "${text}" → "${fuzzyMatch}"`)
      text = fuzzyMatch
    }
  }

  const conf = calculateConfidence(corrections.length)

  return {
    text,
    confidence: conf.score,
    status: conf.status,
    corrections,
    message: conf.message
  }
}
