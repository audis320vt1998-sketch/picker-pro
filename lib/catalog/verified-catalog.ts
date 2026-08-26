import { normalizeCatalogProductName } from './product-name-normalization'

export type CatalogVerificationStatus = 'verified' | 'unverified'

export interface VerifiedCatalogProduct {
  productKey: string
  barcode: string | null
  sku: string | null
  verificationStatus: CatalogVerificationStatus
  name: string
  nameEn?: string
  aliases: readonly string[]
  allowUnitPicking: boolean
  caseOnly: boolean
  unitSize: number | null
  caseSize: number | null
  active: boolean
}

export interface ProductLookupInput {
  barcode?: string | null
  sku?: string | null
  productName?: string | null
}

export type ProductResolutionMethod = 'barcode' | 'sku' | 'canonical_name' | 'alias'

export type ProductResolution =
  | {
      status: 'resolved'
      product: VerifiedCatalogProduct
      resolvedBy: ProductResolutionMethod
    }
  | {
      status: 'unverified'
      product: VerifiedCatalogProduct
      matchedBy: ProductResolutionMethod
    }
  | {
      status: 'unresolved'
    }
  | {
      status: 'conflict'
      candidates: readonly VerifiedCatalogProduct[]
      matchedBy: readonly ProductResolutionMethod[]
    }

interface Match {
  product: VerifiedCatalogProduct
  method: ProductResolutionMethod
}

const RESOLUTION_PRIORITY: readonly ProductResolutionMethod[] = [
  'barcode',
  'sku',
  'canonical_name',
  'alias',
]

function normalizeIdentifier(value: string): string {
  return value.trim()
}

function activeProducts(products: readonly VerifiedCatalogProduct[]) {
  return products.filter((product) => product.active)
}

/**
 * Resolves only exact values recorded in the versioned product catalog. It does
 * not use fuzzy matching or manufacture identifiers. A match to an unverified
 * catalog entry remains unverified and must be reviewed before operational use.
 */
export class VerifiedProductCatalog {
  private readonly products: readonly VerifiedCatalogProduct[]

  constructor(products: readonly VerifiedCatalogProduct[]) {
    this.products = activeProducts(products)
  }

  resolve(input: ProductLookupInput): ProductResolution {
    const matches = this.findMatches(input)
    const uniqueProducts = new Map(
      matches.map((match) => [match.product.productKey, match.product])
    )

    if (uniqueProducts.size > 1) {
      return {
        status: 'conflict',
        candidates: [...uniqueProducts.values()],
        matchedBy: [...new Set(matches.map((match) => match.method))],
      }
    }

    const bestMatch = RESOLUTION_PRIORITY
      .map((method) => matches.find((match) => match.method === method))
      .find((match): match is Match => match !== undefined)

    if (!bestMatch) {
      return { status: 'unresolved' }
    }

    if (bestMatch.product.verificationStatus !== 'verified') {
      return {
        status: 'unverified',
        product: bestMatch.product,
        matchedBy: bestMatch.method,
      }
    }

    return {
      status: 'resolved',
      product: bestMatch.product,
      resolvedBy: bestMatch.method,
    }
  }

  private findMatches(input: ProductLookupInput): Match[] {
    const matches: Match[] = []
    const barcode = input.barcode ? normalizeIdentifier(input.barcode) : null
    const sku = input.sku ? normalizeIdentifier(input.sku) : null
    const productName = input.productName
      ? normalizeCatalogProductName(input.productName)
      : null

    for (const product of this.products) {
      const catalogBarcode = product.barcode
        ? normalizeIdentifier(product.barcode)
        : null
      const catalogSku = product.sku ? normalizeIdentifier(product.sku) : null

      if (barcode && catalogBarcode === barcode) {
        matches.push({ product, method: 'barcode' })
      }

      if (sku && catalogSku === sku) {
        matches.push({ product, method: 'sku' })
      }

      // A catalog barcode is authoritative. Name/alias matching is only safe
      // for catalog records whose barcode is still genuinely unknown.
      if (
        productName &&
        !catalogBarcode &&
        normalizeCatalogProductName(product.name) === productName
      ) {
        matches.push({ product, method: 'canonical_name' })
      }

      if (
        productName &&
        !catalogBarcode &&
        product.aliases.some(
          (alias) => normalizeCatalogProductName(alias) === productName
        )
      ) {
        matches.push({ product, method: 'alias' })
      }
    }

    return matches
  }
}
