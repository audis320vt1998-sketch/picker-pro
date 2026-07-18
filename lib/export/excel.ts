/**
 * Picking Result Exporter
 *
 * Note: the xlsx package has known unpatched security vulnerabilities
 * (ReDoS, Prototype Pollution). This module exports to CSV/JSON instead,
 * which is sufficient for the current application requirements.
 */

import type { PickingResult, Product, Warning, CatalogEntry } from '../engine/types'
import { Aggregator } from '../calculator/aggregator'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeCell(value: string | number | boolean | undefined | null): string {
  const str = value === null || value === undefined ? '' : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function rowToCSV(row: (string | number | boolean | undefined | null)[]): string {
  return row.map(escapeCell).join(',')
}

function sheetToCSV(rows: (string | number | boolean | undefined | null)[][]): string {
  return rows.map(rowToCSV).join('\n')
}

// ---------------------------------------------------------------------------
// Exporter
// ---------------------------------------------------------------------------

export class ExcelExporter {
  constructor(_batchId: string) {
    // batchId stored for future instance-based API
  }

  /** Export the complete result as a multi-section CSV string. */
  static exportToCSV(
    result: PickingResult,
    catalog: Map<string, CatalogEntry>
  ): string {
    const sections: string[] = []

    sections.push(ExcelExporter.buildSummarySection(result))
    sections.push(ExcelExporter.buildProductsSection(result.products))
    sections.push(ExcelExporter.buildByCategorySection(result.products, catalog))
    sections.push(ExcelExporter.buildBySupplierSection(result.products, catalog))
    sections.push(ExcelExporter.buildWarningsSection(result.warnings))
    if (result.rows && result.rows.length > 0) {
      sections.push(ExcelExporter.buildRawDataSection(result.rows))
    }

    return sections.join('\n\n')
  }

  /** Export the result as JSON string. */
  static exportToJSON(result: PickingResult, catalog: Map<string, CatalogEntry>): string {
    const productsMap = new Map(result.products.map((p) => [p.sku, p]))
    return JSON.stringify(
      {
        batchId: result.batchId,
        timestamp: result.timestamp.toISOString(),
        statistics: result.statistics,
        byCategory: Aggregator.aggregateByCategory(productsMap, catalog),
        bySupplier: Aggregator.aggregateBySupplier(productsMap, catalog),
        products: result.products,
        warnings: result.warnings,
      },
      null,
      2
    )
  }

  // -------------------------------------------------------------------------
  // Section builders
  // -------------------------------------------------------------------------

  private static buildSummarySection(result: PickingResult): string {
    const rows: (string | number | boolean | null)[][] = [
      ['PICKING BATCH SUMMARY'],
      [],
      ['Batch ID:', result.batchId],
      ['Timestamp:', result.timestamp.toISOString()],
      [],
      ['OCR Metrics'],
      ['OCR Accuracy', `${(result.statistics.ocrAccuracy * 100).toFixed(1)}%`],
      [],
      ['Products & Quantities'],
      ['Unique Products', result.statistics.totalProducts],
      ['Total Cases', result.statistics.totalCases],
      ['Total Units', result.statistics.totalUnits],
      ['Total Quantity', result.statistics.totalQuantity],
      [],
      ['Warnings & Errors'],
      ['Total Warnings', result.warnings.length],
      ['Critical Issues', result.warnings.filter((w) => w.severity === 'error').length],
      ['Minor Issues', result.warnings.filter((w) => w.severity === 'warn').length],
    ]
    return sheetToCSV(rows)
  }

  private static buildProductsSection(products: Product[]): string {
    const headers = ['SKU', 'Barcode', 'Product Name', 'Quantity', 'Cases', 'Units', 'Confidence', 'Rows']
    const rows = products.map((p) => [
      p.sku,
      p.barcode ?? '',
      p.name,
      p.quantity,
      p.cases,
      p.units,
      `${(p.confidence * 100).toFixed(1)}%`,
      p.rowCount,
    ])
    return sheetToCSV([['PRODUCTS'], [], headers, ...rows])
  }

  private static buildByCategorySection(
    products: Product[],
    catalog: Map<string, CatalogEntry>
  ): string {
    const productsMap = new Map(products.map((p) => [p.sku, p]))
    const byCategory = Aggregator.aggregateByCategory(productsMap, catalog)

    const rows: (string | number)[][] = [['PRODUCTS BY CATEGORY'], []]

    for (const group of byCategory) {
      rows.push([group.label])
      rows.push(['SKU', 'Name', 'Quantity', 'Cases', 'Units', 'Confidence'])
      for (const product of group.items) {
        rows.push([
          product.sku,
          product.name,
          product.quantity,
          product.cases,
          product.units,
          `${(product.confidence * 100).toFixed(1)}%`,
        ])
      }
      rows.push(['TOTAL', '', group.totalQuantity, group.totalCases, group.totalUnits, ''])
      rows.push([])
    }

    return sheetToCSV(rows)
  }

  private static buildBySupplierSection(
    products: Product[],
    catalog: Map<string, CatalogEntry>
  ): string {
    const productsMap = new Map(products.map((p) => [p.sku, p]))
    const bySupplier = Aggregator.aggregateBySupplier(productsMap, catalog)

    const rows: (string | number)[][] = [['PRODUCTS BY SUPPLIER'], []]

    for (const group of bySupplier) {
      rows.push([group.label])
      rows.push(['SKU', 'Name', 'Quantity', 'Cases', 'Units', 'Confidence'])
      for (const product of group.items) {
        rows.push([
          product.sku,
          product.name,
          product.quantity,
          product.cases,
          product.units,
          `${(product.confidence * 100).toFixed(1)}%`,
        ])
      }
      rows.push(['TOTAL', '', group.totalQuantity, group.totalCases, group.totalUnits, ''])
      rows.push([])
    }

    return sheetToCSV(rows)
  }

  private static buildWarningsSection(warnings: Warning[]): string {
    const headers = ['Type', 'Severity', 'Message', 'Count']
    const grouped = new Map<string, { severity: string; message: string; count: number }>()

    for (const w of warnings) {
      const key = `${w.type}|${w.message}`
      const entry = grouped.get(key)
      if (entry) {
        entry.count += 1
      } else {
        grouped.set(key, { severity: w.severity, message: w.message, count: 1 })
      }
    }

    const rows = Array.from(grouped.entries()).map(([key, entry]) => [
      key.split('|')[0],
      entry.severity,
      entry.message,
      entry.count,
    ])

    return sheetToCSV([['WARNINGS'], [], headers, ...rows])
  }

  private static buildRawDataSection(rows: unknown[]): string {
    if (rows.length === 0) return sheetToCSV([['RAW DATA'], [], ['(no rows)']])

    const headers = Object.keys(rows[0] as Record<string, unknown>)
    const dataRows = rows.map((row) =>
      headers.map((h) => {
        const value = (row as Record<string, unknown>)[h]
        if (value === null || value === undefined) return ''
        if (typeof value === 'object') return JSON.stringify(value)
        return value as string | number | boolean
      })
    )

    return sheetToCSV([['RAW DATA'], [], headers, ...dataRows])
  }

  /** Generate a filename for the export. */
  static generateFilename(batchId: string, format: 'csv' | 'json' = 'csv'): string {
    return `Batch_${batchId.replace(/[^a-zA-Z0-9-]/g, '_')}.${format}`
  }
}
