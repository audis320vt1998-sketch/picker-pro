import type { VerifiedCatalogReadiness } from '@/lib/catalog'
import { canonicalMaayanHeaderRouteCode } from '@/lib/document-intake/maayan-header-route'
import type {
  ProductIdentity,
  ProductResolvedBy,
  ProductTotals,
  ValidationIssue,
  ValidationSeverity,
  ValidationStage,
} from '@/lib/domain/types'
import type { SourceReference } from '@/lib/traceability/types'
import {
  isManualReviewIssueCode,
  type ManualReviewIssueCode,
} from './failure'
import type { ManualReviewResult, ManualReviewRouteSummary } from './types'

const CLIENT_RESULT_SOURCE_ID = 'manual-review'
const REVIEW_ID_PATTERN =
  /^manual-review-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const PRODUCT_RESOLUTION_METHODS: readonly ProductResolvedBy[] = [
  'barcode',
  'sku',
  'name',
  'alias',
]

const ISSUE_EXPECTATIONS: Record<
  ManualReviewIssueCode,
  { severity: ValidationSeverity; stage: ValidationStage }
> = {
  TRACEABILITY_MISSING: { severity: 'fail', stage: 'row' },
  INVALID_QUANTITY: { severity: 'fail', stage: 'row' },
  PRODUCT_UNRESOLVED: { severity: 'fail', stage: 'row' },
  PRODUCT_CONFLICT: { severity: 'fail', stage: 'row' },
  PRODUCT_UNVERIFIED: { severity: 'fail', stage: 'row' },
  UNIT_TYPE_ENFORCEMENT: { severity: 'fail', stage: 'row' },
  UNITS_AT_OR_ABOVE_CASE_SIZE: { severity: 'warn', stage: 'row' },
  ZERO_TOTAL: { severity: 'warn', stage: 'aggregate' },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function readBoundedString(value: unknown, maximumLength: number): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 && normalized.length <= maximumLength
    ? normalized
    : null
}

function readOptionalBoundedString(
  value: unknown,
  maximumLength: number
): string | undefined | null {
  if (value === undefined || value === null) {
    return undefined
  }

  return readBoundedString(value, maximumLength)
}

function parseCatalog(value: unknown): VerifiedCatalogReadiness | null {
  if (!isRecord(value)) {
    return null
  }

  const version = readBoundedString(value.version, 64)
  const totalProducts = value.totalProducts
  const verifiedProducts = value.verifiedProducts
  const unverifiedProducts = value.unverifiedProducts

  if (
    !version ||
    !isNonNegativeInteger(totalProducts) ||
    !isNonNegativeInteger(verifiedProducts) ||
    !isNonNegativeInteger(unverifiedProducts) ||
    verifiedProducts + unverifiedProducts !== totalProducts
  ) {
    return null
  }

  return {
    version,
    totalProducts,
    verifiedProducts,
    unverifiedProducts,
  }
}

/**
 * The API source identifier is deliberately discarded. The result screen only
 * needs page/row positions, and this synthetic token keeps the internal
 * SourceReference type valid without retaining a server-provided identifier.
 */
function parseSourceReference(value: unknown): SourceReference | null {
  if (!isRecord(value) || !isRecord(value.page) || !isRecord(value.row)) {
    return null
  }

  const documentOrdinal = value.page.documentOrdinal
  if (
    !isPositiveInteger(value.page.pageNumber) ||
    !isPositiveInteger(value.row.rowNumber) ||
    (documentOrdinal !== undefined && !isPositiveInteger(documentOrdinal))
  ) {
    return null
  }

  return {
    page: {
      jobId: CLIENT_RESULT_SOURCE_ID,
      ...(documentOrdinal ? { documentOrdinal } : {}),
      pageNumber: value.page.pageNumber,
    },
    row: {
      rowNumber: value.row.rowNumber,
    },
  }
}

function parseSources(value: unknown): SourceReference[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null
  }

  const sources: SourceReference[] = []
  for (const source of value) {
    const parsed = parseSourceReference(source)
    if (!parsed) {
      return null
    }
    sources.push(parsed)
  }

  return sources
}

function parseProductIdentity(value: unknown): ProductIdentity | null {
  if (!isRecord(value)) {
    return null
  }

  const productKey = readBoundedString(value.productKey, 160)
  const name = readBoundedString(value.name, 500)
  const barcode = readOptionalBoundedString(value.barcode, 64)
  const sku = readOptionalBoundedString(value.sku, 128)
  const resolvedBy = value.resolvedBy

  if (
    !productKey ||
    !name ||
    barcode === null ||
    sku === null ||
    !PRODUCT_RESOLUTION_METHODS.includes(resolvedBy as ProductResolvedBy)
  ) {
    return null
  }

  return {
    productKey,
    ...(barcode ? { barcode } : {}),
    ...(sku ? { sku } : {}),
    name,
    resolvedBy: resolvedBy as ProductResolvedBy,
  }
}

function parseCalculatedValue(
  value: unknown
): ProductTotals['cases'] | null {
  if (!isRecord(value) || !isNonNegativeFiniteNumber(value.value)) {
    return null
  }

  const sources = parseSources(value.sources)
  return sources ? { value: value.value, sources } : null
}

function parseTotal(value: unknown): ProductTotals | null {
  if (!isRecord(value)) {
    return null
  }

  const product = parseProductIdentity(value.product)
  const cases = parseCalculatedValue(value.cases)
  const units = parseCalculatedValue(value.units)

  return product && cases && units ? { product, cases, units } : null
}

function parseUniqueTotals(value: unknown): ProductTotals[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const totals: ProductTotals[] = []
  const productKeys = new Set<string>()
  for (const total of value) {
    const parsed = parseTotal(total)
    if (!parsed || productKeys.has(parsed.product.productKey)) {
      return null
    }
    productKeys.add(parsed.product.productKey)
    totals.push(parsed)
  }

  return totals
}

function sourceReferenceKey(source: SourceReference): string {
  return [
    source.page.documentOrdinal ?? '',
    source.page.pageNumber,
    source.row.rowNumber,
  ].join('\u0000')
}

/**
 * Source locations can repeat for direct manual rows that happen to share the
 * same page/row position, so set membership is not sufficient here. A route
 * summary may consume each global source occurrence at most once.
 */
function sourceMultisetIsSubset(
  candidateSources: readonly SourceReference[],
  globalSources: readonly SourceReference[]
): boolean {
  const remainingBySource = new Map<string, number>()
  for (const source of globalSources) {
    const key = sourceReferenceKey(source)
    remainingBySource.set(key, (remainingBySource.get(key) ?? 0) + 1)
  }

  for (const source of candidateSources) {
    const key = sourceReferenceKey(source)
    const remaining = remainingBySource.get(key) ?? 0
    if (remaining === 0) {
      return false
    }
    if (remaining === 1) {
      remainingBySource.delete(key)
    } else {
      remainingBySource.set(key, remaining - 1)
    }
  }

  return true
}

function everySourceHasDocumentOrdinal(total: ProductTotals): boolean {
  return [...total.cases.sources, ...total.units.sources].every(
    (source) => source.page.documentOrdinal !== undefined
  )
}

function sourceCountsMatchAcceptedRows(
  totals: readonly ProductTotals[],
  acceptedRowCount: number
): boolean {
  const caseSourceCount = totals.reduce(
    (count, total) => count + total.cases.sources.length,
    0
  )
  const unitSourceCount = totals.reduce(
    (count, total) => count + total.units.sources.length,
    0
  )

  return (
    caseSourceCount === acceptedRowCount &&
    unitSourceCount === acceptedRowCount
  )
}

function isAtMostWithRoundingTolerance(value: number, maximum: number): boolean {
  if (value <= maximum) {
    return true
  }

  const scale = Math.max(1, Math.abs(value), Math.abs(maximum))
  return value - maximum <= Number.EPSILON * scale * 16
}

interface RoutedProductClaims {
  cases: number
  units: number
  caseSources: SourceReference[]
  unitSources: SourceReference[]
}

function addRouteProductClaim(
  claimsByProductKey: Map<string, RoutedProductClaims>,
  total: ProductTotals
): void {
  const existing = claimsByProductKey.get(total.product.productKey)
  if (existing) {
    existing.cases += total.cases.value
    existing.units += total.units.value
    existing.caseSources.push(...total.cases.sources)
    existing.unitSources.push(...total.units.sources)
    return
  }

  claimsByProductKey.set(total.product.productKey, {
    cases: total.cases.value,
    units: total.units.value,
    caseSources: [...total.cases.sources],
    unitSources: [...total.units.sources],
  })
}

function parseRouteSummary(value: unknown): ManualReviewRouteSummary | null {
  if (!isRecord(value)) {
    return null
  }

  const routeCode = canonicalMaayanHeaderRouteCode(value.routeCode)
  const acceptedRowCount = value.acceptedRowCount
  const totalRowCount = value.totalRowCount
  const totals = parseUniqueTotals(value.totals)

  if (
    !routeCode ||
    routeCode !== value.routeCode ||
    !isNonNegativeInteger(acceptedRowCount) ||
    !isNonNegativeInteger(totalRowCount) ||
    acceptedRowCount > totalRowCount ||
    !totals ||
    totals.length > acceptedRowCount ||
    (acceptedRowCount === 0 && totals.length !== 0) ||
    (acceptedRowCount > 0 && totals.length === 0)
  ) {
    return null
  }

  return { routeCode, totals, acceptedRowCount, totalRowCount }
}

function parseIssue(value: unknown): ValidationIssue | null {
  if (!isRecord(value) || !isManualReviewIssueCode(value.code)) {
    return null
  }

  const expectation = ISSUE_EXPECTATIONS[value.code]
  if (value.severity !== expectation.severity || value.stage !== expectation.stage) {
    return null
  }

  const source =
    value.source === undefined || value.source === null
      ? undefined
      : parseSourceReference(value.source)

  if ((value.stage === 'row' && !source) || (value.source != null && !source)) {
    return null
  }

  return {
    code: value.code,
    // The UI gets a fixed Hebrew message based on the known code. Do not retain
    // an API-provided issue message, product key, or arbitrary fields.
    message: '',
    severity: expectation.severity,
    stage: expectation.stage,
    ...(source ? { source } : {}),
  }
}

/**
 * Validates and whitelists a successful manual-review response before it is
 * placed in React state. The browser retains only values it can safely render:
 * catalog readiness, resolved product totals, fixed issue metadata, and
 * source page/row positions.
 */
export function manualReviewResultFromResponse(
  value: unknown,
  expectedTotalRowCount: number
): ManualReviewResult | null {
  if (
    !isRecord(value) ||
    !isPositiveInteger(expectedTotalRowCount) ||
    typeof value.reviewId !== 'string' ||
    !REVIEW_ID_PATTERN.test(value.reviewId) ||
    !Array.isArray(value.totals) ||
    !Array.isArray(value.issues) ||
    !Array.isArray(value.routeSummaries) ||
    !isNonNegativeInteger(value.acceptedRowCount) ||
    !isPositiveInteger(value.totalRowCount) ||
    !isNonNegativeInteger(value.unassignedRouteAcceptedRowCount) ||
    !isNonNegativeInteger(value.unassignedRouteRowCount) ||
    value.totalRowCount !== expectedTotalRowCount ||
    value.acceptedRowCount > value.totalRowCount
  ) {
    return null
  }

  const catalog = parseCatalog(value.catalog)
  if (!catalog) {
    return null
  }

  const totals = parseUniqueTotals(value.totals)
  if (!totals) {
    return null
  }

  if (
    totals.length > value.acceptedRowCount ||
    (value.acceptedRowCount === 0 && totals.length !== 0) ||
    (value.acceptedRowCount > 0 && totals.length === 0)
  ) {
    return null
  }

  if (!sourceCountsMatchAcceptedRows(totals, value.acceptedRowCount)) {
    return null
  }

  const globalTotalsByProductKey = new Map(
    totals.map((total) => [total.product.productKey, total])
  )

  const routeSummaries: ManualReviewRouteSummary[] = []
  const routedClaimsByProductKey = new Map<string, RoutedProductClaims>()
  let previousRouteNumber = 0
  let routedRowCount = 0
  let routedAcceptedRowCount = 0
  for (const routeSummary of value.routeSummaries) {
    const parsed = parseRouteSummary(routeSummary)
    if (!parsed || Number(parsed.routeCode) <= previousRouteNumber) {
      return null
    }

    if (!sourceCountsMatchAcceptedRows(parsed.totals, parsed.acceptedRowCount)) {
      return null
    }

    const normalizedTotals: ProductTotals[] = []
    for (const total of parsed.totals) {
      const globalTotal = globalTotalsByProductKey.get(total.product.productKey)
      if (
        !globalTotal ||
        !everySourceHasDocumentOrdinal(total)
      ) {
        return null
      }

      // Keep the already-whitelisted global catalog identity. A product can
      // legitimately be resolved by barcode in one row and SKU in another,
      // so the route's resolution method is not a stable comparison key.
      // Reusing the global identity prevents a route-only label or identifier
      // from reaching the UI.
      normalizedTotals.push({
        product: globalTotal.product,
        cases: total.cases,
        units: total.units,
      })
      addRouteProductClaim(routedClaimsByProductKey, total)
    }

    previousRouteNumber = Number(parsed.routeCode)
    routedRowCount += parsed.totalRowCount
    routedAcceptedRowCount += parsed.acceptedRowCount
    routeSummaries.push({ ...parsed, totals: normalizedTotals })
  }

  if (
    routedRowCount + value.unassignedRouteRowCount !== value.totalRowCount ||
    routedAcceptedRowCount + value.unassignedRouteAcceptedRowCount !==
      value.acceptedRowCount ||
    value.unassignedRouteAcceptedRowCount > value.unassignedRouteRowCount
  ) {
    return null
  }

  for (const [productKey, claims] of routedClaimsByProductKey) {
    const globalTotal = globalTotalsByProductKey.get(productKey)
    if (
      !globalTotal ||
      !isAtMostWithRoundingTolerance(claims.cases, globalTotal.cases.value) ||
      !isAtMostWithRoundingTolerance(claims.units, globalTotal.units.value) ||
      !sourceMultisetIsSubset(claims.caseSources, globalTotal.cases.sources) ||
      !sourceMultisetIsSubset(claims.unitSources, globalTotal.units.sources)
    ) {
      return null
    }
  }

  const issues: ValidationIssue[] = []
  for (const issue of value.issues) {
    const parsed = parseIssue(issue)
    if (!parsed) {
      return null
    }
    issues.push(parsed)
  }

  return {
    // The review ID is not displayed or needed for client behavior. Retain a
    // fixed safe token rather than the opaque server-provided value.
    reviewId: CLIENT_RESULT_SOURCE_ID,
    catalog,
    totals,
    issues,
    acceptedRowCount: value.acceptedRowCount,
    totalRowCount: value.totalRowCount,
    routeSummaries,
    unassignedRouteAcceptedRowCount: value.unassignedRouteAcceptedRowCount,
    unassignedRouteRowCount: value.unassignedRouteRowCount,
  }
}
