import type { VerifiedCatalogReadiness } from '@/lib/catalog'
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
import type { ManualReviewResult } from './types'

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
    !isNonNegativeInteger(value.acceptedRowCount) ||
    !isPositiveInteger(value.totalRowCount) ||
    value.totalRowCount !== expectedTotalRowCount ||
    value.acceptedRowCount > value.totalRowCount
  ) {
    return null
  }

  const catalog = parseCatalog(value.catalog)
  if (!catalog) {
    return null
  }

  const totals: ProductTotals[] = []
  const productKeys = new Set<string>()
  for (const total of value.totals) {
    const parsed = parseTotal(total)
    if (!parsed || productKeys.has(parsed.product.productKey)) {
      return null
    }
    productKeys.add(parsed.product.productKey)
    totals.push(parsed)
  }

  if (
    totals.length > value.acceptedRowCount ||
    (value.acceptedRowCount === 0 && totals.length !== 0) ||
    (value.acceptedRowCount > 0 && totals.length === 0)
  ) {
    return null
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
  }
}
