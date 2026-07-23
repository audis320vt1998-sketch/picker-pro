import type { ManualReviewRowInput } from './types'

export interface ManualReviewRowDraft {
  sourceDocumentRef?: string | null
  pageNumber: string
  rowNumber: string
  rawText: string
  productName: string
  barcode: string
  sku: string
  cases: string
  units: string
}

export type ManualReviewRowReadinessProblemCode =
  | 'RAW_TEXT_REQUIRED'
  | 'PRODUCT_IDENTIFIER_REQUIRED'
  | 'PAGE_NUMBER_REQUIRED'
  | 'PAGE_NUMBER_INVALID'
  | 'ROW_NUMBER_REQUIRED'
  | 'ROW_NUMBER_INVALID'
  | 'CASES_REQUIRED'
  | 'CASES_INVALID'
  | 'UNITS_REQUIRED'
  | 'UNITS_INVALID'

export interface ManualReviewRowReadinessProblem {
  code: ManualReviewRowReadinessProblemCode
  label: string
  kind: 'missing' | 'invalid'
}

export interface ManualReviewRowReadiness {
  isReady: boolean
  input: ManualReviewRowInput | null
  problems: readonly ManualReviewRowReadinessProblem[]
  summary: string
}

const PROBLEM_LABELS: Record<ManualReviewRowReadinessProblemCode, string> = {
  RAW_TEXT_REQUIRED: 'טקסט מקור',
  PRODUCT_IDENTIFIER_REQUIRED: 'מזהה פריט',
  PAGE_NUMBER_REQUIRED: 'מספר עמוד',
  PAGE_NUMBER_INVALID: 'מספר עמוד',
  ROW_NUMBER_REQUIRED: 'מספר שורה',
  ROW_NUMBER_INVALID: 'מספר שורה',
  CASES_REQUIRED: 'מארזים',
  CASES_INVALID: 'מארזים',
  UNITS_REQUIRED: 'בודדים',
  UNITS_INVALID: 'בודדים',
}

function problem(
  code: ManualReviewRowReadinessProblemCode,
  kind: ManualReviewRowReadinessProblem['kind']
): ManualReviewRowReadinessProblem {
  return { code, kind, label: PROBLEM_LABELS[code] }
}

function positiveInteger(value: string): number | null {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : null
}

function nonNegativeNumber(value: string): number | null {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

function readinessSummary(
  problems: readonly ManualReviewRowReadinessProblem[]
): string {
  if (problems.length === 0) {
    return 'מוכן לבדיקה'
  }

  const labels = problems.map((item) => item.label).join(', ')
  return problems.every((item) => item.kind === 'missing')
    ? `חסרים: ${labels}`
    : `לתיקון: ${labels}`
}

/**
 * Validates the values the reviewer explicitly entered. This intentionally
 * does not copy OCR quantities, infer a pack size, or convert units into
 * cases; the returned input exists only when both quantities were supplied.
 */
export function getManualReviewRowReadiness(
  draft: ManualReviewRowDraft
): ManualReviewRowReadiness {
  const problems: ManualReviewRowReadinessProblem[] = []
  const rawText = draft.rawText.trim()
  const productName = draft.productName.trim()
  const barcode = draft.barcode.trim()
  const sku = draft.sku.trim()
  const pageNumberText = draft.pageNumber.trim()
  const rowNumberText = draft.rowNumber.trim()
  const casesText = draft.cases.trim()
  const unitsText = draft.units.trim()

  if (!rawText) {
    problems.push(problem('RAW_TEXT_REQUIRED', 'missing'))
  }

  if (!productName && !barcode && !sku) {
    problems.push(problem('PRODUCT_IDENTIFIER_REQUIRED', 'missing'))
  }

  const pageNumber = positiveInteger(pageNumberText)
  if (!pageNumberText) {
    problems.push(problem('PAGE_NUMBER_REQUIRED', 'missing'))
  } else if (pageNumber === null) {
    problems.push(problem('PAGE_NUMBER_INVALID', 'invalid'))
  }

  const rowNumber = positiveInteger(rowNumberText)
  if (!rowNumberText) {
    problems.push(problem('ROW_NUMBER_REQUIRED', 'missing'))
  } else if (rowNumber === null) {
    problems.push(problem('ROW_NUMBER_INVALID', 'invalid'))
  }

  const cases = nonNegativeNumber(casesText)
  if (!casesText) {
    problems.push(problem('CASES_REQUIRED', 'missing'))
  } else if (cases === null) {
    problems.push(problem('CASES_INVALID', 'invalid'))
  }

  const units = nonNegativeNumber(unitsText)
  if (!unitsText) {
    problems.push(problem('UNITS_REQUIRED', 'missing'))
  } else if (units === null) {
    problems.push(problem('UNITS_INVALID', 'invalid'))
  }

  if (
    problems.length > 0 ||
    pageNumber === null ||
    rowNumber === null ||
    cases === null ||
    units === null
  ) {
    return {
      isReady: false,
      input: null,
      problems,
      summary: readinessSummary(problems),
    }
  }

  return {
    isReady: true,
    input: {
      ...(draft.sourceDocumentRef ? { sourceDocumentRef: draft.sourceDocumentRef } : {}),
      pageNumber,
      rowNumber,
      rawText,
      ...(productName ? { productName } : {}),
      ...(barcode ? { barcode } : {}),
      ...(sku ? { sku } : {}),
      cases,
      units,
    },
    problems: [],
    summary: readinessSummary([]),
  }
}
