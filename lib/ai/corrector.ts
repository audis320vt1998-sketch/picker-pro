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

/**
 * Correct a low-confidence OCR result using the OpenAI API as a fallback.
 * Only called server-side (requires OPENAI_API_KEY).
 *
 * @param raw        - Raw text from OCR
 * @param candidates - Optional list of known product names for context
 * @returns Corrected text string
 */
export async function correctWithGPT(
  raw: string,
  candidates?: string[]
): Promise<string> {
  // Import here so the rest of the module stays browser-safe
  const { prompt } = await import('./openai')

  const systemPrompt =
    'You are an OCR correction assistant for a product picker application. ' +
    'Fix OCR errors in the given text and return only the corrected text, nothing else.'

  const context =
    candidates && candidates.length > 0
      ? `\n\nKnown product names for reference: ${candidates.slice(0, 20).join(', ')}`
      : ''

  const userMessage = `Correct this OCR text: "${raw}"${context}`

  const corrected = await prompt(userMessage, systemPrompt, {
    temperature: 0.1,
    maxTokens: 128,
  })

  return corrected.trim()
}
