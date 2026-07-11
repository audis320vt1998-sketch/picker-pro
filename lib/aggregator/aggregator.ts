import type { Product, PickingResult, BatchStatistics } from '../engine/types'

/**
 * Aggregate and finalize results
 */
export class Aggregator {
  /**
   * Sort products by SKU
   */
  static sortProducts(products: Map<string, Product>): Product[] {
    return Array.from(products.values()).sort((a, b) => {
      const aSku = parseInt(a.sku) || a.sku
      const bSku = parseInt(b.sku) || b.sku

      if (typeof aSku === 'number' && typeof bSku === 'number') {
        return aSku - bSku
      }

      return String(aSku).localeCompare(String(bSku))
    })
  }

  /**
   * Generate batch ID if not provided
   */
  static generateBatchId(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const timestamp = now.getTime().toString(36).toUpperCase()

    return `${year}-${month}-${day}-${timestamp}`
  }

  /**
   * Create final PickingResult
   */
  static createResult(
    batchId: string,
    products: Map<string, Product>,
    rows: any[],
    warnings: any[],
    statistics: BatchStatistics
  ): PickingResult {
    return {
      batchId,
      timestamp: new Date(),
      products: this.sortProducts(products),
      warnings,
      statistics,
      rows
    }
  }

  /**
   * Format result for export
   */
  static formatForExport(result: PickingResult): object {
    return {
      batch: {
        id: result.batchId,
        timestamp: result.timestamp.toISOString(),
        statistics: {
          'OCR Accuracy': `${(result.statistics.ocrAccuracy * 100).toFixed(1)}%`,
          'Products': result.statistics.totalProducts,
          'Cases': result.statistics.totalCases,
          'Units': result.statistics.totalUnits,
          'Unknown SKUs': result.warnings.filter(w => w.type === 'unknown_sku').length,
          'OCR Warnings': result.warnings.filter(w => w.type === 'ocr_warning').length
        }
      },
      products: result.products.map(p => ({
        sku: p.sku,
        barcode: p.barcode || 'N/A',
        name: p.name,
        quantity: p.quantity,
        cases: p.cases,
        units: p.units,
        confidence: `${(p.confidence * 100).toFixed(1)}%`,
        rowCount: p.rowCount
      })),
      warnings: result.warnings.map(w => ({
        type: w.type,
        severity: w.severity,
        message: w.message
      }))
    }
  }
}
