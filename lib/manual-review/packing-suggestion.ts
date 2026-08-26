import { allowsIndividualUnitPicking } from '@/lib/catalog/picking-policy'
import type {
  ProductLookupInput,
  VerifiedCatalogProduct,
  VerifiedProductCatalog,
} from '@/lib/catalog/verified-catalog'
import type { MaayanRawQuantities } from '@/lib/document-intake'
import type { PickingRuleConfiguration } from './picking-rule-config'

export type PackingSuggestionRule =
  | 'CASE_ONLY_FRACTION'
  | 'INDIVIDUAL_PICKING_PARENTHESES'

export type PackingSuggestionReviewCode =
  | 'SOURCE_PRODUCT_NAME_MISSING'
  | 'SOURCE_MARKER_MISSING'
  | 'SOURCE_MARKER_AMBIGUOUS'
  | 'SOURCE_QUANTITIES_INCOMPLETE'
  | 'SOURCE_QUANTITIES_INCONSISTENT'
  | 'PRODUCT_UNRESOLVED'
  | 'PRODUCT_CONFLICT'
  | 'PRODUCT_UNVERIFIED'
  | 'CATALOG_PACK_SIZE_MISSING'
  | 'CATALOG_PACK_SIZE_CONFLICT'
  | 'CATALOG_PICKING_POLICY_CONFLICT'

export interface PackingSuggestionInput extends ProductLookupInput {
  sourceQuantities: MaayanRawQuantities
}

export interface AvailablePackingSuggestion {
  status: 'AVAILABLE'
  rule: PackingSuggestionRule
  rulesVersion: string
  packSize: number
  cases: number
  units: number
}

export interface ReviewRequiredPackingSuggestion {
  status: 'REVIEW_REQUIRED'
  code: PackingSuggestionReviewCode
  rulesVersion: string
}

export type PackingSuggestion =
  | AvailablePackingSuggestion
  | ReviewRequiredPackingSuggestion

interface SourceMarker {
  rule: PackingSuggestionRule
  packSize: number
}

interface DetectedSourceMarker extends SourceMarker {
  supported: boolean
}

interface CompleteSourceQuantities {
  caseQuantity: number
  unitsPerCase: number
  totalUnits: number
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
}

function review(
  code: PackingSuggestionReviewCode,
  configuration: PickingRuleConfiguration
): ReviewRequiredPackingSuggestion {
  return {
    status: 'REVIEW_REQUIRED',
    code,
    rulesVersion: configuration.version,
  }
}

function sourceMarkers(
  productName: string,
  configuration: PickingRuleConfiguration
): readonly DetectedSourceMarker[] {
  const markers: DetectedSourceMarker[] = []
  const fractionPattern = /(?:^|[^0-9])1\s*\/\s*([0-9]+)(?![0-9])/g
  for (const match of productName.matchAll(fractionPattern)) {
    const packSize = Number(match[1])
    markers.push({
      rule: 'CASE_ONLY_FRACTION',
      packSize,
      supported: configuration.caseOnlyFractions.includes(packSize),
    })
  }

  const parenthesisPattern = /\(\s*([0-9]+)\s*\)/g
  for (const match of productName.matchAll(parenthesisPattern)) {
    const packSize = Number(match[1])
    markers.push({
      rule: 'INDIVIDUAL_PICKING_PARENTHESES',
      packSize,
      supported:
        packSize >= configuration.individualPickingParentheses.minimum &&
        packSize <= configuration.individualPickingParentheses.maximum,
    })
  }

  return markers
}

function sourceQuantitiesAreComplete(
  quantities: MaayanRawQuantities
): quantities is CompleteSourceQuantities {
  return (
    isPositiveSafeInteger(quantities.caseQuantity) &&
    isPositiveSafeInteger(quantities.unitsPerCase) &&
    isPositiveSafeInteger(quantities.totalUnits)
  )
}

function productResolutionReviewCode(
  input: PackingSuggestionInput,
  catalog: VerifiedProductCatalog
): PackingSuggestionReviewCode | VerifiedCatalogProduct {
  const resolution = catalog.resolve(input)
  if (resolution.status === 'resolved') {
    return resolution.product
  }

  if (resolution.status === 'unverified') {
    return 'PRODUCT_UNVERIFIED'
  }

  return resolution.status === 'conflict' ? 'PRODUCT_CONFLICT' : 'PRODUCT_UNRESOLVED'
}

function isProduct(value: PackingSuggestionReviewCode | VerifiedCatalogProduct): value is VerifiedCatalogProduct {
  return typeof value !== 'string'
}

/**
 * Creates a non-persistent suggestion from three distinct OCR source columns.
 * It never splits collapsed OCR text, never updates a manual-review row, and
 * rejects a source marker that conflicts with the verified product catalog.
 */
export function getPackingSuggestion(
  input: PackingSuggestionInput,
  catalog: VerifiedProductCatalog,
  configuration: PickingRuleConfiguration
): PackingSuggestion {
  const productName = input.productName?.trim()
  if (!productName) {
    return review('SOURCE_PRODUCT_NAME_MISSING', configuration)
  }

  const markers = sourceMarkers(productName, configuration)
  if (markers.length > 1) {
    return review('SOURCE_MARKER_AMBIGUOUS', configuration)
  }

  if (markers.length === 0 || !markers[0].supported) {
    return review('SOURCE_MARKER_MISSING', configuration)
  }

  const quantities = input.sourceQuantities
  if (!sourceQuantitiesAreComplete(quantities)) {
    return review('SOURCE_QUANTITIES_INCOMPLETE', configuration)
  }

  const { caseQuantity, unitsPerCase, totalUnits } = quantities
  const expectedTotalUnits = caseQuantity * unitsPerCase
  if (!Number.isSafeInteger(expectedTotalUnits) || totalUnits !== expectedTotalUnits) {
    return review('SOURCE_QUANTITIES_INCONSISTENT', configuration)
  }

  const resolvedProduct = productResolutionReviewCode(input, catalog)
  if (!isProduct(resolvedProduct)) {
    return review(resolvedProduct, configuration)
  }

  const packSize = resolvedProduct.caseSize
  if (!isPositiveSafeInteger(packSize)) {
    return review('CATALOG_PACK_SIZE_MISSING', configuration)
  }

  const marker = markers[0]
  if (marker.packSize !== packSize) {
    return review('CATALOG_PACK_SIZE_CONFLICT', configuration)
  }

  if (marker.rule === 'CASE_ONLY_FRACTION') {
    if (
      !resolvedProduct.caseOnly ||
      allowsIndividualUnitPicking(resolvedProduct) ||
      unitsPerCase !== packSize
    ) {
      return review('CATALOG_PICKING_POLICY_CONFLICT', configuration)
    }

    return {
      status: 'AVAILABLE',
      rule: marker.rule,
      rulesVersion: configuration.version,
      packSize,
      cases: caseQuantity,
      units: 0,
    }
  }

  if (
    resolvedProduct.caseOnly ||
    !allowsIndividualUnitPicking(resolvedProduct) ||
    unitsPerCase !== 1
  ) {
    return review('CATALOG_PICKING_POLICY_CONFLICT', configuration)
  }

  return {
    status: 'AVAILABLE',
    rule: marker.rule,
    rulesVersion: configuration.version,
    packSize,
    cases: Math.floor(caseQuantity / packSize),
    units: caseQuantity % packSize,
  }
}
