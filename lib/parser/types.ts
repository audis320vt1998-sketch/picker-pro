/**
 * Parser Types
 * Shared types for OCR parsing modules.
 */

export interface ParsedToken {
  text: string
  confidence: number
  type: 'sku' | 'barcode' | 'quantity' | 'name' | 'unknown'
}

/** A parsed row from OCR output. */
export interface ParsedRow {
  sku: string
  barcode?: string
  name?: string
  /** Alias for name, used by the Hebrew parser. */
  productName?: string
  quantity: number
  /** Unit type (e.g. 'units', 'cases'). */
  unit?: string
  /** Detected language of the row text. */
  language?: string
  /** Row processing status. */
  status?: string
  rawText?: string
  confidence: number
}
