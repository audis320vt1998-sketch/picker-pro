/**
 * Product Catalog
 * Centralized product definitions with Map-based storage
 */

export interface ProductCatalogItem {
  sku: string
  barcode: string
  name: string
  brand: string
  packSize: number
  allowUnits: boolean
}

const catalog = new Map<string, ProductCatalogItem>()

// Initialize catalog with default products
const defaultProducts: ProductCatalogItem[] = [
  {
    sku: '88135',
    barcode: '7290018813505',
    name: 'לואקר אדום אגוז',
    brand: 'Loacker',
    packSize: 6,
    allowUnits: true,
  },
  {
    sku: '88136',
    barcode: '7290018813512',
    name: 'לואקר צהוב',
    brand: 'Loacker',
    packSize: 6,
    allowUnits: true,
  },
  {
    sku: '88137',
    barcode: '7290018813529',
    name: 'לואקר לבן',
    brand: 'Loacker',
    packSize: 6,
    allowUnits: true,
  },
  {
    sku: '88107',
    barcode: '7290018810758',
    name: 'פראנוי פטל פינק',
    brand: 'Pranoy',
    packSize: 12,
    allowUnits: false,
  },
  {
    sku: '88108',
    barcode: '7290018810765',
    name: 'פראנוי פטל חלב',
    brand: 'Pranoy',
    packSize: 12,
    allowUnits: false,
  },
  {
    sku: '88109',
    barcode: '7290018810772',
    name: 'פראנוי פטל מריר',
    brand: 'Pranoy',
    packSize: 12,
    allowUnits: false,
  },
]

// Initialize catalog with default products
defaultProducts.forEach((product) => {
  catalog.set(product.sku, product)
})

/**
 * Get product by SKU
 * @param sku Product SKU
 * @returns Product catalog item or undefined
 */
export function getProduct(sku: string): ProductCatalogItem | undefined {
  return catalog.get(sku)
}

/**
 * Add product to catalog
 * @param product Product catalog item
 */
export function addProduct(product: ProductCatalogItem): void {
  catalog.set(product.sku, product)
}

/**
 * Check if product exists in catalog
 * @param sku Product SKU
 * @returns True if product exists
 */
export function hasProduct(sku: string): boolean {
  return catalog.has(sku)
}

/**
 * Get all products from catalog
 * @returns Array of all products
 */
export function getAllProducts(): ProductCatalogItem[] {
  return [...catalog.values()]
}

/**
 * Remove product from catalog
 * @param sku Product SKU
 * @returns True if product was removed
 */
export function removeProduct(sku: string): boolean {
  return catalog.delete(sku)
}

/**
 * Search products by name (partial match)
 * @param searchTerm Search term
 * @returns Array of matching products
 */
export function searchByName(searchTerm: string): ProductCatalogItem[] {
  const term = searchTerm.toLowerCase()
  return [...catalog.values()].filter((product) =>
    product.name.toLowerCase().includes(term)
  )
}

/**
 * Get products by brand
 * @param brand Brand name
 * @returns Array of products from that brand
 */
export function getByBrand(brand: string): ProductCatalogItem[] {
  return [...catalog.values()].filter((product) => product.brand === brand)
}

/**
 * Get products by pack size
 * @param packSize Pack size to filter by
 * @returns Array of products with specified pack size
 */
export function getByPackSize(packSize: number): ProductCatalogItem[] {
  return [...catalog.values()].filter((product) => product.packSize === packSize)
}

/**
 * Get products that allow units
 * @returns Array of unit-allowed products
 */
export function getUnitProducts(): ProductCatalogItem[] {
  return [...catalog.values()].filter((product) => product.allowUnits)
}

/**
 * Get products that only allow cases
 * @returns Array of case-only products
 */
export function getCaseProducts(): ProductCatalogItem[] {
  return [...catalog.values()].filter((product) => !product.allowUnits)
}

/**
 * Get product by barcode
 * @param barcode Product barcode
 * @returns Product catalog item or undefined
 */
export function getByBarcode(barcode: string): ProductCatalogItem | undefined {
  return [...catalog.values()].find((product) => product.barcode === barcode)
}

/**
 * Get catalog size
 * @returns Number of products in catalog
 */
export function getCatalogSize(): number {
  return catalog.size
}

/**
 * Clear entire catalog
 */
export function clearCatalog(): void {
  catalog.clear()
}

/**
 * Reset catalog to default products
 */
export function resetToDefaults(): void {
  catalog.clear()
  defaultProducts.forEach((product) => {
    catalog.set(product.sku, product)
  })
}

/**
 * Get catalog statistics
 * @returns Statistics about the catalog
 */
export function getCatalogStats(): {
  total: number
  unitProducts: number
  caseProducts: number
  brands: string[]
  packSizes: number[]
} {
  const products = getAllProducts()
  const unitProducts = products.filter((p) => p.allowUnits).length
  const caseProducts = products.length - unitProducts
  const brands = [...new Set(products.map((p) => p.brand))]
  const packSizes = [...new Set(products.map((p) => p.packSize))].sort(
    (a, b) => a - b
  )

  return {
    total: products.length,
    unitProducts,
    caseProducts,
    brands,
    packSizes,
  }
}
