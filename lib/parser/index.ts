/**
 * Data Parser
 * Parses OCR output into structured product rows
 */

import { getProduct } from '@/lib/catalog/catalog'

export interface ProductRow {
  invoice: string
  sku: string
  barcode: string
  name: string
  quantity: number
  units?: number
  cases?: number
}

export interface ParsedData {
  products: Array<{
    name: string
    price: number
    quantity: number
    [key: string]: any
  }>
  metadata: {
    source: string
    timestamp: Date
    confidence: number
  }
}

/**
 * Parse row and enrich with catalog data
 * @param row Raw parsed row
 * @returns Enriched ProductRow with catalog information
 */
export function parseRow(row: Partial<ProductRow>): ProductRow {
  const productRow: ProductRow = {
    invoice: row.invoice || '',
    sku: row.sku || '',
    barcode: row.barcode || '',
    name: row.name || '',
    quantity: row.quantity || 0,
    units: 0,
    cases: 0,
  }

  // Enrich row with catalog data
  const product = getProduct(productRow.sku)

  if (product) {
    productRow.name = product.name
    productRow.barcode = product.barcode

    if (product.allowUnits) {
      productRow.units = productRow.quantity
      productRow.cases = 0
    } else {
      productRow.cases = productRow.quantity
      productRow.units = 0
    }
  }

  return productRow
}

/**
 * Summarize product rows by SKU
 * @param rows Array of product rows
 * @returns Summary of products grouped by SKU
 */
export function summarize(
  rows: ProductRow[]
): Array<{
  sku: string
  name: string
  totalQuantity: number
  totalUnits: number
  totalCases: number
  invoiceCount: number
}> {
  const summary = new Map<
    string,
    {
      sku: string
      name: string
      totalQuantity: number
      totalUnits: number
      totalCases: number
      invoices: Set<string>
    }
  >()

  rows.forEach((row) => {
    const key = row.sku
    const existing = summary.get(key)

    if (existing) {
      existing.totalQuantity += row.quantity
      existing.totalUnits += row.units || 0
      existing.totalCases += row.cases || 0
      existing.invoices.add(row.invoice)
    } else {
      summary.set(key, {
        sku: row.sku,
        name: row.name,
        totalQuantity: row.quantity,
        totalUnits: row.units || 0,
        totalCases: row.cases || 0,
        invoices: new Set([row.invoice]),
      })
    }
  })

  return Array.from(summary.values()).map((item) => ({
    sku: item.sku,
    name: item.name,
    totalQuantity: item.totalQuantity,
    totalUnits: item.totalUnits,
    totalCases: item.totalCases,
    invoiceCount: item.invoices.size,
  }))
}

export function parseOCRText(_text: string): ParsedData {
  // TODO: Implement parsing logic
  console.log('Parsing OCR text')

  return {
    products: [],
    metadata: {
      source: 'ocr',
      timestamp: new Date(),
      confidence: 0,
    },
  }
}

export function validateData(data: ParsedData): boolean {
  // TODO: Implement validation logic
  return data.products.length > 0
}
