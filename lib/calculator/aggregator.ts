import type { AggregationResult } from './types'
import type { PickingRow, Product, CatalogEntry } from '../engine/types'

/**
 * Aggregator - Group and organize products
 */
export class Aggregator {
  /**
   * Sort products by SKU (numerically if possible)
   */
  static sortBySKU(products: Product[]): Product[] {
    return [...products].sort((a, b) => {
      const aSku = parseInt(a.sku) || a.sku
      const bSku = parseInt(b.sku) || b.sku

      if (typeof aSku === 'number' && typeof bSku === 'number') {
        return aSku - bSku
      }

      return String(aSku).localeCompare(String(bSku))
    })
  }

  /**
   * Sort products by quantity (descending)
   */
  static sortByQuantity(products: Product[]): Product[] {
    return [...products].sort((a, b) => b.quantity - a.quantity)
  }

  /**
   * Sort products by confidence (descending)
   */
  static sortByConfidence(products: Product[]): Product[] {
    return [...products].sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Sort products by name (alphabetically)
   */
  static sortByName(products: Product[]): Product[] {
    return [...products].sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Create aggregation result
   */
  static createAggregationResult(
    key: string,
    label: string,
    items: Product[]
  ): AggregationResult<Product> {
    let totalQuantity = 0
    let totalCases = 0
    let totalUnits = 0

    for (const item of items) {
      totalQuantity += item.quantity
      totalCases += item.cases
      totalUnits += item.units
    }

    return {
      key,
      label,
      items,
      count: items.length,
      totalQuantity,
      totalCases,
      totalUnits
    }
  }

  /**
   * Aggregate products by category
   */
  static aggregateByCategory(
    products: Map<string, Product>,
    catalog: Map<string, CatalogEntry>
  ): AggregationResult<Product>[] {
    const categoryMap = new Map<string, Product[]>()

    for (const product of products.values()) {
      const entry = catalog.get(product.sku)
      const category = entry?.category || 'Uncategorized'

      if (!categoryMap.has(category)) {
        categoryMap.set(category, [])
      }
      categoryMap.get(category)!.push(product)
    }

    const results: AggregationResult<Product>[] = []
    for (const [category, items] of categoryMap) {
      results.push(this.createAggregationResult(category, category, this.sortBySKU(items)))
    }

    return results.sort((a, b) => a.label.localeCompare(b.label))
  }

  /**
   * Aggregate products by supplier
   */
  static aggregateBySupplier(
    products: Map<string, Product>,
    catalog: Map<string, CatalogEntry>
  ): AggregationResult<Product>[] {
    const supplierMap = new Map<string, Product[]>()

    for (const product of products.values()) {
      const entry = catalog.get(product.sku)
      const supplier = entry?.supplier || 'No Supplier'

      if (!supplierMap.has(supplier)) {
        supplierMap.set(supplier, [])
      }
      supplierMap.get(supplier)!.push(product)
    }

    const results: AggregationResult<Product>[] = []
    for (const [supplier, items] of supplierMap) {
      results.push(this.createAggregationResult(supplier, supplier, this.sortBySKU(items)))
    }

    return results.sort((a, b) => a.label.localeCompare(b.label))
  }

  /**
   * Aggregate products by status (by confidence level)
   */
  static aggregateByStatus(
    products: Map<string, Product>
  ): AggregationResult<Product>[] {
    const statusMap = new Map<string, Product[]>()

    for (const product of products.values()) {
      let status = 'Excellent'
      if (product.confidence <= 0.98) status = 'Good'
      if (product.confidence <= 0.90) status = 'Needs Review'

      if (!statusMap.has(status)) {
        statusMap.set(status, [])
      }
      statusMap.get(status)!.push(product)
    }

    const results: AggregationResult<Product>[] = []
    const statusOrder = ['Excellent', 'Good', 'Needs Review']

    for (const status of statusOrder) {
      const items = statusMap.get(status) || []
      if (items.length > 0) {
        results.push(this.createAggregationResult(status, status, this.sortByQuantity(items)))
      }
    }

    return results
  }

  /**
   * Flatten aggregation results back to products
   */
  static flattenAggregationResults(
    results: AggregationResult<Product>[]
  ): Product[] {
    return results.flatMap(r => r.items)
  }

  /**
   * Generate summary statistics for aggregation
   */
  static generateSummary(results: AggregationResult<Product>[]): {
    groups: number
    totalItems: number
    totalQuantity: number
    totalCases: number
    totalUnits: number
  } {
    return {
      groups: results.length,
      totalItems: results.reduce((sum, r) => sum + r.count, 0),
      totalQuantity: results.reduce((sum, r) => sum + r.totalQuantity, 0),
      totalCases: results.reduce((sum, r) => sum + r.totalCases, 0),
      totalUnits: results.reduce((sum, r) => sum + r.totalUnits, 0)
    }
  }

  /**
   * Format products for export (CSV, JSON, etc)
   */
  static formatForExport(
    products: Product[],
    format: 'json' | 'csv' = 'json'
  ): string {
    if (format === 'csv') {
      const headers = ['SKU', 'Barcode', 'Name', 'Quantity', 'Cases', 'Units', 'Confidence', 'Rows']
      const rows = products.map(p => [
        p.sku,
        p.barcode || 'N/A',
        p.name,
        p.quantity,
        p.cases,
        p.units,
        `${(p.confidence * 100).toFixed(1)}%`,
        p.rowCount
      ])

      const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n')
      return csv
    }

    // JSON format
    return JSON.stringify(
      products.map(p => ({
        sku: p.sku,
        barcode: p.barcode,
        name: p.name,
        quantity: p.quantity,
        cases: p.cases,
        units: p.units,
        confidence: `${(p.confidence * 100).toFixed(1)}%`,
        rowCount: p.rowCount
      })),
      null,
      2
    )
  }
}
