/**
 * A deliberately narrow, browser-local handoff. It is a verified result
 * summary, not an operational pick list, route export, or source document.
 */
export const VERIFIED_RESULT_CSV_COLUMNS = [
  'SKU',
  'ברקוד',
  'שם פריט',
  'מארזים מאומתים',
  'בודדים מאומתים',
] as const

const FORMULA_PREFIX = /^[\s]*[=+\-@]/u
const MAX_CSV_TEXT_LENGTH = 500

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && isNonNegativeFiniteNumber(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizedText(value: string): string {
  return value.replace(/\u0000/gu, '')
}

function csvText(value: string, forceSpreadsheetText = false): string {
  const normalized = normalizedText(value)
  const protectedValue =
    FORMULA_PREFIX.test(normalized) || forceSpreadsheetText
      ? normalized.startsWith("'")
        ? normalized
        : `'${normalized}`
      : normalized

  return `"${protectedValue.replace(/"/g, '""')}"`
}

function optionalCsvText(value: unknown, forceSpreadsheetText = false): string | null {
  if (value === undefined) {
    return '""'
  }

  if (typeof value !== 'string' || value.length > MAX_CSV_TEXT_LENGTH) {
    return null
  }

  const normalized = normalizedText(value)
  return normalized.length === 0 ? '""' : csvText(normalized, forceSpreadsheetText)
}

function csvNumber(value: unknown): string | null {
  return isNonNegativeFiniteNumber(value) ? String(value) : null
}

function csvRow(total: unknown): string | null {
  if (!isRecord(total)) {
    return null
  }

  if (
    typeof total.productName !== 'string' ||
    total.productName.length > MAX_CSV_TEXT_LENGTH
  ) {
    return null
  }

  const productName = normalizedText(total.productName)
  if (productName.trim().length === 0) {
    return null
  }

  const sku = optionalCsvText(total.sku, true)
  const barcode = optionalCsvText(total.barcode, true)
  const cases = csvNumber(total.cases)
  const units = csvNumber(total.units)
  if (sku === null || barcode === null || cases === null || units === null) {
    return null
  }

  return [sku, barcode, csvText(productName), cases, units].join(',')
}

/**
 * Builds a UTF-8 CSV from a browser-safe saved result only. It never accepts
 * raw OCR/API payloads, and it intentionally omits routes, source positions,
 * document details, images, and customer data.
 */
export function createVerifiedResultCsv(job: unknown): string | null {
  if (
    !isRecord(job) ||
    job.kind !== 'SAVED_REVIEW_JOB_V1' ||
    !isNonNegativeInteger(job.acceptedRowCount) ||
    job.acceptedRowCount <= 0 ||
    !isNonNegativeInteger(job.totalRowCount) ||
    job.totalRowCount < job.acceptedRowCount ||
    !isNonNegativeInteger(job.warningCount) ||
    !Array.isArray(job.totals) ||
    job.totals.length === 0 ||
    job.totals.length > job.acceptedRowCount
  ) {
    return null
  }

  const rows: string[] = []
  for (const total of job.totals) {
    const row = csvRow(total)
    if (!row) {
      return null
    }
    rows.push(row)
  }

  return `\uFEFF${VERIFIED_RESULT_CSV_COLUMNS.join(',')}\r\n${rows.join('\r\n')}\r\n`
}

/**
 * Uses only the local save timestamp. It never places a product name, route,
 * customer value, or opaque identifier in the downloaded filename.
 */
export function createVerifiedResultCsvFilename(savedAtMs: number): string {
  const date = new Date(savedAtMs)
  const safeDate = Number.isFinite(date.getTime()) ? date : new Date()
  const stamp = [
    safeDate.getUTCFullYear(),
    String(safeDate.getUTCMonth() + 1).padStart(2, '0'),
    String(safeDate.getUTCDate()).padStart(2, '0'),
    String(safeDate.getUTCHours()).padStart(2, '0'),
    String(safeDate.getUTCMinutes()).padStart(2, '0'),
    String(safeDate.getUTCSeconds()).padStart(2, '0'),
  ].join('')

  return `picker-pro-verified-summary-${stamp}.csv`
}
