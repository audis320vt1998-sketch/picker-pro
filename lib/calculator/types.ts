/**
 * Calculator Types
 */

export interface Totals {
  units: number
  cases: number
}

export interface ProductTotals {
  sku: string
  barcode?: string
  name: string
  cases: number
  units: number
  packSize: number
  warnings: string[]
}

export interface CalculatorInput {
  sku: string
  barcode?: string
  productName: string
  quantity: number
}

export interface CalculationResult {
  success: boolean
  totals: Totals
  warnings: string[]
}

export interface ProductCalculationResult {
  success: boolean
  products: ProductTotals[]
  warnings: string[]
}

export interface AggregationResult<T> {
  key: string
  label: string
  items: T[]
  count: number
  totalQuantity: number
  totalCases: number
  totalUnits: number
}

/** A product used within the calculator module. */
export interface Product {
  sku: string
  barcode?: string
  name: string
  packSize: number
  allowUnits: boolean
  category?: string
  supplier?: string
  price?: number
}
