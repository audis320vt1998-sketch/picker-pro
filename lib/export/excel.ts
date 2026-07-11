import * as XLSX from 'xlsx'
import type { PickingResult, Product, Warning, CatalogEntry } from '../engine/types'
import type { AggregationResult } from '../calculator/types'
import { Aggregator } from '../calculator/aggregator'

/**
 * Professional Excel Exporter
 * Generates multi-sheet Excel workbooks with formatting and styling
 */
export class ExcelExporter {
  private workbook: XLSX.WorkBook
  private batchId: string

  constructor(batchId: string) {
    this.workbook = XLSX.utils.book_new()
    this.batchId = batchId
  }

  /**
   * Export complete result to Excel workbook
   */
  static exportToExcel(
    result: PickingResult,
    catalog: Map<string, CatalogEntry>
  ): XLSX.WorkBook {
    const exporter = new ExcelExporter(result.batchId)

    // Add sheets in order
    exporter.addSummarySheet(result)
    exporter.addProductsSheet(result.products)
    exporter.addByProductSheet(result.products, catalog)
    exporter.addByCategorySheet(result.products, catalog)
    exporter.addBySupplierSheet(result.products, catalog)
    exporter.addByStatusSheet(result.products)
    exporter.addWarningsSheet(result.warnings)
    exporter.addRawDataSheet(result.rows)

    return exporter.workbook
  }

  /**
   * Add Summary sheet
   */
  private addSummarySheet(result: PickingResult): void {
    const data = [
      ['PICKING BATCH SUMMARY'],
      [],
      ['Batch ID:', result.batchId],
      ['Timestamp:', result.timestamp.toISOString()],
      [],
      ['OCR Metrics'],
      ['OCR Accuracy', `${(result.statistics.ocrAccuracy * 100).toFixed(1)}%`],
      ['Average Confidence', `${(result.statistics.averageConfidence * 100).toFixed(1)}%`],
      [],
      ['Batch Statistics'],
      ['Total Rows', result.statistics.totalRows],
      ['Successful Rows', result.statistics.successfulRows],
      ['Rows with Warnings', result.statistics.rowsWithWarnings],
      [],
      ['Products & Quantities'],
      ['Unique Products', result.statistics.totalProducts],
      ['Total Cases', result.statistics.totalCases],
      ['Total Units', result.statistics.totalUnits],
      ['Total Quantity', result.statistics.totalQuantity],
      [],
      ['Warnings & Errors'],
      ['Total Warnings', result.warnings.length],
      ['Critical Issues', result.warnings.filter(w => w.severity === 'error').length],
      ['Minor Issues', result.warnings.filter(w => w.severity === 'warning').length]
    ]

    const sheet = XLSX.utils.aoa_to_sheet(data)
    this.applySheetFormatting(sheet)
    XLSX.utils.book_append_sheet(this.workbook, sheet, 'Summary')
  }

  /**
   * Add Products sheet (main data)
   */
  private addProductsSheet(products: Product[]): void {
    const headers = [
      'SKU',
      'Barcode',
      'Product Name',
      'Quantity',
      'Cases',
      'Units',
      'Confidence',
      'Rows Aggregated',
      'Warnings'
    ]

    const data = [
      headers,
      ...products.map(p => [
        p.sku,
        p.barcode || '',
        p.name,
        p.quantity,
        p.cases,
        p.units,
        `${(p.confidence * 100).toFixed(1)}%`,
        p.rowCount,
        p.warnings.length > 0 ? p.warnings.join('; ') : ''
      ])
    ]

    const sheet = XLSX.utils.aoa_to_sheet(data)
    this.applyTableFormatting(sheet, headers.length, data.length)
    XLSX.utils.book_append_sheet(this.workbook, sheet, 'Products')
  }

  /**
   * Add detailed product breakdown
   */
  private addByProductSheet(products: Product[], catalog: Map<string, CatalogEntry>): void {
    const data = [
      ['PRODUCTS BY SKU']
    ]

    const sortedProducts = Aggregator.sortBySKU(products)

    for (const product of sortedProducts) {
      const entry = catalog.get(product.sku)
      data.push([])
      data.push([product.sku, product.name])
      data.push(['Barcode:', product.barcode || 'N/A'])
      data.push(['Category:', entry?.category || 'N/A'])
      data.push(['Supplier:', entry?.supplier || 'N/A'])
      data.push(['Quantity:', product.quantity])
      data.push(['Cases:', product.cases, 'Units:', product.units])
      data.push(['Pack Size:', entry?.packSize || 'N/A'])
      data.push(['Confidence:', `${(product.confidence * 100).toFixed(1)}%`])
      data.push(['Rows:', product.rowCount])
    }

    const sheet = XLSX.utils.aoa_to_sheet(data)
    this.applySheetFormatting(sheet)
    XLSX.utils.book_append_sheet(this.workbook, sheet, 'By Product')
  }

  /**
   * Add by Category sheet
   */
  private addByCategorySheet(products: Product[], catalog: Map<string, CatalogEntry>): void {
    const productsMap = new Map(products.map(p => [p.sku, p]))
    const byCategory = Aggregator.aggregateByCategory(productsMap, catalog)

    const data = [['PRODUCTS BY CATEGORY'], []]

    for (const group of byCategory) {
      data.push([group.label])
      data.push(['SKU', 'Name', 'Quantity', 'Cases', 'Units', 'Confidence'])

      for (const product of group.items) {
        data.push([
          product.sku,
          product.name,
          product.quantity,
          product.cases,
          product.units,
          `${(product.confidence * 100).toFixed(1)}%`
        ])
      }

      data.push(['TOTAL', '', group.totalQuantity, group.totalCases, group.totalUnits, ''])
      data.push([])
    }

    const sheet = XLSX.utils.aoa_to_sheet(data)
    this.applySheetFormatting(sheet)
    XLSX.utils.book_append_sheet(this.workbook, sheet, 'By Category')
  }

  /**
   * Add by Supplier sheet
   */
  private addBySupplierSheet(products: Product[], catalog: Map<string, CatalogEntry>): void {
    const productsMap = new Map(products.map(p => [p.sku, p]))
    const bySupplier = Aggregator.aggregateBySupplier(productsMap, catalog)

    const data = [['PRODUCTS BY SUPPLIER'], []]

    for (const group of bySupplier) {
      data.push([group.label])
      data.push(['SKU', 'Name', 'Quantity', 'Cases', 'Units', 'Confidence'])

      for (const product of group.items) {
        data.push([
          product.sku,
          product.name,
          product.quantity,
          product.cases,
          product.units,
          `${(product.confidence * 100).toFixed(1)}%`
        ])
      }

      data.push(['TOTAL', '', group.totalQuantity, group.totalCases, group.totalUnits, ''])
      data.push([])
    }

    const sheet = XLSX.utils.aoa_to_sheet(data)
    this.applySheetFormatting(sheet)
    XLSX.utils.book_append_sheet(this.workbook, sheet, 'By Supplier')
  }

  /**
   * Add by Status sheet
   */
  private addByStatusSheet(products: Product[]): void {
    const productsMap = new Map(products.map(p => [p.sku, p]))
    const byStatus = Aggregator.aggregateByStatus(productsMap)

    const data = [['PRODUCTS BY CONFIDENCE STATUS'], []]

    for (const group of byStatus) {
      data.push([group.label])
      data.push(['SKU', 'Name', 'Quantity', 'Confidence', 'Rows'])

      for (const product of group.items) {
        data.push([
          product.sku,
          product.name,
          product.quantity,
          `${(product.confidence * 100).toFixed(1)}%`,
          product.rowCount
        ])
      }

      data.push(['TOTAL', '', group.totalQuantity, '', group.count])
      data.push([])
    }

    const sheet = XLSX.utils.aoa_to_sheet(data)
    this.applySheetFormatting(sheet)
    XLSX.utils.book_append_sheet(this.workbook, sheet, 'By Status')
  }

  /**
   * Add Warnings sheet
   */
  private addWarningsSheet(warnings: Warning[]): void {
    const headers = ['Type', 'Severity', 'Message', 'Count']

    // Group warnings by type
    const groupedWarnings = new Map<string, { severity: string; message: string; count: number }>()

    for (const warning of warnings) {
      const key = `${warning.type}|${warning.message}`
      if (groupedWarnings.has(key)) {
        const entry = groupedWarnings.get(key)!
        entry.count += 1
      } else {
        groupedWarnings.set(key, {
          severity: warning.severity,
          message: warning.message,
          count: 1
        })
      }
    }

    const data = [
      headers,
      ...Array.from(groupedWarnings.entries()).map(([key, entry]) => {
        const type = key.split('|')[0]
        return [type, entry.severity, entry.message, entry.count]
      })
    ]

    const sheet = XLSX.utils.aoa_to_sheet(data)
    if (data.length > 1) {
      this.applyTableFormatting(sheet, headers.length, data.length)
    }
    XLSX.utils.book_append_sheet(this.workbook, sheet, 'Warnings')
  }

  /**
   * Add raw data sheet
   */
  private addRawDataSheet(rows: any[]): void {
    if (rows.length === 0) {
      XLSX.utils.book_append_sheet(this.workbook, XLSX.utils.aoa_to_sheet([]), 'Raw Data')
      return
    }

    const headers = Object.keys(rows[0])
    const data = [
      headers,
      ...rows.map(row =>
        headers.map(h => {
          const value = (row as any)[h]
          if (value === null || value === undefined) return ''
          if (typeof value === 'object') return JSON.stringify(value)
          return value
        })
      )
    ]

    const sheet = XLSX.utils.aoa_to_sheet(data)
    this.applyTableFormatting(sheet, headers.length, data.length)
    XLSX.utils.book_append_sheet(this.workbook, sheet, 'Raw Data')
  }

  /**
   * Apply table formatting (header + data)
   */
  private applyTableFormatting(sheet: XLSX.WorkSheet, columns: number, rows: number): void {
    // Set column widths
    sheet['!cols'] = Array(columns).fill({ wch: 15 })
    sheet['!cols']![2] = { wch: 30 } // Product name column wider

    // Format header row
    for (let i = 0; i < columns; i++) {
      const cell = XLSX.utils.encode_cell({ r: 0, c: i })
      if (sheet[cell]) {
        sheet[cell].fill = { type: 'pattern', patternType: 'solid', fgColor: { rgb: '366092' } }
        sheet[cell].font = { bold: true, color: { rgb: 'FFFFFF' } }
      }
    }

    // Format data rows with alternating colors
    for (let r = 1; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        const cell = XLSX.utils.encode_cell({ r, c })
        if (sheet[cell]) {
          if (r % 2 === 0) {
            sheet[cell].fill = { type: 'pattern', patternType: 'solid', fgColor: { rgb: 'F0F0F0' } }
          }
          sheet[cell].alignment = { horizontal: 'left', vertical: 'center' }
        }
      }
    }
  }

  /**
   * Apply general sheet formatting
   */
  private applySheetFormatting(sheet: XLSX.WorkSheet): void {
    sheet['!cols'] = [{ wch: 30 }, { wch: 40 }]
  }

  /**
   * Export to Buffer
   */
  static exportToBuffer(workbook: XLSX.WorkBook): Buffer {
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  }

  /**
   * Export to file
   */
  static async exportToFile(workbook: XLSX.WorkBook, filename: string): Promise<void> {
    XLSX.writeFile(workbook, filename)
  }

  /**
   * Generate filename
   */
  static generateFilename(batchId: string): string {
    return `Batch_${batchId.replace(/[^a-zA-Z0-9-]/g, '_')}.xlsx`
  }
}
