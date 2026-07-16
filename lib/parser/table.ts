/**
 * Table Parser
 * Parses OCR text into product rows by extracting structured table data
 */

import { parseRow, ProductRow } from './index'
import { hasProduct } from '@/lib/catalog/catalog'

export interface ParseTableOptions {
  invoice?: string
  allowNegativeQty?: boolean
  trackUnknown?: boolean
}

export interface ParseTableResult {
  rows: ProductRow[]
  unknownProducts: ProductRow[]
}

/**
 * Parse table data from OCR text
 * Extracts SKU (5 digits), barcode (13 digits), and quantity from each line
 * @param text OCR extracted text
 * @param options Parse options
 * @returns Array of parsed ProductRow objects
 */
export function parseTable(text: string): ProductRow[] {
  const rows: ProductRow[] = []

  const lines = text.split('\n')

  for (const line of lines) {
    if (!line.match(/\d{5}/)) continue

    const sku = line.match(/\b\d{5}\b/)?.[0]
    const barcode = line.match(/\b\d{13}\b/)?.[0]

    if (!sku || !barcode) continue

    const qtyMatch = line.match(/(-?\d+(?:\.\d+)?)$/)
    const quantity = qtyMatch ? Number(qtyMatch[1]) : 0

    rows.push(
      parseRow({
        invoice: '',
        sku,
        barcode,
        name: line,
        quantity,
      })
    )
  }

  return rows
}

/**
 * Parse table data with unknown product tracking
 * @param text OCR text to parse
 * @param options Parse options
 * @returns Object with parsed rows and unknown products
 */
export function parseTableWithTracking(
  text: string,
  options: ParseTableOptions = {}
): ParseTableResult {
  const rows: ProductRow[] = []
  const unknownProducts: ProductRow[] = []
  const lines = text.split('\n')

  lines.forEach((line) => {
    if (!line.match(/\d{5}/)) return

    const sku = line.match(/\b\d{5}\b/)?.[0]
    const barcode = line.match(/\b\d{13}\b/)?.[0]

    if (!sku || !barcode) return

    const qtyMatch = line.match(/(-?\d+(?:\.\d+)?)$/)
    const quantity = qtyMatch ? Number(qtyMatch[1]) : 0

    if (quantity === 0) return

    if (!options.allowNegativeQty && quantity < 0) return

    const row = parseRow({
      invoice: options.invoice || '',
      sku,
      barcode,
      name: line,
      quantity,
    })

    rows.push(row)

    // Track unknown products
    if (options.trackUnknown && !hasProduct(row.sku)) {
      unknownProducts.push(row)
    }
  })

  return { rows, unknownProducts }
}

/**
 * Parse table data with detailed validation
 * @param text OCR text to parse
 * @param options Parse options
 * @returns Object with parsed rows and validation errors
 */
export function parseTableWithValidation(
  text: string,
  options: ParseTableOptions = {}
): { rows: ProductRow[]; errors: string[] } {
  const errors: string[] = []
  const rows: ProductRow[] = []
  const lines = text.split('\n')

  lines.forEach((line, lineIndex) => {
    // Skip empty lines
    if (!line.trim()) return

    // Check for 5-digit SKU
    const sku = line.match(/\b\d{5}\b/)?.[0]
    if (!sku) {
      errors.push(`Line ${lineIndex + 1}: No valid SKU found (5 digits)`)
      return
    }

    // Check for 13-digit barcode
    const barcode = line.match(/\b\d{13}\b/)?.[0]
    if (!barcode) {
      errors.push(`Line ${lineIndex + 1}: No valid barcode found (13 digits)`)
      return
    }

    // Extract quantity
    const qtyMatch = line.match(/(-?\d+(?:\.\d+)?)$/)
    const quantity = qtyMatch ? Number(qtyMatch[1]) : 0

    if (quantity === 0) {
      errors.push(`Line ${lineIndex + 1}: Quantity is 0`)
      return
    }

    if (!options.allowNegativeQty && quantity < 0) {
      errors.push(`Line ${lineIndex + 1}: Negative quantity (${quantity})`)
      return
    }

    rows.push(
      parseRow({
        invoice: options.invoice || '',
        sku,
        barcode,
        name: line,
        quantity,
      })
    )
  })

  return { rows, errors }
}

/**
 * Parse multiple table sections from text
 * Useful for OCR output with multiple invoices or tables
 * @param text Full text containing multiple table sections
 * @param tableDelimiter Delimiter between table sections
 * @returns Array of parsed rows from all tables
 */
export function parseMultipleTables(
  text: string,
  tableDelimiter: string = '---'
): ProductRow[] {
  const tables = text.split(tableDelimiter)
  const allRows: ProductRow[] = []

  tables.forEach((table) => {
    const rows = parseTable(table)
    allRows.push(...rows)
  })

  return allRows
}

/**
 * Extract and parse table from structured OCR data
 * @param text OCR text
 * @param headerPattern Optional regex to identify table header
 * @returns Parsed product rows
 */
export function parseStructuredTable(
  text: string,
  headerPattern?: RegExp
): ProductRow[] {
  let processText = text

  // If header pattern provided, extract content after header
  if (headerPattern) {
    const headerMatch = text.match(headerPattern)
    if (headerMatch && headerMatch.index !== undefined) {
      processText = text.substring(headerMatch.index + headerMatch[0].length)
    }
  }

  return parseTable(processText)
}
