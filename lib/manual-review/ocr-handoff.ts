import type {
  DocumentPreflightRow,
  MaayanRawQuantities,
} from '@/lib/document-intake'
import { isOcrSourceDocumentRef } from '@/lib/document-intake'

export const OCR_MANUAL_REVIEW_HANDOFF_STORAGE_KEY =
  'picker-pro.ocr-manual-review-handoff.v1'

const HANDOFF_TTL_MS = 15 * 60 * 1000

export interface SessionStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface OcrManualReviewHandoffRow {
  source: {
    sourceDocumentRef: string
    pageNumber: number
    printedRowNumber: number
    parserRowIndex: number
  }
  productName?: string
  barcode?: string
  sku?: string
  /**
   * These are display-only OCR source fields. They are deliberately not
   * converted to ManualReviewRowInput cases or units.
   */
  sourceQuantities: MaayanRawQuantities
}

/**
 * The browser supplies one opaque source-document reference for each uploaded
 * image. The reference is intentionally not a filename and does not identify
 * a customer or order.
 */
export interface OcrManualReviewHandoffCandidate {
  sourceDocumentRef: string
  row: DocumentPreflightRow
}

export interface OcrManualReviewHandoffV1 {
  kind: 'OCR_MANUAL_REVIEW_HANDOFF_V1'
  createdAtMs: number
  rows: readonly OcrManualReviewHandoffRow[]
}

export interface ManualReviewOcrDraft {
  sourceDocumentRef: string
  pageNumber: number
  rowNumber: number
  rawText: string
  productName: string
  barcode: string
  sku: string
  sourceQuantities: MaayanRawQuantities
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function isParserRowIndex(value: unknown): value is number {
  return isPositiveInteger(value) && value <= 999
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string'
}

function isSourceQuantity(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0)
}

function isSourceQuantities(value: unknown): value is MaayanRawQuantities {
  return (
    isRecord(value) &&
    isSourceQuantity(value.caseQuantity) &&
    isSourceQuantity(value.unitsPerCase) &&
    isSourceQuantity(value.totalUnits)
  )
}

function isHandoffRow(value: unknown): value is OcrManualReviewHandoffRow {
  if (!isRecord(value) || !isRecord(value.source) || !isSourceQuantities(value.sourceQuantities)) {
    return false
  }

  return (
    isOcrSourceDocumentRef(value.source.sourceDocumentRef) &&
    isPositiveInteger(value.source.pageNumber) &&
    isPositiveInteger(value.source.printedRowNumber) &&
    isParserRowIndex(value.source.parserRowIndex) &&
    isOptionalString(value.productName) &&
    isOptionalString(value.barcode) &&
    isOptionalString(value.sku)
  )
}

function isHandoff(value: unknown): value is OcrManualReviewHandoffV1 {
  return (
    isRecord(value) &&
    value.kind === 'OCR_MANUAL_REVIEW_HANDOFF_V1' &&
    typeof value.createdAtMs === 'number' &&
    Number.isFinite(value.createdAtMs) &&
    value.createdAtMs >= 0 &&
    Array.isArray(value.rows) &&
    value.rows.length > 0 &&
    value.rows.every(isHandoffRow)
  )
}

function cleanOptionalText(value: string | null): string | undefined {
  const cleaned = value?.trim()
  return cleaned ? cleaned : undefined
}

function copySourceQuantities(
  quantities: MaayanRawQuantities
): MaayanRawQuantities {
  return {
    caseQuantity: quantities.caseQuantity,
    unitsPerCase: quantities.unitsPerCase,
    totalUnits: quantities.totalUnits,
  }
}

/**
 * A preflight row can move to manual review only when its visible source
 * location is traceable. OCR text, image data, document headers, filenames,
 * and OCR bounding boxes are intentionally excluded from this browser-only
 * handoff.
 */
export function toOcrManualReviewHandoffRow(
  candidate: OcrManualReviewHandoffCandidate
): OcrManualReviewHandoffRow | null {
  const { row, sourceDocumentRef } = candidate
  const printedRowNumber = row.source.printedRowNumber
  const productName = cleanOptionalText(row.productName)
  const barcode = cleanOptionalText(row.barcode)
  const sku = cleanOptionalText(row.sku)
  if (
    !isOcrSourceDocumentRef(sourceDocumentRef) ||
    !isPositiveInteger(row.source.pageNumber) ||
    !isPositiveInteger(printedRowNumber) ||
    !isParserRowIndex(row.source.parserRowIndex)
  ) {
    return null
  }

  return {
    source: {
      sourceDocumentRef,
      pageNumber: row.source.pageNumber,
      printedRowNumber,
      parserRowIndex: row.source.parserRowIndex,
    },
    ...(productName ? { productName } : {}),
    ...(barcode ? { barcode } : {}),
    ...(sku ? { sku } : {}),
    sourceQuantities: copySourceQuantities(row.sourceQuantities),
  }
}

export function createOcrManualReviewHandoff(
  candidates: readonly OcrManualReviewHandoffCandidate[],
  createdAtMs = Date.now()
): OcrManualReviewHandoffV1 | null {
  const handoffRows = candidates
    .map(toOcrManualReviewHandoffRow)
    .filter((row): row is OcrManualReviewHandoffRow => row !== null)

  if (handoffRows.length === 0 || !Number.isFinite(createdAtMs)) {
    return null
  }

  return {
    kind: 'OCR_MANUAL_REVIEW_HANDOFF_V1',
    createdAtMs,
    rows: handoffRows,
  }
}

export function saveOcrManualReviewHandoff(
  storage: SessionStorageLike,
  handoff: OcrManualReviewHandoffV1
): void {
  storage.setItem(OCR_MANUAL_REVIEW_HANDOFF_STORAGE_KEY, JSON.stringify(handoff))
}

/**
 * A handoff is single-use and short-lived. It is removed before validation so
 * a stale, malformed, or already consumed OCR draft cannot reappear later.
 */
export function consumeOcrManualReviewHandoff(
  storage: SessionStorageLike,
  nowMs = Date.now()
): OcrManualReviewHandoffV1 | null {
  const serialized = storage.getItem(OCR_MANUAL_REVIEW_HANDOFF_STORAGE_KEY)
  if (!serialized) {
    return null
  }

  storage.removeItem(OCR_MANUAL_REVIEW_HANDOFF_STORAGE_KEY)

  try {
    const parsed: unknown = JSON.parse(serialized)
    if (
      !isHandoff(parsed) ||
      parsed.createdAtMs > nowMs ||
      nowMs - parsed.createdAtMs > HANDOFF_TTL_MS
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

/**
 * Builds the editable seed for the browser form. Quantities remain outside
 * the ManualReviewRowInput contract and are only available for comparison.
 */
export function toManualReviewOcrDraft(
  row: OcrManualReviewHandoffRow
): ManualReviewOcrDraft {
  const productName = row.productName ?? ''
  const barcode = row.barcode ?? ''
  const sku = row.sku ?? ''
  const identifiers = [
    sku ? `מק״ט: ${sku}` : '',
    barcode ? `ברקוד: ${barcode}` : '',
    productName ? `שם פריט: ${productName}` : '',
  ].filter(Boolean)

  return {
    sourceDocumentRef: row.source.sourceDocumentRef,
    pageNumber: row.source.pageNumber,
    rowNumber: row.source.printedRowNumber,
    rawText: ['טיוטת OCR — יש לאמת מול מסמך המקור', ...identifiers].join(' | '),
    productName,
    barcode,
    sku,
    sourceQuantities: copySourceQuantities(row.sourceQuantities),
  }
}
