import productCatalogDocument from '@/catalogs/products.json'
import {
  type CatalogVerificationStatus,
  type VerifiedCatalogProduct,
  VerifiedProductCatalog,
} from './verified-catalog'
import { hasConsistentPickingConfiguration } from './picking-policy'

export interface VerifiedCatalogReadiness {
  version: string
  totalProducts: number
  verifiedProducts: number
  unverifiedProducts: number
}

export interface LoadedVerifiedCatalog {
  catalog: VerifiedProductCatalog
  readiness: VerifiedCatalogReadiness
}

export class VerifiedCatalogConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VerifiedCatalogConfigurationError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNullableIdentifier(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && value.trim().length > 0)
}

function isNullablePositiveNumber(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === 'number' && Number.isFinite(value) && value > 0)
  )
}

function readString(
  value: Record<string, unknown>,
  field: string,
  location: string
): string {
  const candidate = value[field]
  if (typeof candidate !== 'string' || candidate.trim().length === 0) {
    throw new VerifiedCatalogConfigurationError(
      `${location}.${field} must be a non-empty string.`
    )
  }

  return candidate
}

function readProduct(value: unknown, index: number): VerifiedCatalogProduct {
  const location = `products[${index}]`
  if (!isRecord(value)) {
    throw new VerifiedCatalogConfigurationError(`${location} must be an object.`)
  }

  const verificationStatus = value.verificationStatus
  if (verificationStatus !== 'verified' && verificationStatus !== 'unverified') {
    throw new VerifiedCatalogConfigurationError(
      `${location}.verificationStatus must be verified or unverified.`
    )
  }

  if (!isNullableIdentifier(value.barcode) || !isNullableIdentifier(value.sku)) {
    throw new VerifiedCatalogConfigurationError(
      `${location}.barcode and ${location}.sku must be non-empty strings or null.`
    )
  }

  if (!Array.isArray(value.aliases) || !value.aliases.every((alias) => typeof alias === 'string')) {
    throw new VerifiedCatalogConfigurationError(
      `${location}.aliases must be an array of strings.`
    )
  }

  if (
    typeof value.allowUnitPicking !== 'boolean' ||
    typeof value.caseOnly !== 'boolean' ||
    typeof value.active !== 'boolean' ||
    !isNullablePositiveNumber(value.unitSize) ||
    !isNullablePositiveNumber(value.caseSize)
  ) {
    throw new VerifiedCatalogConfigurationError(
      `${location} contains an invalid picking or pack-size setting.`
    )
  }

  if (value.nameEn !== undefined && typeof value.nameEn !== 'string') {
    throw new VerifiedCatalogConfigurationError(
      `${location}.nameEn must be a string when provided.`
    )
  }

  const product = {
    productKey: readString(value, 'productKey', location),
    barcode: value.barcode === null ? null : value.barcode.trim(),
    sku: value.sku === null ? null : value.sku.trim(),
    verificationStatus: verificationStatus as CatalogVerificationStatus,
    name: readString(value, 'name', location),
    ...(value.nameEn !== undefined ? { nameEn: value.nameEn } : {}),
    aliases: value.aliases,
    allowUnitPicking: value.allowUnitPicking,
    caseOnly: value.caseOnly,
    unitSize: value.unitSize,
    caseSize: value.caseSize,
    active: value.active,
  }

  if (!hasConsistentPickingConfiguration(product)) {
    throw new VerifiedCatalogConfigurationError(
      `${location} cannot be both case-only and available for individual-unit picking.`
    )
  }

  return product
}

function assertUniqueIdentifiers(products: readonly VerifiedCatalogProduct[]): void {
  const productKeys = new Set<string>()
  const barcodes = new Set<string>()
  const skus = new Set<string>()

  for (const product of products) {
    if (productKeys.has(product.productKey)) {
      throw new VerifiedCatalogConfigurationError(
        `Duplicate productKey in catalog: ${product.productKey}.`
      )
    }
    productKeys.add(product.productKey)

    if (product.barcode) {
      if (barcodes.has(product.barcode)) {
        throw new VerifiedCatalogConfigurationError(
          `Duplicate barcode in catalog: ${product.barcode}.`
        )
      }
      barcodes.add(product.barcode)
    }

    if (product.sku) {
      if (skus.has(product.sku)) {
        throw new VerifiedCatalogConfigurationError(
          `Duplicate sku in catalog: ${product.sku}.`
        )
      }
      skus.add(product.sku)
    }
  }
}

/**
 * Validates the canonical, versioned product catalog before it can be used for
 * operational resolution. Unverified records are intentionally retained so
 * that matching rows can be sent to review instead of silently discarded.
 */
export function loadVerifiedCatalog(
  document: unknown = productCatalogDocument
): LoadedVerifiedCatalog {
  if (!isRecord(document) || !Array.isArray(document.products)) {
    throw new VerifiedCatalogConfigurationError(
      'The product catalog must contain a products array.'
    )
  }

  const version = readString(document, 'version', 'catalog')
  const products = document.products.map(readProduct)
  assertUniqueIdentifiers(products)

  const verifiedProducts = products.filter(
    (product) => product.verificationStatus === 'verified'
  ).length

  return {
    catalog: new VerifiedProductCatalog(products),
    readiness: {
      version,
      totalProducts: products.length,
      verifiedProducts,
      unverifiedProducts: products.length - verifiedProducts,
    },
  }
}
