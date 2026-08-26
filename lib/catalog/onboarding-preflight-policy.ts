import { CATALOG_ONBOARDING_TEMPLATE_COLUMNS } from './onboarding-template'

export const MAX_CATALOG_ONBOARDING_CSV_BYTES = 1 * 1024 * 1024
export const MAX_CATALOG_ONBOARDING_MULTIPART_BYTES =
  MAX_CATALOG_ONBOARDING_CSV_BYTES + 64 * 1024
export const MAX_CATALOG_ONBOARDING_ROWS = 2_000
export const MAX_CATALOG_ONBOARDING_CELL_CHARACTERS = 4_096
export const MAX_CATALOG_ONBOARDING_ISSUES = 100

export const CATALOG_ONBOARDING_SUPPORTED_CSV_TYPES = [
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
] as const

export type CatalogOnboardingSupportedCsvType =
  (typeof CATALOG_ONBOARDING_SUPPORTED_CSV_TYPES)[number]

export const CATALOG_ONBOARDING_FILE_INPUT_ACCEPT = [
  '.csv',
  ...CATALOG_ONBOARDING_SUPPORTED_CSV_TYPES,
].join(',')

export type CatalogOnboardingTemplateColumn =
  (typeof CATALOG_ONBOARDING_TEMPLATE_COLUMNS)[number]

export interface CatalogOnboardingFileMetadata {
  size: number
  type: string
}

export type CatalogOnboardingFileSelectionIssue =
  | 'UNSUPPORTED_CSV_TYPE'
  | 'CSV_TOO_LARGE'
  | 'INVALID_CSV_FILE'

export type CatalogOnboardingPreflightFailureCode =
  | 'INVALID_CATALOG_PREFLIGHT_INPUT'
  | 'REQUEST_TOO_LARGE'
  | 'UNSUPPORTED_CSV_TYPE'
  | 'CSV_TOO_LARGE'
  | 'INVALID_CSV_CONTENT'
  | 'UNKNOWN'

export type CatalogOnboardingPreflightIssueCode =
  | 'EMPTY_CSV'
  | 'INVALID_CSV'
  | 'INVALID_HEADER'
  | 'NO_PRODUCT_ROWS'
  | 'TOO_MANY_ROWS'
  | 'EMPTY_PRODUCT_ROW'
  | 'INVALID_COLUMN_COUNT'
  | 'CELL_TOO_LARGE'
  | 'MISSING_PRODUCT_KEY'
  | 'MISSING_PRODUCT_NAME'
  | 'INVALID_VERIFICATION_STATUS'
  | 'INVALID_ALIASES'
  | 'INVALID_BOOLEAN'
  | 'INVALID_POSITIVE_NUMBER'
  | 'CONTRADICTORY_PICKING_CONFIGURATION'
  | 'DUPLICATE_PRODUCT_KEY'
  | 'DUPLICATE_BARCODE'
  | 'DUPLICATE_SKU'
  | 'VERIFIED_STATUS_NOT_ALLOWED'

export interface CatalogOnboardingPreflightIssue {
  code: CatalogOnboardingPreflightIssueCode
  field: CatalogOnboardingTemplateColumn | null
  rowNumber: number | null
  severity: 'error' | 'warning'
}

export interface CatalogOnboardingPreflightResult {
  issues: readonly CatalogOnboardingPreflightIssue[]
  issuesTruncated: boolean
  kind: 'CATALOG_ONBOARDING_PREFLIGHT'
  sideEffects: {
    catalogUpdated: false
    imported: false
    recordsVerified: false
  }
  status: 'NEEDS_CORRECTION' | 'READY_FOR_CONTROLLED_REVIEW'
  summary: {
    readyRows: number
    rowsWithErrors: number
    rowsWithWarnings: number
    totalRows: number
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isTemplateColumn(value: unknown): value is CatalogOnboardingTemplateColumn {
  return (
    typeof value === 'string' &&
    CATALOG_ONBOARDING_TEMPLATE_COLUMNS.includes(
      value as CatalogOnboardingTemplateColumn
    )
  )
}

function isIssueCode(value: unknown): value is CatalogOnboardingPreflightIssueCode {
  return (
    typeof value === 'string' &&
    [
      'EMPTY_CSV',
      'INVALID_CSV',
      'INVALID_HEADER',
      'NO_PRODUCT_ROWS',
      'TOO_MANY_ROWS',
      'EMPTY_PRODUCT_ROW',
      'INVALID_COLUMN_COUNT',
      'CELL_TOO_LARGE',
      'MISSING_PRODUCT_KEY',
      'MISSING_PRODUCT_NAME',
      'INVALID_VERIFICATION_STATUS',
      'INVALID_ALIASES',
      'INVALID_BOOLEAN',
      'INVALID_POSITIVE_NUMBER',
      'CONTRADICTORY_PICKING_CONFIGURATION',
      'DUPLICATE_PRODUCT_KEY',
      'DUPLICATE_BARCODE',
      'DUPLICATE_SKU',
      'VERIFIED_STATUS_NOT_ALLOWED',
    ].includes(value as CatalogOnboardingPreflightIssueCode)
  )
}

function isIssue(value: unknown): value is CatalogOnboardingPreflightIssue {
  return (
    isRecord(value) &&
    isIssueCode(value.code) &&
    (value.field === null || isTemplateColumn(value.field)) &&
    (value.rowNumber === null ||
      (typeof value.rowNumber === 'number' &&
        Number.isInteger(value.rowNumber) &&
        value.rowNumber >= 1)) &&
    (value.severity === 'error' || value.severity === 'warning')
  )
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

export function isSupportedCatalogOnboardingCsvType(
  value: string
): value is CatalogOnboardingSupportedCsvType {
  return CATALOG_ONBOARDING_SUPPORTED_CSV_TYPES.includes(
    value.trim().toLowerCase() as CatalogOnboardingSupportedCsvType
  )
}

export function getCatalogOnboardingFileSelectionIssue(
  file: CatalogOnboardingFileMetadata
): CatalogOnboardingFileSelectionIssue | null {
  if (!isSupportedCatalogOnboardingCsvType(file.type)) {
    return 'UNSUPPORTED_CSV_TYPE'
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return 'INVALID_CSV_FILE'
  }
  if (file.size > MAX_CATALOG_ONBOARDING_CSV_BYTES) {
    return 'CSV_TOO_LARGE'
  }

  return null
}

export function catalogOnboardingPreflightFailureCodeFromResponse(
  value: unknown
): CatalogOnboardingPreflightFailureCode {
  if (!isRecord(value) || value.kind !== 'CATALOG_ONBOARDING_PREFLIGHT_FAILURE') {
    return 'UNKNOWN'
  }

  switch (value.code) {
    case 'INVALID_CATALOG_PREFLIGHT_INPUT':
    case 'REQUEST_TOO_LARGE':
    case 'UNSUPPORTED_CSV_TYPE':
    case 'CSV_TOO_LARGE':
    case 'INVALID_CSV_CONTENT':
      return value.code
    default:
      return 'UNKNOWN'
  }
}

/**
 * The browser reads only this fixed result shape and ignores any extra
 * untrusted API fields, such as uploaded file names or raw CSV cell text.
 */
export function isCatalogOnboardingPreflightResult(
  value: unknown
): value is CatalogOnboardingPreflightResult {
  if (
    !isRecord(value) ||
    value.kind !== 'CATALOG_ONBOARDING_PREFLIGHT' ||
    (value.status !== 'NEEDS_CORRECTION' &&
      value.status !== 'READY_FOR_CONTROLLED_REVIEW') ||
    !isRecord(value.summary) ||
    !isRecord(value.sideEffects) ||
    value.sideEffects.catalogUpdated !== false ||
    value.sideEffects.imported !== false ||
    value.sideEffects.recordsVerified !== false ||
    !isNonNegativeInteger(value.summary.totalRows) ||
    !isNonNegativeInteger(value.summary.readyRows) ||
    !isNonNegativeInteger(value.summary.rowsWithErrors) ||
    !isNonNegativeInteger(value.summary.rowsWithWarnings) ||
    typeof value.issuesTruncated !== 'boolean' ||
    !Array.isArray(value.issues) ||
    value.issues.length > MAX_CATALOG_ONBOARDING_ISSUES ||
    value.summary.readyRows > value.summary.totalRows ||
    value.summary.rowsWithErrors > value.summary.totalRows ||
    value.summary.rowsWithWarnings > value.summary.totalRows ||
    value.summary.readyRows + value.summary.rowsWithErrors >
      value.summary.totalRows ||
    (value.issuesTruncated &&
      value.issues.length !== MAX_CATALOG_ONBOARDING_ISSUES)
  ) {
    return false
  }

  if (!value.issues.every(isIssue)) {
    return false
  }

  if (value.status === 'READY_FOR_CONTROLLED_REVIEW') {
    return (
      value.summary.totalRows > 0 &&
      value.summary.readyRows === value.summary.totalRows &&
      value.summary.rowsWithErrors === 0 &&
      !value.issues.some((issue) => issue.severity === 'error')
    )
  }

  return (
    value.summary.rowsWithErrors > 0 ||
    value.issues.some((issue) => issue.severity === 'error')
  )
}
