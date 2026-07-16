import { CatalogService } from './catalog'
import type { CatalogEntry } from '../engine/types'
import productsData from './products.json'

/**
 * Catalog Loader - Load products from JSON file
 */
export class CatalogLoader {
  /**
   * Load catalog from JSON file
   */
  static async loadFromJSON(): Promise<CatalogService> {
    const catalog = new CatalogService()

    for (const entry of productsData as CatalogEntry[]) {
      try {
        await catalog.addProduct(entry)
      } catch (error) {
        console.warn(`Failed to load product ${entry.sku}:`, error)
      }
    }

    return catalog
  }

  /**
   * Load catalog from array
   */
  static async loadFromArray(entries: CatalogEntry[]): Promise<CatalogService> {
    const catalog = new CatalogService()

    const result = await catalog.importCatalog(entries)
    if (result.errors.length > 0) {
      console.warn(`Import errors: ${result.errors.join(', ')}`)
    }

    return catalog
  }

  /**
   * Load catalog from CSV string
   */
  static async loadFromCSV(csv: string): Promise<CatalogService> {
    const lines = csv.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim())
    const entries: CatalogEntry[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const entry: any = {}

      for (let j = 0; j < headers.length; j++) {
        const header = headers[j]
        let value: string | boolean | number = values[j] ?? ''

        // Parse types
        if (value === 'true') value = true
        else if (value === 'false') value = false
        else if (!isNaN(Number(value))) value = Number(value)

        entry[header] = value
      }

      entries.push(entry as CatalogEntry)
    }

    return this.loadFromArray(entries)
  }

  /**
   * Load default catalog
   */
  static async loadDefault(): Promise<CatalogService> {
    return this.loadFromJSON()
  }

  /**
   * Validate catalog file
   */
  static validateJSON(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!Array.isArray(data)) {
      errors.push('Catalog must be an array')
      return { valid: false, errors }
    }

    for (let i = 0; i < data.length; i++) {
      const entry = data[i]
      const validation = CatalogService.validateEntry(entry)
      if (!validation.valid) {
        validation.errors.forEach(error => {
          errors.push(`Row ${i}: ${error}`)
        })
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Export catalog to CSV
   */
  static exportToCSV(entries: CatalogEntry[]): string {
    const headers = ['sku', 'barcode', 'name', 'packSize', 'allowUnits', 'category', 'supplier', 'price']
    const csvHeaders = headers.join(',')

    const rows = entries.map(entry =>
      headers
        .map(header => {
          const value = (entry as any)[header]
          if (value === undefined || value === null) return ''
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`
          }
          return value
        })
        .join(',')
    )

    return [csvHeaders, ...rows].join('\n')
  }

  /**
   * Export catalog to JSON
   */
  static exportToJSON(entries: CatalogEntry[]): string {
    return JSON.stringify(entries, null, 2)
  }

  /**
   * Merge catalogs
   */
  static async mergeCatalogs(
    catalog1: CatalogService,
    catalog2: CatalogService
  ): Promise<CatalogService> {
    const merged = new CatalogService()
    const all1 = await catalog1.getAllProducts()
    const all2 = await catalog2.getAllProducts()

    // Add all from catalog1
    for (const entry of all1) {
      await merged.addProduct(entry)
    }

    // Add or update from catalog2
    for (const entry of all2) {
      if (!(await merged.getProduct(entry.sku))) {
        await merged.addProduct(entry)
      } else {
        await merged.updateProduct(entry.sku, entry)
      }
    }

    return merged
  }
}

/**
 * Global catalog loader instance
 */
let globalCatalog: CatalogService | null = null

/**
 * Initialize global catalog
 */
export async function initializeCatalog(): Promise<CatalogService> {
  if (!globalCatalog) {
    globalCatalog = await CatalogLoader.loadDefault()
  }
  return globalCatalog
}

/**
 * Get initialized catalog
 */
export function getInitializedCatalog(): CatalogService {
  if (!globalCatalog) {
    throw new Error('Catalog not initialized. Call initializeCatalog() first.')
  }
  return globalCatalog
}

/**
 * Reset catalog (for testing)
 */
export async function resetCatalog(): Promise<void> {
  if (globalCatalog) {
    await globalCatalog.clear()
  }
  globalCatalog = null
}
