import type {
  MaayanFieldConfidenceField,
  MaayanFieldConfidences,
  MaayanParseIssue,
} from './types'

/**
 * OCR values below this threshold remain visible, but need an explicit check
 * against the source document. The threshold never accepts or rejects a row.
 */
export const OCR_FIELD_CONFIDENCE_REVIEW_THRESHOLD = 70

const FIELD_ORDER: readonly MaayanFieldConfidenceField[] = [
  'printedRowNumber',
  'sku',
  'barcode',
  'productName',
  'caseQuantity',
  'unitsPerCase',
  'totalUnits',
]

function isLowConfidence(value: number | null): value is number {
  return (
    value !== null &&
    Number.isFinite(value) &&
    value >= 0 &&
    value < OCR_FIELD_CONFIDENCE_REVIEW_THRESHOLD
  )
}

/**
 * Converts only the known low-confidence fields into review issues. Missing
 * values stay represented by their existing parser issues; no score is
 * invented for them.
 */
export function lowConfidenceFieldIssues(
  fieldConfidences: MaayanFieldConfidences
): MaayanParseIssue[] {
  return FIELD_ORDER.flatMap((field) =>
    isLowConfidence(fieldConfidences[field])
      ? [
          {
            code: 'LOW_FIELD_CONFIDENCE',
            field,
            message: `${field} OCR confidence is below the review threshold.`,
          },
        ]
      : []
  )
}
