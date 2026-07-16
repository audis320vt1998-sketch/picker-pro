import type { CatalogEntry } from '../engine/types'
import productsData from './products.json'

const defaultCatalogEntries = productsData as CatalogEntry[]
const defaultCatalogBySku = new Map(defaultCatalogEntries.map((entry) => [entry.sku, entry]))

/**
 * Catalog Service - In-memory catalog with persistence
 */
export class CatalogService {
  private catalog: Map<string, CatalogEntry> = new Map()
  private categories: Set<string> = new Set()
  private suppliers: Set<string> = new Set()

  /**
   * Initialize catalog from entries
   */
  constructor(entries: CatalogEntry[] = []) {
    for (const entry of entries) {
      this.addProductSync(entry)
    }
  }

  /**
   * Add product to catalog (sync)
   */
  private addProductSync(entry: CatalogEntry): void {
    this.catalog.set(entry.sku, entry)
    if (entry.category) this.categories.add(entry.category)
    if (entry.supplier) this.suppliers.add(entry.supplier)
  }

  /**
   * Add product to catalog (async)
   */
  async addProduct(entry: CatalogEntry): Promise<void> {
    if (!entry.sku) throw new Error('SKU is required')
    if (!entry.name) throw new Error('Name is required')
    if (entry.packSize <= 0) throw new Error('Pack size must be positive')

    this.addProductSync(entry)
  }

  /**
   * Update product
   */
  async updateProduct(sku: string, updates: Partial<CatalogEntry>): Promise<void> {
    const existing = this.catalog.get(sku)
    if (!existing) throw new Error(`Product not found: ${sku}`)

    const updated = { ...existing, ...updates, sku }
    this.catalog.set(sku, updated)

    if (updated.category) this.categories.add(updated.category)
    if (updated.supplier) this.suppliers.add(updated.supplier)
  }

  /**
   * Remove product
   */
  async removeProduct(sku: string): Promise<void> {
    if (!this.catalog.has(sku)) {
      throw new Error(`Product not found: ${sku}`)
    }
    this.catalog.delete(sku)
  }

  /**
   * Get product by SKU
   */
  async getProduct(sku: string): Promise<CatalogEntry | null> {
    return this.catalog.get(sku) || null
  }

  /**
   * Get all products
   */
  async getAllProducts(): Promise<CatalogEntry[]> {
    return Array.from(this.catalog.values()).sort((a, b) => a.sku.localeCompare(b.sku))
  }

  /**
   * Search by product name (case-insensitive)
   */
  async searchByName(query: string): Promise<CatalogEntry[]> {
    const lowerQuery = query.toLowerCase()
    return Array.from(this.catalog.values()).filter(p =>
      p.name.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * Search by category
   */
  async searchByCategory(category: string): Promise<CatalogEntry[]> {
    return Array.from(this.catalog.values()).filter(p => p.category === category)
  }

  /**
   * Search by supplier
   */
  async searchBySupplier(supplier: string): Promise<CatalogEntry[]> {
    return Array.from(this.catalog.values()).filter(p => p.supplier === supplier)
  }

  /**
   * Search by barcode
   */
  async searchByBarcode(barcode: string): Promise<CatalogEntry | null> {
    for (const entry of this.catalog.values()) {
      if (entry.barcode === barcode) return entry
    }
    return null
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<string[]> {
    return Array.from(this.categories).sort()
  }

  /**
   * Get all suppliers
   */
  async getSuppliers(): Promise<string[]> {
    return Array.from(this.suppliers).sort()
  }

  /**
   * Get catalog statistics
   */
  async getStatistics(): Promise<{
    totalProducts: number
    totalCategories: number
    totalSuppliers: number
    byCategory: Record<string, number>
    bySupplier: Record<string, number>
  }> {
    const byCategory: Record<string, number> = {}
    const bySupplier: Record<string, number> = {}

    for (const entry of this.catalog.values()) {
      if (entry.category) {
        byCategory[entry.category] = (byCategory[entry.category] || 0) + 1
      }
      if (entry.supplier) {
        bySupplier[entry.supplier] = (bySupplier[entry.supplier] || 0) + 1
      }
    }

    return {
      totalProducts: this.catalog.size,
      totalCategories: this.categories.size,
      totalSuppliers: this.suppliers.size,
      byCategory,
      bySupplier
    }
  }

  /**
   * Import catalog from entries
   */
  async importCatalog(entries: CatalogEntry[]): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = []
    let imported = 0

    for (const entry of entries) {
      try {
        await this.addProduct(entry)
        imported++
      } catch (error) {
        errors.push(`${entry.sku}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    return { imported, errors }
  }

  /**
   * Export catalog
   */
  async exportCatalog(): Promise<CatalogEntry[]> {
    return this.getAllProducts()
  }

  /**
   * Clear catalog
   */
  async clear(): Promise<void> {
    this.catalog.clear()
    this.categories.clear()
    this.suppliers.clear()
  }

  /**
   * Get catalog as Map (for PickingEngine)
   */
  getAsMap(): Map<string, CatalogEntry> {
    return new Map(this.catalog)
  }

  /**
   * Validate entry
   */
  static validateEntry(entry: CatalogEntry): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!entry.sku) errors.push('SKU is required')
    if (!entry.name) errors.push('Name is required')
    if (!entry.packSize || entry.packSize <= 0) errors.push('Pack size must be positive')
    if (entry.barcode && !/^\d+$/.test(entry.barcode)) errors.push('Barcode must be numeric')

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Bulk update from array
   */
  async bulkUpdate(entries: CatalogEntry[]): Promise<void> {
    for (const entry of entries) {
      if (this.catalog.has(entry.sku)) {
        await this.updateProduct(entry.sku, entry)
      } else {
        await this.addProduct(entry)
      }
    }
  }
}

/**
 * Global catalog instance
 */
let globalCatalog: CatalogService | null = null

/**
 * Get or create global catalog instance
 */
export function getCatalog(): CatalogService {
  if (!globalCatalog) {
    globalCatalog = new CatalogService()
  }
  return globalCatalog
}

/**
 * Set global catalog instance
 */
export function setCatalog(catalog: CatalogService): void {
  globalCatalog = catalog
}

export function getProduct(sku: string): CatalogEntry | undefined {
  const globalEntry = globalCatalog?.getAsMap().get(sku)
  if (globalEntry) {
    return globalEntry
  }

  return defaultCatalogBySku.get(sku)
}

export function hasProduct(sku: string): boolean {
  return getProduct(sku) !== undefined
}
