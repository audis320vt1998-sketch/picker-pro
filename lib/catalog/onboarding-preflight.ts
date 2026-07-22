import type { VerifiedCatalogProduct } from './verified-catalog'
import { hasConsistentPickingConfiguration } from './picking-policy'
import { CATALOG_ONBOARDING_TEMPLATE_COLUMNS } from './onboarding-template'
import {
  type CatalogOnboardingPreflightIssue,
  type CatalogOnboardingPreflightIssueCode,
  type CatalogOnboardingPreflightResult,
  type CatalogOnboardingTemplateColumn,
  MAX_CATALOG_ONBOARDING_CELL_CHARACTERS,
  MAX_CATALOG_ONBOARDING_ISSUES,
  MAX_CATALOG_ONBOARDING_ROWS,
} from './onboarding-preflight-policy'

interface ParsedCsvRecord {
  cells: readonly string[]
  recordNumber: number
}

interface CandidateRecord {
  issues: CatalogOnboardingPreflightIssue[]
  product: VerifiedCatalogProduct | null
  rowNumber: number
}

type CsvFields = Record<CatalogOnboardingTemplateColumn, string>

type BooleanRead =
  | { kind: 'valid'; value: boolean }
  | { kind: 'invalid' }

type PositiveNumberRead =
  | { kind: 'valid'; value: number | null }
  | { kind: 'invalid' }

function parseStrictCsv(text: string): readonly ParsedCsvRecord[] | null {
  const records: ParsedCsvRecord[] = []
  let cells: string[] = []
  let field = ''
  let inQuotes = false
  let afterClosingQuote = false
  let recordNumber = 1

  const finishRecord = () => {
    cells.push(field)
    records.push({ cells, recordNumber })
    cells = []
    field = ''
    afterClosingQuote = false
    recordNumber += 1
  }

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]

    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          inQuotes = false
          afterClosingQuote = true
        }
      } else if (character === '\r' || character === '\n') {
        // Multiline cells are intentionally unsupported. Catalog fields should
        // stay one line so a future reviewed conversion remains auditable.
        return null
      } else {
        field += character
      }
      continue
    }

    if (afterClosingQuote) {
      if (character === ',') {
        cells.push(field)
        field = ''
        afterClosingQuote = false
        continue
      }
      if (character === '\n') {
        finishRecord()
        continue
      }
      if (character === '\r' && text[index + 1] === '\n') {
        finishRecord()
        index += 1
        continue
      }
      return null
    }

    if (character === ',') {
      cells.push(field)
      field = ''
      continue
    }
    if (character === '\n') {
      finishRecord()
      continue
    }
    if (character === '\r') {
      if (text[index + 1] !== '\n') {
        return null
      }
      finishRecord()
      index += 1
      continue
    }
    if (character === '"') {
      if (field.length > 0) {
        return null
      }
      inQuotes = true
      continue
    }

    field += character
  }

  if (inQuotes) {
    return null
  }
  if (afterClosingQuote || field.length > 0 || cells.length > 0) {
    finishRecord()
  }

  return records
}

function withoutUtf8Bom(value: string): string {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value
}

function isBlankRecord(record: ParsedCsvRecord): boolean {
  return record.cells.every((cell) => cell.trim().length === 0)
}

function headerMatches(record: ParsedCsvRecord): boolean {
  return (
    record.cells.length === CATALOG_ONBOARDING_TEMPLATE_COLUMNS.length &&
    record.cells.every(
      (cell, index) => cell === CATALOG_ONBOARDING_TEMPLATE_COLUMNS[index]
    )
  )
}

function readBoolean(value: string): BooleanRead {
  const trimmed = value.trim()
  if (trimmed === 'true') {
    return { kind: 'valid', value: true }
  }
  if (trimmed === 'false') {
    return { kind: 'valid', value: false }
  }
  return { kind: 'invalid' }
}

function readNullablePositiveNumber(value: string): PositiveNumberRead {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return { kind: 'valid', value: null }
  }

  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(trimmed)) {
    return { kind: 'invalid' }
  }

  const number = Number(trimmed)
  if (!Number.isFinite(number) || number <= 0) {
    return { kind: 'invalid' }
  }

  return { kind: 'valid', value: number }
}

function readAliases(value: string): readonly string[] | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return []
  }

  try {
    const parsed: unknown = JSON.parse(trimmed)
    return Array.isArray(parsed) && parsed.every((alias) => typeof alias === 'string')
      ? parsed
      : null
  } catch {
    return null
  }
}

function createIssue(
  rowNumber: number | null,
  field: CatalogOnboardingTemplateColumn | null,
  code: CatalogOnboardingPreflightIssueCode,
  severity: CatalogOnboardingPreflightIssue['severity'] = 'error'
): CatalogOnboardingPreflightIssue {
  return { rowNumber, field, code, severity }
}

function hasErrors(record: CandidateRecord): boolean {
  return record.issues.some((issue) => issue.severity === 'error')
}

function hasWarnings(record: CandidateRecord): boolean {
  return record.issues.some((issue) => issue.severity === 'warning')
}

function createResult(
  records: readonly CandidateRecord[],
  globalIssues: readonly CatalogOnboardingPreflightIssue[] = []
): CatalogOnboardingPreflightResult {
  const allIssues = [...globalIssues, ...records.flatMap((record) => record.issues)]
  const hasGlobalErrors = globalIssues.some((issue) => issue.severity === 'error')
  const rowsWithErrors = records.filter(hasErrors).length
  const rowsWithWarnings = records.filter(hasWarnings).length

  const sortedIssues = allIssues.sort((left, right) => {
    const leftRow = left.rowNumber ?? 0
    const rightRow = right.rowNumber ?? 0
    return leftRow - rightRow || left.code.localeCompare(right.code)
  })

  return {
    kind: 'CATALOG_ONBOARDING_PREFLIGHT',
    sideEffects: {
      imported: false,
      catalogUpdated: false,
      recordsVerified: false,
    },
    status:
      hasGlobalErrors || rowsWithErrors > 0
        ? 'NEEDS_CORRECTION'
        : 'READY_FOR_CONTROLLED_REVIEW',
    summary: {
      totalRows: records.length,
      readyRows: hasGlobalErrors ? 0 : records.length - rowsWithErrors,
      rowsWithErrors,
      rowsWithWarnings,
    },
    issues: sortedIssues.slice(0, MAX_CATALOG_ONBOARDING_ISSUES),
    issuesTruncated: sortedIssues.length > MAX_CATALOG_ONBOARDING_ISSUES,
  }
}

function fieldsFromRecord(record: ParsedCsvRecord): CsvFields {
  return Object.fromEntries(
    CATALOG_ONBOARDING_TEMPLATE_COLUMNS.map((column, index) => [
      column,
      record.cells[index],
    ])
  ) as CsvFields
}

function parseCandidateRecord(record: ParsedCsvRecord): CandidateRecord {
  const candidate: CandidateRecord = {
    rowNumber: record.recordNumber,
    product: null,
    issues: [],
  }

  if (record.cells.length !== CATALOG_ONBOARDING_TEMPLATE_COLUMNS.length) {
    candidate.issues.push(
      createIssue(record.recordNumber, null, 'INVALID_COLUMN_COUNT')
    )
    return candidate
  }

  const oversizedCellIndex = record.cells.findIndex(
    (cell) => cell.length > MAX_CATALOG_ONBOARDING_CELL_CHARACTERS
  )
  if (oversizedCellIndex >= 0) {
    candidate.issues.push(
      createIssue(
        record.recordNumber,
        CATALOG_ONBOARDING_TEMPLATE_COLUMNS[oversizedCellIndex],
        'CELL_TOO_LARGE'
      )
    )
    return candidate
  }

  const fields = fieldsFromRecord(record)
  const productKey = fields.productKey.trim()
  const name = fields.name.trim()
  const barcode = fields.barcode.trim() || null
  const sku = fields.sku.trim() || null
  const verificationStatus = fields.verificationStatus.trim()
  const aliases = readAliases(fields.aliases)
  const allowUnitPicking = readBoolean(fields.allowUnitPicking)
  const caseOnly = readBoolean(fields.caseOnly)
  const active = readBoolean(fields.active)
  const unitSize = readNullablePositiveNumber(fields.unitSize)
  const caseSize = readNullablePositiveNumber(fields.caseSize)

  if (productKey.length === 0) {
    candidate.issues.push(
      createIssue(record.recordNumber, 'productKey', 'MISSING_PRODUCT_KEY')
    )
  }
  if (name.length === 0) {
    candidate.issues.push(
      createIssue(record.recordNumber, 'name', 'MISSING_PRODUCT_NAME')
    )
  }
  if (verificationStatus === 'verified') {
    candidate.issues.push(
      createIssue(
        record.recordNumber,
        'verificationStatus',
        'VERIFIED_STATUS_NOT_ALLOWED'
      )
    )
  } else if (verificationStatus !== 'unverified') {
    candidate.issues.push(
      createIssue(
        record.recordNumber,
        'verificationStatus',
        'INVALID_VERIFICATION_STATUS'
      )
    )
  }
  if (aliases === null) {
    candidate.issues.push(
      createIssue(record.recordNumber, 'aliases', 'INVALID_ALIASES')
    )
  }
  if (allowUnitPicking.kind === 'invalid') {
    candidate.issues.push(
      createIssue(record.recordNumber, 'allowUnitPicking', 'INVALID_BOOLEAN')
    )
  }
  if (caseOnly.kind === 'invalid') {
    candidate.issues.push(
      createIssue(record.recordNumber, 'caseOnly', 'INVALID_BOOLEAN')
    )
  }
  if (active.kind === 'invalid') {
    candidate.issues.push(
      createIssue(record.recordNumber, 'active', 'INVALID_BOOLEAN')
    )
  }
  if (unitSize.kind === 'invalid') {
    candidate.issues.push(
      createIssue(record.recordNumber, 'unitSize', 'INVALID_POSITIVE_NUMBER')
    )
  }
  if (caseSize.kind === 'invalid') {
    candidate.issues.push(
      createIssue(record.recordNumber, 'caseSize', 'INVALID_POSITIVE_NUMBER')
    )
  }

  if (
    hasErrors(candidate) ||
    aliases === null ||
    allowUnitPicking.kind !== 'valid' ||
    caseOnly.kind !== 'valid' ||
    active.kind !== 'valid' ||
    unitSize.kind !== 'valid' ||
    caseSize.kind !== 'valid'
  ) {
    return candidate
  }

  const product: VerifiedCatalogProduct = {
    productKey,
    barcode,
    sku,
    verificationStatus: 'unverified',
    name,
    ...(fields.nameEn.trim().length > 0 ? { nameEn: fields.nameEn.trim() } : {}),
    aliases,
    allowUnitPicking: allowUnitPicking.value,
    caseOnly: caseOnly.value,
    unitSize: unitSize.value,
    caseSize: caseSize.value,
    active: active.value,
  }

  if (!hasConsistentPickingConfiguration(product)) {
    candidate.issues.push(
      createIssue(
        record.recordNumber,
        'caseOnly',
        'CONTRADICTORY_PICKING_CONFIGURATION'
      )
    )
    return candidate
  }

  candidate.product = product

  return candidate
}

function markDuplicate(
  recordsByValue: Map<string, CandidateRecord>,
  value: string | null,
  field: CatalogOnboardingTemplateColumn,
  code: CatalogOnboardingPreflightIssueCode,
  record: CandidateRecord
): void {
  if (value === null) {
    return
  }

  const previous = recordsByValue.get(value)
  if (!previous) {
    recordsByValue.set(value, record)
    return
  }

  previous.issues.push(createIssue(previous.rowNumber, field, code))
  record.issues.push(createIssue(record.rowNumber, field, code))
}

function validateDuplicates(records: readonly CandidateRecord[]): void {
  const productKeys = new Map<string, CandidateRecord>()
  const barcodes = new Map<string, CandidateRecord>()
  const skus = new Map<string, CandidateRecord>()

  for (const record of records) {
    if (!record.product) {
      continue
    }

    markDuplicate(
      productKeys,
      record.product.productKey,
      'productKey',
      'DUPLICATE_PRODUCT_KEY',
      record
    )
    markDuplicate(
      barcodes,
      record.product.barcode,
      'barcode',
      'DUPLICATE_BARCODE',
      record
    )
    markDuplicate(skus, record.product.sku, 'sku', 'DUPLICATE_SKU', record)
  }
}

/**
 * Performs a temporary structural check of an onboarding CSV. The function
 * never writes, imports, or promotes catalog data; it returns only fixed
 * issue codes, fields, and CSV record numbers so callers do not receive raw
 * product data from the uploaded file.
 */
export function preflightCatalogOnboardingCsv(
  source: string
): CatalogOnboardingPreflightResult {
  if (source.includes('\u0000')) {
    return createResult([], [createIssue(null, null, 'INVALID_CSV')])
  }

  const records = parseStrictCsv(withoutUtf8Bom(source))
  if (records === null) {
    return createResult([], [createIssue(null, null, 'INVALID_CSV')])
  }

  if (records.length === 0 || records.every(isBlankRecord)) {
    return createResult([], [createIssue(null, null, 'EMPTY_CSV')])
  }

  const [header, ...dataRecords] = records
  if (!headerMatches(header)) {
    return createResult([], [createIssue(null, null, 'INVALID_HEADER')])
  }
  if (dataRecords.length === 0) {
    return createResult([], [createIssue(null, null, 'NO_PRODUCT_ROWS')])
  }
  if (dataRecords.length > MAX_CATALOG_ONBOARDING_ROWS) {
    return createResult(
      [],
      [createIssue(null, null, 'TOO_MANY_ROWS')]
    )
  }

  const candidateRecords = dataRecords.map((record) =>
    isBlankRecord(record)
      ? {
          rowNumber: record.recordNumber,
          product: null,
          issues: [
            createIssue(record.recordNumber, null, 'EMPTY_PRODUCT_ROW'),
          ],
        }
      : parseCandidateRecord(record)
  )
  validateDuplicates(candidateRecords)

  return createResult(candidateRecords)
}
