export interface BoundingBox {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface OcrWord {
  text: string
  confidence: number
  boundingBox: BoundingBox
}

export interface OcrPage {
  width: number
  height: number
  words: readonly OcrWord[]
  /**
   * Optional numeric-only recovery from a calibrated table pass. These rows
   * remain OCR drafts and are never an operational result.
   */
  recoveredRows?: readonly MaayanParsedRow[]
}

export interface ColumnBand {
  xMin: number
  xMax: number
}

export interface MaayanTableLayout {
  bodyBounds: BoundingBox
  lineMergeDistance: number
  continuationDistance: number
  columns: {
    printedRowNumber: ColumnBand
    sku: ColumnBand
    barcode: ColumnBand
    productName: ColumnBand
    trayBarcode: ColumnBand
    caseQuantity: ColumnBand
    unitsPerCase: ColumnBand
    totalUnits: ColumnBand
  }
}

export interface MaayanRawQuantities {
  caseQuantity: number | null
  unitsPerCase: number | null
  totalUnits: number | null
}

/**
 * Fields that are shown to the reviewer from a Maayan table row. Each value
 * retains the OCR confidence of the word or words that produced it. A null
 * value means that the parser did not produce a field value, not a guessed
 * confidence score.
 */
export type MaayanFieldConfidenceField =
  | 'printedRowNumber'
  | 'sku'
  | 'barcode'
  | 'productName'
  | keyof MaayanRawQuantities

export type MaayanFieldConfidences = Readonly<
  Record<MaayanFieldConfidenceField, number | null>
>

export type MaayanParseIssueCode =
  | 'MISSING_SKU'
  | 'MISSING_BARCODE'
  | 'MISSING_PRODUCT_NAME'
  | 'AMBIGUOUS_NUMERIC_FIELD'
  | 'INVALID_NUMERIC_FIELD'
  | 'LOW_FIELD_CONFIDENCE'

export interface MaayanParseIssue {
  code: MaayanParseIssueCode
  field?: MaayanFieldConfidenceField
  message: string
}

export interface MaayanParsedRow {
  printedRowNumber: number | null
  sku: string | null
  barcode: string | null
  trayBarcode: string | null
  productName: string | null
  rawQuantities: MaayanRawQuantities
  rawText: string
  confidence: number
  fieldConfidences: MaayanFieldConfidences
  boundingBox: BoundingBox
  issues: MaayanParseIssue[]
}

export type DocumentPreflightIssueCode =
  | 'OCR_DRAFT_REQUIRES_REVIEW'
  | 'IMAGE_TOO_LOW_RESOLUTION'
  | 'DOCUMENT_LAYOUT_UNRECOGNIZED'
  | 'NO_TRACEABLE_ROWS'
  | 'PDF_PAGE_RENDER_INVALID'
  | 'PDF_PAGE_DIMENSIONS_TOO_LARGE'
  | 'PDF_PAGE_UNREADABLE'

export interface DocumentPreflightIssue {
  code: DocumentPreflightIssueCode
  message: string
}

export interface DocumentPreflightRow {
  source: {
    pageNumber: number
    printedRowNumber: number | null
    parserRowIndex: number
  }
  sku: string | null
  barcode: string | null
  trayBarcode: string | null
  productName: string | null
  sourceQuantities: MaayanRawQuantities
  traceText: string
  confidence: number
  fieldConfidences: MaayanFieldConfidences
  boundingBox: BoundingBox
  issues: readonly MaayanParseIssue[]
}

export interface DocumentPreflightPage {
  pageNumber: number
  rows: readonly DocumentPreflightRow[]
  issues: readonly DocumentPreflightIssue[]
}

/**
 * This is deliberately not a picking result. Every row is a transient OCR
 * draft that must be checked by a person before it can enter manual review.
 */
export interface DocumentPreflightResult {
  kind: 'DOCUMENT_PREFLIGHT'
  status: 'NEEDS_REVIEW'
  profile: 'MAAYAN_PRICE_OFFER_V1'
  pages: readonly DocumentPreflightPage[]
}
