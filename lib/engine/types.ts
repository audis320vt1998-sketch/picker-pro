/**
 * Engine Types
 * Core domain types shared across picking-engine modules.
 */

/** A product entry in the catalog. */
export interface CatalogEntry {
  sku: string
  barcode?: string
  name: string
  packSize: number
  allowUnits: boolean
  category?: string
  supplier?: string
  price?: number
}

/** A single picking row parsed from OCR output. */
export interface PickingRow {
  index?: number
  sku: string
  barcode?: string
  name: string
  quantity: number
  cases: number
  units: number
  rawText?: string
  confidence?: number
}

/** A resolved and aggregated product result. */
export interface Product {
  sku: string
  barcode?: string
  name: string
  quantity: number
  cases: number
  units: number
  confidence: number
  rowCount: number
  allowUnits?: boolean
  packSize?: number
  category?: string
  supplier?: string
}

/** A processing warning. */
export interface Warning {
  type: string
  severity: 'info' | 'warn' | 'error'
  message: string
  sku?: string
}

/** A validation error on a row or product. */
export interface ValidationError {
  code: string
  message: string
  sku?: string
  rowIndex?: number
}

/** A single parsed row before product resolution. */
export interface ParsedRow {
  sku: string
  barcode?: string
  name: string
  quantity: number
  rawText: string
  confidence: number
}

/** Batch-level statistics for a processing run. */
export interface BatchStatistics {
  ocrAccuracy: number
  totalProducts: number
  totalCases: number
  totalUnits: number
  totalQuantity: number
}

/** The final result produced by the picking engine for a batch. */
export interface PickingResult {
  batchId: string
  timestamp: Date
  statistics: BatchStatistics
  products: Product[]
  warnings: Warning[]
  /** Raw rows (optional, populated by aggregator). */
  rows?: PickingRow[]
}
