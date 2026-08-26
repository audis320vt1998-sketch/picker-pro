import type { ProductTotals } from '@/lib/domain/types'
import { sourceReferencePresentations } from '@/lib/traceability/source-presentation'
import type { ManualReviewResult, ManualReviewRouteSummary } from './types'

/**
 * Browser-local, explicit saves of an already verified review result. This is
 * intentionally separate from the short-lived OCR handoff: it never retains
 * raw OCR text, images, file names, opaque document IDs, review IDs, or
 * customer/header data.
 */
export const SAVED_REVIEW_JOB_STORAGE_KEY = 'picker-pro.saved-review-jobs.v1'
export const SAVED_REVIEW_JOB_TTL_MS = 24 * 60 * 60 * 1000
export const MAX_SAVED_REVIEW_JOBS = 10
export const MAX_SAVED_REVIEW_STORE_BYTES = 512 * 1024

const SAVED_REVIEW_JOB_KIND = 'SAVED_REVIEW_JOB_V1'
const SAVED_REVIEW_JOB_STORE_KIND = 'SAVED_REVIEW_JOB_STORE_V1'
const MAX_SAVED_TOTALS = 500
const MAX_SAVED_SOURCES_PER_VALUE = 500
const MAX_PRODUCT_NAME_LENGTH = 500
const MAX_IDENTIFIER_LENGTH = 128
const MAX_CATALOG_VERSION_LENGTH = 64
const SAVED_REVIEW_JOB_ID_PATTERN = /^review-[a-z0-9-]{8,96}$/

export interface LocalStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface SavedReviewSourceReference {
  documentOrdinal?: number
  pageNumber: number
  rowNumber: number
}

export interface SavedReviewCatalog {
  version: string
  totalProducts: number
  verifiedProducts: number
  unverifiedProducts: number
}

export interface SavedReviewProductTotal {
  sku?: string
  barcode?: string
  productName: string
  cases: number
  units: number
  caseSources: readonly SavedReviewSourceReference[]
  unitSources: readonly SavedReviewSourceReference[]
}

export interface SavedReviewRouteSummary {
  routeCode: string
  totals: readonly SavedReviewProductTotal[]
  acceptedRowCount: number
  totalRowCount: number
}

export interface SavedReviewJobV1 {
  kind: typeof SAVED_REVIEW_JOB_KIND
  id: string
  savedAtMs: number
  catalog: SavedReviewCatalog
  totals: readonly SavedReviewProductTotal[]
  acceptedRowCount: number
  totalRowCount: number
  warningCount: number
  routeSummaries: readonly SavedReviewRouteSummary[]
  unassignedRouteAcceptedRowCount: number
  unassignedRouteRowCount: number
}

interface SavedReviewJobStoreV1 {
  kind: typeof SAVED_REVIEW_JOB_STORE_KIND
  jobs: readonly SavedReviewJobV1[]
}

export type SavedReviewJobSaveResult =
  | { status: 'SAVED'; job: SavedReviewJobV1 }
  | { status: 'INVALID_JOB' }
  | { status: 'LIMIT_REACHED' }
  | { status: 'TOO_LARGE' }
  | { status: 'STORAGE_UNAVAILABLE' }

/**
 * A read result keeps an unavailable browser store distinct from an empty
 * store. The UI must not tell a user that no result exists when the browser
 * simply denied access to local storage.
 */
export type SavedReviewJobLoadResult =
  | { status: 'LOADED'; jobs: SavedReviewJobV1[] }
  | { status: 'STORAGE_UNAVAILABLE' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isPositiveInteger(value: unknown): value is number {
  return isNonNegativeInteger(value) && value > 0
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function boundedText(value: unknown, maximumLength: number): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const cleaned = value.trim()
  return cleaned.length > 0 && cleaned.length <= maximumLength ? cleaned : null
}

function optionalBoundedText(
  value: unknown,
  maximumLength: number
): string | undefined | null {
  if (value === undefined) {
    return undefined
  }

  return boundedText(value, maximumLength)
}

function savedCatalogFromResult(
  value: ManualReviewResult['catalog']
): SavedReviewCatalog | null {
  const version = boundedText(value.version, MAX_CATALOG_VERSION_LENGTH)
  if (
    !version ||
    !isNonNegativeInteger(value.totalProducts) ||
    !isNonNegativeInteger(value.verifiedProducts) ||
    !isNonNegativeInteger(value.unverifiedProducts) ||
    value.verifiedProducts + value.unverifiedProducts !== value.totalProducts
  ) {
    return null
  }

  return {
    version,
    totalProducts: value.totalProducts,
    verifiedProducts: value.verifiedProducts,
    unverifiedProducts: value.unverifiedProducts,
  }
}

function parseSavedCatalog(value: unknown): SavedReviewCatalog | null {
  if (!isRecord(value)) {
    return null
  }

  const version = boundedText(value.version, MAX_CATALOG_VERSION_LENGTH)
  if (
    !version ||
    !isNonNegativeInteger(value.totalProducts) ||
    !isNonNegativeInteger(value.verifiedProducts) ||
    !isNonNegativeInteger(value.unverifiedProducts) ||
    value.verifiedProducts + value.unverifiedProducts !== value.totalProducts
  ) {
    return null
  }

  return {
    version,
    totalProducts: value.totalProducts,
    verifiedProducts: value.verifiedProducts,
    unverifiedProducts: value.unverifiedProducts,
  }
}

function canonicalRouteCode(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{1,2}$/.test(value)) {
    return null
  }

  const numericValue = Number(value)
  return Number.isInteger(numericValue) && numericValue >= 1 && numericValue <= 99
    ? String(numericValue)
    : null
}

function isSavedReviewJobId(value: unknown): value is string {
  return typeof value === 'string' && SAVED_REVIEW_JOB_ID_PATTERN.test(value)
}

function sourceReferencesFromTotals(
  sources: ProductTotals['cases']['sources'],
  requireDocumentOrdinal = false
): SavedReviewSourceReference[] | null {
  if (sources.length === 0 || sources.length > MAX_SAVED_SOURCES_PER_VALUE) {
    return null
  }

  const presentations = sourceReferencePresentations(sources)
  if (presentations.length !== sources.length) {
    return null
  }

  const savedSources: SavedReviewSourceReference[] = []
  for (const source of presentations) {
    if (requireDocumentOrdinal && !source.documentOrdinal) {
      return null
    }

    savedSources.push({
      ...(source.documentOrdinal ? { documentOrdinal: source.documentOrdinal } : {}),
      pageNumber: source.pageNumber,
      rowNumber: source.rowNumber,
    })
  }

  return savedSources
}

function parseSavedSourceReferences(
  value: unknown,
  requireDocumentOrdinal = false
): SavedReviewSourceReference[] | null {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > MAX_SAVED_SOURCES_PER_VALUE
  ) {
    return null
  }

  const sources: SavedReviewSourceReference[] = []
  for (const source of value) {
    if (!isRecord(source) || !isPositiveInteger(source.pageNumber) || !isPositiveInteger(source.rowNumber)) {
      return null
    }

    const documentOrdinal = source.documentOrdinal
    if (
      (requireDocumentOrdinal && !isPositiveInteger(documentOrdinal)) ||
      (documentOrdinal !== undefined && !isPositiveInteger(documentOrdinal))
    ) {
      return null
    }

    sources.push({
      ...(documentOrdinal ? { documentOrdinal } : {}),
      pageNumber: source.pageNumber,
      rowNumber: source.rowNumber,
    })
  }

  return sources
}

function savedProductTotalFromTotal(
  total: ProductTotals,
  requireDocumentOrdinal = false
): SavedReviewProductTotal | null {
  const productName = boundedText(total.product.name, MAX_PRODUCT_NAME_LENGTH)
  const sku = optionalBoundedText(total.product.sku, MAX_IDENTIFIER_LENGTH)
  const barcode = optionalBoundedText(total.product.barcode, MAX_IDENTIFIER_LENGTH)
  const caseSources = sourceReferencesFromTotals(
    total.cases.sources,
    requireDocumentOrdinal
  )
  const unitSources = sourceReferencesFromTotals(
    total.units.sources,
    requireDocumentOrdinal
  )

  if (
    !productName ||
    sku === null ||
    barcode === null ||
    !isNonNegativeFiniteNumber(total.cases.value) ||
    !isNonNegativeFiniteNumber(total.units.value) ||
    !caseSources ||
    !unitSources
  ) {
    return null
  }

  return {
    ...(sku ? { sku } : {}),
    ...(barcode ? { barcode } : {}),
    productName,
    cases: total.cases.value,
    units: total.units.value,
    caseSources,
    unitSources,
  }
}

function parseSavedProductTotal(
  value: unknown,
  requireDocumentOrdinal = false
): SavedReviewProductTotal | null {
  if (!isRecord(value)) {
    return null
  }

  const productName = boundedText(value.productName, MAX_PRODUCT_NAME_LENGTH)
  const sku = optionalBoundedText(value.sku, MAX_IDENTIFIER_LENGTH)
  const barcode = optionalBoundedText(value.barcode, MAX_IDENTIFIER_LENGTH)
  const caseSources = parseSavedSourceReferences(
    value.caseSources,
    requireDocumentOrdinal
  )
  const unitSources = parseSavedSourceReferences(
    value.unitSources,
    requireDocumentOrdinal
  )

  if (
    !productName ||
    sku === null ||
    barcode === null ||
    !isNonNegativeFiniteNumber(value.cases) ||
    !isNonNegativeFiniteNumber(value.units) ||
    !caseSources ||
    !unitSources
  ) {
    return null
  }

  return {
    ...(sku ? { sku } : {}),
    ...(barcode ? { barcode } : {}),
    productName,
    cases: value.cases,
    units: value.units,
    caseSources,
    unitSources,
  }
}

function savedTotalsFromTotals(
  totals: readonly ProductTotals[],
  requireDocumentOrdinal = false
): SavedReviewProductTotal[] | null {
  if (totals.length > MAX_SAVED_TOTALS) {
    return null
  }

  const savedTotals: SavedReviewProductTotal[] = []
  for (const total of totals) {
    const savedTotal = savedProductTotalFromTotal(
      total,
      requireDocumentOrdinal
    )
    if (!savedTotal) {
      return null
    }
    savedTotals.push(savedTotal)
  }

  return savedTotals
}

function savedProductIdentityKey(total: SavedReviewProductTotal): string {
  return JSON.stringify([
    total.sku ?? null,
    total.barcode ?? null,
    total.productName,
  ])
}

function parseSavedTotals(
  value: unknown,
  requireDocumentOrdinal = false
): SavedReviewProductTotal[] | null {
  if (!Array.isArray(value) || value.length > MAX_SAVED_TOTALS) {
    return null
  }

  const totals: SavedReviewProductTotal[] = []
  const productIdentities = new Set<string>()
  for (const total of value) {
    const parsed = parseSavedProductTotal(total, requireDocumentOrdinal)
    const productIdentity = parsed && savedProductIdentityKey(parsed)
    if (!parsed || !productIdentity || productIdentities.has(productIdentity)) {
      return null
    }
    productIdentities.add(productIdentity)
    totals.push(parsed)
  }

  return totals
}

function sourceCountsMatchAcceptedRows(
  totals: readonly SavedReviewProductTotal[],
  acceptedRowCount: number
): boolean {
  const caseSourceCount = totals.reduce(
    (count, total) => count + total.caseSources.length,
    0
  )
  const unitSourceCount = totals.reduce(
    (count, total) => count + total.unitSources.length,
    0
  )

  return (
    caseSourceCount === acceptedRowCount &&
    unitSourceCount === acceptedRowCount
  )
}

function savedSourceReferenceKey(source: SavedReviewSourceReference): string {
  return [
    source.documentOrdinal ?? '',
    source.pageNumber,
    source.rowNumber,
  ].join('\u0000')
}

/**
 * A source position can appear more than once in explicit manual input, so
 * route validation needs multiset membership rather than set membership.
 */
function savedSourceMultisetIsSubset(
  candidateSources: readonly SavedReviewSourceReference[],
  globalSources: readonly SavedReviewSourceReference[]
): boolean {
  const remainingBySource = new Map<string, number>()
  for (const source of globalSources) {
    const key = savedSourceReferenceKey(source)
    remainingBySource.set(key, (remainingBySource.get(key) ?? 0) + 1)
  }

  for (const source of candidateSources) {
    const key = savedSourceReferenceKey(source)
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

function isAtMostWithRoundingTolerance(value: number, maximum: number): boolean {
  if (value <= maximum) {
    return true
  }

  const scale = Math.max(1, Math.abs(value), Math.abs(maximum))
  return value - maximum <= Number.EPSILON * scale * 16
}

interface RoutedSavedProductClaims {
  cases: number
  units: number
  caseSources: SavedReviewSourceReference[]
  unitSources: SavedReviewSourceReference[]
}

function addSavedRouteProductClaim(
  claimsByProductIdentity: Map<string, RoutedSavedProductClaims>,
  total: SavedReviewProductTotal
): void {
  const productIdentity = savedProductIdentityKey(total)
  const existing = claimsByProductIdentity.get(productIdentity)
  if (existing) {
    existing.cases += total.cases
    existing.units += total.units
    existing.caseSources.push(...total.caseSources)
    existing.unitSources.push(...total.unitSources)
    return
  }

  claimsByProductIdentity.set(productIdentity, {
    cases: total.cases,
    units: total.units,
    caseSources: [...total.caseSources],
    unitSources: [...total.unitSources],
  })
}

/**
 * Local storage is editable by the browser user, so route review data must be
 * bound to the already-whitelisted global totals before it is rendered. A
 * route may only claim a product, quantities, and source occurrences that are
 * present in the global result; source occurrences cannot be reused by another
 * route.
 */
function routeSummariesMatchGlobalTotals(
  totals: readonly SavedReviewProductTotal[],
  routeSummaries: readonly SavedReviewRouteSummary[]
): boolean {
  const globalTotalsByProductIdentity = new Map<string, SavedReviewProductTotal>()
  for (const total of totals) {
    const productIdentity = savedProductIdentityKey(total)
    if (globalTotalsByProductIdentity.has(productIdentity)) {
      return false
    }
    globalTotalsByProductIdentity.set(productIdentity, total)
  }

  const routedClaimsByProductIdentity = new Map<
    string,
    RoutedSavedProductClaims
  >()
  for (const routeSummary of routeSummaries) {
    for (const total of routeSummary.totals) {
      if (!globalTotalsByProductIdentity.has(savedProductIdentityKey(total))) {
        return false
      }
      addSavedRouteProductClaim(routedClaimsByProductIdentity, total)
    }
  }

  for (const [productIdentity, claims] of routedClaimsByProductIdentity) {
    const globalTotal = globalTotalsByProductIdentity.get(productIdentity)
    if (
      !globalTotal ||
      !isAtMostWithRoundingTolerance(claims.cases, globalTotal.cases) ||
      !isAtMostWithRoundingTolerance(claims.units, globalTotal.units) ||
      !savedSourceMultisetIsSubset(claims.caseSources, globalTotal.caseSources) ||
      !savedSourceMultisetIsSubset(claims.unitSources, globalTotal.unitSources)
    ) {
      return false
    }
  }

  return true
}

function savedRouteSummaryFromRoute(
  route: ManualReviewRouteSummary
): SavedReviewRouteSummary | null {
  const routeCode = canonicalRouteCode(route.routeCode)
  const totals = savedTotalsFromTotals(route.totals, true)

  if (
    !routeCode ||
    !totals ||
    !isNonNegativeInteger(route.acceptedRowCount) ||
    !isNonNegativeInteger(route.totalRowCount) ||
    route.acceptedRowCount > route.totalRowCount ||
    (route.acceptedRowCount === 0 && totals.length !== 0) ||
    (route.acceptedRowCount > 0 && totals.length === 0) ||
    !sourceCountsMatchAcceptedRows(totals, route.acceptedRowCount)
  ) {
    return null
  }

  return {
    routeCode,
    totals,
    acceptedRowCount: route.acceptedRowCount,
    totalRowCount: route.totalRowCount,
  }
}

function parseSavedRouteSummary(value: unknown): SavedReviewRouteSummary | null {
  if (!isRecord(value)) {
    return null
  }

  const routeCode = canonicalRouteCode(value.routeCode)
  const totals = parseSavedTotals(value.totals, true)

  if (
    !routeCode ||
    !totals ||
    !isNonNegativeInteger(value.acceptedRowCount) ||
    !isNonNegativeInteger(value.totalRowCount) ||
    value.acceptedRowCount > value.totalRowCount ||
    (value.acceptedRowCount === 0 && totals.length !== 0) ||
    (value.acceptedRowCount > 0 && totals.length === 0) ||
    !sourceCountsMatchAcceptedRows(totals, value.acceptedRowCount)
  ) {
    return null
  }

  return {
    routeCode,
    totals,
    acceptedRowCount: value.acceptedRowCount,
    totalRowCount: value.totalRowCount,
  }
}

function parseSavedReviewJob(value: unknown): SavedReviewJobV1 | null {
  if (!isRecord(value) || value.kind !== SAVED_REVIEW_JOB_KIND) {
    return null
  }

  const catalog = parseSavedCatalog(value.catalog)
  const totals = parseSavedTotals(value.totals)

  if (
    !isSavedReviewJobId(value.id) ||
    !isNonNegativeInteger(value.savedAtMs) ||
    !catalog ||
    !totals ||
    !isPositiveInteger(value.acceptedRowCount) ||
    !isPositiveInteger(value.totalRowCount) ||
    value.acceptedRowCount > value.totalRowCount ||
    !isNonNegativeInteger(value.warningCount) ||
    totals.length === 0 ||
    totals.length > value.acceptedRowCount ||
    !sourceCountsMatchAcceptedRows(totals, value.acceptedRowCount) ||
    !Array.isArray(value.routeSummaries) ||
    value.routeSummaries.length > 99 ||
    !isNonNegativeInteger(value.unassignedRouteAcceptedRowCount) ||
    !isNonNegativeInteger(value.unassignedRouteRowCount) ||
    value.unassignedRouteAcceptedRowCount > value.unassignedRouteRowCount
  ) {
    return null
  }

  const routeSummaries: SavedReviewRouteSummary[] = []
  const routeCodes = new Set<string>()
  for (const summary of value.routeSummaries) {
    const parsed = parseSavedRouteSummary(summary)
    if (!parsed || routeCodes.has(parsed.routeCode)) {
      return null
    }
    routeCodes.add(parsed.routeCode)
    routeSummaries.push(parsed)
  }

  const routedAcceptedRowCount = routeSummaries.reduce(
    (count, summary) => count + summary.acceptedRowCount,
    0
  )
  const routedRowCount = routeSummaries.reduce(
    (count, summary) => count + summary.totalRowCount,
    0
  )

  if (
    routedAcceptedRowCount + value.unassignedRouteAcceptedRowCount !==
      value.acceptedRowCount ||
    routedRowCount + value.unassignedRouteRowCount !== value.totalRowCount
  ) {
    return null
  }

  if (!routeSummariesMatchGlobalTotals(totals, routeSummaries)) {
    return null
  }

  return {
    kind: SAVED_REVIEW_JOB_KIND,
    id: value.id,
    savedAtMs: value.savedAtMs,
    catalog,
    totals,
    acceptedRowCount: value.acceptedRowCount,
    totalRowCount: value.totalRowCount,
    warningCount: value.warningCount,
    routeSummaries,
    unassignedRouteAcceptedRowCount: value.unassignedRouteAcceptedRowCount,
    unassignedRouteRowCount: value.unassignedRouteRowCount,
  }
}

function parseSavedReviewJobStore(value: unknown): SavedReviewJobStoreV1 | null {
  if (
    !isRecord(value) ||
    value.kind !== SAVED_REVIEW_JOB_STORE_KIND ||
    !Array.isArray(value.jobs) ||
    value.jobs.length > MAX_SAVED_REVIEW_JOBS
  ) {
    return null
  }

  const jobs: SavedReviewJobV1[] = []
  const ids = new Set<string>()
  for (const job of value.jobs) {
    const parsed = parseSavedReviewJob(job)
    if (!parsed || ids.has(parsed.id)) {
      continue
    }
    ids.add(parsed.id)
    jobs.push(parsed)
  }

  return { kind: SAVED_REVIEW_JOB_STORE_KIND, jobs }
}

function isLiveSavedReviewJob(job: SavedReviewJobV1, nowMs: number): boolean {
  return job.savedAtMs <= nowMs && nowMs - job.savedAtMs <= SAVED_REVIEW_JOB_TTL_MS
}

function exceedsSavedReviewStoreLimit(serialized: string): boolean {
  return new TextEncoder().encode(serialized).byteLength > MAX_SAVED_REVIEW_STORE_BYTES
}

type SavedReviewJobStorageWriteStatus = 'SAVED' | 'TOO_LARGE' | 'STORAGE_UNAVAILABLE'

function writeSavedReviewJobs(
  storage: LocalStorageLike,
  jobs: readonly SavedReviewJobV1[]
): SavedReviewJobStorageWriteStatus {
  try {
    if (jobs.length === 0) {
      storage.removeItem(SAVED_REVIEW_JOB_STORAGE_KEY)
      return 'SAVED'
    }

    const serialized = JSON.stringify({ kind: SAVED_REVIEW_JOB_STORE_KIND, jobs })
    if (exceedsSavedReviewStoreLimit(serialized)) {
      return 'TOO_LARGE'
    }

    storage.setItem(SAVED_REVIEW_JOB_STORAGE_KEY, serialized)
    return 'SAVED'
  } catch {
    return 'STORAGE_UNAVAILABLE'
  }
}

function discardSavedReviewJobs(storage: LocalStorageLike): void {
  try {
    storage.removeItem(SAVED_REVIEW_JOB_STORAGE_KEY)
  } catch {
    // Browser storage can be disabled. The normal review workflow still works.
  }
}

/**
 * Converts the response-whitelisted manual review result into the narrow,
 * browser-safe saved representation. The API review ID and any source text
 * are deliberately not copied.
 */
export function createSavedReviewJob(
  result: ManualReviewResult,
  id: string,
  savedAtMs = Date.now()
): SavedReviewJobV1 | null {
  const catalog = savedCatalogFromResult(result.catalog)
  const totals = savedTotalsFromTotals(result.totals)

  if (
    !isSavedReviewJobId(id) ||
    !isNonNegativeInteger(savedAtMs) ||
    !catalog ||
    !totals ||
    !isPositiveInteger(result.acceptedRowCount) ||
    !isPositiveInteger(result.totalRowCount) ||
    result.acceptedRowCount > result.totalRowCount ||
    !isNonNegativeInteger(result.issues.filter((issue) => issue.severity === 'warn').length) ||
    totals.length === 0 ||
    totals.length > result.acceptedRowCount ||
    !sourceCountsMatchAcceptedRows(totals, result.acceptedRowCount) ||
    !isNonNegativeInteger(result.unassignedRouteAcceptedRowCount) ||
    !isNonNegativeInteger(result.unassignedRouteRowCount) ||
    result.unassignedRouteAcceptedRowCount > result.unassignedRouteRowCount
  ) {
    return null
  }

  const routeSummaries: SavedReviewRouteSummary[] = []
  const routeCodes = new Set<string>()
  for (const summary of result.routeSummaries) {
    const savedSummary = savedRouteSummaryFromRoute(summary)
    if (!savedSummary || routeCodes.has(savedSummary.routeCode)) {
      return null
    }
    routeCodes.add(savedSummary.routeCode)
    routeSummaries.push(savedSummary)
  }

  const candidate = {
    kind: SAVED_REVIEW_JOB_KIND,
    id,
    savedAtMs,
    catalog,
    totals,
    acceptedRowCount: result.acceptedRowCount,
    totalRowCount: result.totalRowCount,
    warningCount: result.issues.filter((issue) => issue.severity === 'warn').length,
    routeSummaries,
    unassignedRouteAcceptedRowCount: result.unassignedRouteAcceptedRowCount,
    unassignedRouteRowCount: result.unassignedRouteRowCount,
  }

  return parseSavedReviewJob(candidate)
}

/**
 * Reads only whitelisted, current saved jobs. Malformed, expired, future, or
 * oversized browser data is discarded before it can be displayed. Browser
 * storage access itself remains an explicit outcome for the UI.
 */
export function readSavedReviewJobs(
  storage: LocalStorageLike,
  nowMs = Date.now()
): SavedReviewJobLoadResult {
  if (!isNonNegativeInteger(nowMs)) {
    return { status: 'LOADED', jobs: [] }
  }

  let serialized: string | null
  try {
    serialized = storage.getItem(SAVED_REVIEW_JOB_STORAGE_KEY)
  } catch {
    return { status: 'STORAGE_UNAVAILABLE' }
  }

  if (!serialized) {
    return { status: 'LOADED', jobs: [] }
  }

  if (exceedsSavedReviewStoreLimit(serialized)) {
    discardSavedReviewJobs(storage)
    return { status: 'LOADED', jobs: [] }
  }

  let parsedValue: unknown
  try {
    parsedValue = JSON.parse(serialized)
  } catch {
    discardSavedReviewJobs(storage)
    return { status: 'LOADED', jobs: [] }
  }

  const parsed = parseSavedReviewJobStore(parsedValue)
  if (!parsed) {
    discardSavedReviewJobs(storage)
    return { status: 'LOADED', jobs: [] }
  }

  const liveJobs = parsed.jobs.filter((job) => isLiveSavedReviewJob(job, nowMs))
  // A failed cleanup does not make an already validated in-memory result
  // unsafe to show. It only means the browser did not allow housekeeping.
  writeSavedReviewJobs(storage, liveJobs)
  return { status: 'LOADED', jobs: liveJobs }
}

/**
 * Compatibility helper for callers that only need a safe list. Use
 * readSavedReviewJobs when the UI needs to distinguish storage unavailability
 * from an empty result list.
 */
export function loadSavedReviewJobs(
  storage: LocalStorageLike,
  nowMs = Date.now()
): SavedReviewJobV1[] {
  const loaded = readSavedReviewJobs(storage, nowMs)
  return loaded.status === 'LOADED' ? loaded.jobs : []
}

export function loadSavedReviewJob(
  storage: LocalStorageLike,
  id: string,
  nowMs = Date.now()
): SavedReviewJobV1 | null {
  if (!isSavedReviewJobId(id)) {
    return null
  }

  return loadSavedReviewJobs(storage, nowMs).find((job) => job.id === id) ?? null
}

/**
 * Stores one explicit, already validated review result in this browser only.
 * Existing saves are never discarded automatically; the user can delete one
 * explicitly before saving when the bounded local list is full.
 */
export function saveSavedReviewJob(
  storage: LocalStorageLike,
  job: SavedReviewJobV1,
  nowMs = Date.now()
): SavedReviewJobSaveResult {
  const safeJob = parseSavedReviewJob(job)
  if (!safeJob || !isNonNegativeInteger(nowMs) || !isLiveSavedReviewJob(safeJob, nowMs)) {
    return { status: 'INVALID_JOB' }
  }

  const loadedJobs = readSavedReviewJobs(storage, nowMs)
  if (loadedJobs.status !== 'LOADED') {
    return { status: 'STORAGE_UNAVAILABLE' }
  }

  const storedJobs = loadedJobs.jobs
  const alreadySaved = storedJobs.some((existing) => existing.id === safeJob.id)
  if (!alreadySaved && storedJobs.length >= MAX_SAVED_REVIEW_JOBS) {
    return { status: 'LIMIT_REACHED' }
  }

  const existingJobs = storedJobs.filter(
    (existing) => existing.id !== safeJob.id
  )
  const writeResult = writeSavedReviewJobs(storage, [safeJob, ...existingJobs])
  if (writeResult !== 'SAVED') {
    return { status: writeResult }
  }

  return { status: 'SAVED', job: safeJob }
}

export function removeSavedReviewJob(
  storage: LocalStorageLike,
  id: string,
  nowMs = Date.now()
): boolean {
  if (!isSavedReviewJobId(id)) {
    return false
  }

  const loadedJobs = readSavedReviewJobs(storage, nowMs)
  if (loadedJobs.status !== 'LOADED') {
    return false
  }

  const jobs = loadedJobs.jobs
  const remainingJobs = jobs.filter((job) => job.id !== id)
  if (remainingJobs.length === jobs.length) {
    return false
  }

  return writeSavedReviewJobs(storage, remainingJobs) === 'SAVED'
}
