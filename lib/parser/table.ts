/**
 * Table Parser
 * Parses OCR text into product rows by extracting structured table data
 */

import { parseRow, ProductRow } from './index'

export interface ParseTableOptions {
  invoice?: string
  allowNegativeQty?: boolean
}

/**
 * Parse table data from OCR text
 * Extracts SKU (5 digits), barcode (13 digits), and quantity from each line
 * @param text OCR extracted text
 * @param options Parse options
 * @returns Array of parsed ProductRow objects
 */
export function parseTable(
  text: string,
  options: ParseTableOptions = {}
): ProductRow[] {
  const rows: ProductRow[] = []
  const lines = text.split('\n')

  for (const line of lines) {
    // Skip lines without 5-digit SKU
    if (!line.match(/\d{5}/)) continue

    // Extract SKU (5 digits)
    const sku = line.match(/\b\d{5}\b/)?.[0]

    // Extract barcode (13 digits)
    const barcode = line.match(/\b\d{13}\b/)?.[0]

    // Skip if either SKU or barcode is missing
    if (!sku || !barcode) continue

    // Extract quantity (last number in line, can be decimal or negative)
    const qtyMatch = line.match(/(-?\d+(?:\.\d+)?)$/)
    const quantity = qtyMatch ? Number(qtyMatch[1]) : 0

    // Skip if quantity is negative and not allowed
    if (!options.allowNegativeQty && quantity < 0) continue

    // Skip if quantity is 0
    if (quantity === 0) continue

    rows.push(
      parseRow({
        invoice: options.invoice || '',
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

  tables.forEach((table, tableIndex) => {
    const rows = parseTable(table, {
      invoice: `INV-${tableIndex + 1}`,
    })
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
