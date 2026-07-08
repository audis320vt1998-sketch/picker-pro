/**
 * Product Database
 * Centralized product definitions with SKU, names, and packaging information
 */

export interface ProductDefinition {
  name: string
  units: boolean
  pack: number
}

export const PRODUCTS: Record<string, ProductDefinition> = {
  '88135': {
    name: 'לואקר אדום אגוז',
    units: true,
    pack: 6,
  },
  '88136': {
    name: 'לואקר צהוב',
    units: true,
    pack: 6,
  },
  '88137': {
    name: 'לואקר לבן',
    units: true,
    pack: 6,
  },
  '88107': {
    name: 'פראנוי פטל פינק',
    units: false,
    pack: 12,
  },
  '88108': {
    name: 'פראנוי פטל חלב',
    units: false,
    pack: 12,
  },
  '88109': {
    name: 'פראנוי פטל מריר',
    units: false,
    pack: 12,
  },
}

/**
 * Get product definition by SKU
 * @param sku Product SKU
 * @returns Product definition or undefined
 */
export function getProduct(sku: string): ProductDefinition | undefined {
  return PRODUCTS[sku]
}

/**
 * Check if SKU exists in product database
 * @param sku Product SKU
 * @returns True if product exists
 */
export function hasProduct(sku: string): boolean {
  return sku in PRODUCTS
}

/**
 * Get all product SKUs
 * @returns Array of all product SKUs
 */
export function getAllSkus(): string[] {
  return Object.keys(PRODUCTS)
}

/**
 * Get all products
 * @returns Array of all products with their definitions
 */
export function getAllProducts(): Array<{ sku: string; product: ProductDefinition }> {
  return Object.entries(PRODUCTS).map(([sku, product]) => ({
    sku,
    product,
  }))
}

/**
 * Search products by name (partial match)
 * @param searchTerm Search term
 * @returns Array of matching products
 */
export function searchProductsByName(
  searchTerm: string
): Array<{ sku: string; product: ProductDefinition }> {
  const term = searchTerm.toLowerCase()
  return Object.entries(PRODUCTS)
    .filter(([_, product]) => product.name.toLowerCase().includes(term))
    .map(([sku, product]) => ({
      sku,
      product,
    }))
}

/**
 * Get products by pack size
 * @param packSize Pack size to filter by
 * @returns Array of products with specified pack size
 */
export function getProductsByPack(
  packSize: number
): Array<{ sku: string; product: ProductDefinition }> {
  return Object.entries(PRODUCTS)
    .filter(([_, product]) => product.pack === packSize)
    .map(([sku, product]) => ({
      sku,
      product,
    }))
}

/**
 * Get products by unit/case type
 * @param isUnits True for unit products, false for case products
 * @returns Array of products matching the type
 */
export function getProductsByType(
  isUnits: boolean
): Array<{ sku: string; product: ProductDefinition }> {
  return Object.entries(PRODUCTS)
    .filter(([_, product]) => product.units === isUnits)
    .map(([sku, product]) => ({
      sku,
      product,
    }))
}

/**
 * Calculate units from cases
 * @param sku Product SKU
 * @param caseCount Number of cases
 * @returns Number of units
 */
export function casesToUnits(sku: string, caseCount: number): number {
  const product = getProduct(sku)
  if (!product) return 0
  return caseCount * product.pack
}

/**
 * Calculate cases from units
 * @param sku Product SKU
 * @param unitCount Number of units
 * @returns Number of cases and remaining units
 */
export function unitsToCases(
  sku: string,
  unitCount: number
): { cases: number; remainingUnits: number } {
  const product = getProduct(sku)
  if (!product) return { cases: 0, remainingUnits: unitCount }

  const cases = Math.floor(unitCount / product.pack)
  const remainingUnits = unitCount % product.pack

  return { cases, remainingUnits }
}

/**
 * Validate product data
 * @param sku Product SKU
 * @returns Validation result
 */
export function validateProduct(sku: string): { valid: boolean; message: string } {
  if (!hasProduct(sku)) {
    return { valid: false, message: `Product with SKU ${sku} not found` }
  }

  const product = getProduct(sku)
  if (!product?.name) {
    return { valid: false, message: `Product ${sku} has no name` }
  }

  if (!product?.pack || product.pack <= 0) {
    return {
      valid: false,
      message: `Product ${sku} has invalid pack size`,
    }
  }

  return { valid: true, message: 'Product is valid' }
}

/**
 * Add new product to database (runtime only, not persisted)
 * @param sku Product SKU
 * @param product Product definition
 */
export function addProduct(sku: string, product: ProductDefinition): void {
  PRODUCTS[sku] = product
}

/**
 * Remove product from database (runtime only)
 * @param sku Product SKU
 */
export function removeProduct(sku: string): void {
  delete PRODUCTS[sku]
}

/**
 * Get product statistics
 * @returns Statistics about products
 */
export function getProductStats(): {
  totalProducts: number
  unitProducts: number
  caseProducts: number
  avgPackSize: number
} {
  const products = getAllProducts()
  const unitProducts = products.filter((p) => p.product.units).length
  const caseProducts = products.length - unitProducts
  const avgPackSize =
    products.reduce((sum, p) => sum + p.product.pack, 0) / products.length

  return {
    totalProducts: products.length,
    unitProducts,
    caseProducts,
    avgPackSize: Math.round(avgPackSize * 100) / 100,
  }
}
