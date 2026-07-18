const MANUAL_REVIEW_API_FAILURE_CODES = [
  'INVALID_MANUAL_REVIEW_INPUT',
  'CATALOG_UNAVAILABLE',
] as const

export type ManualReviewApiFailureCode =
  (typeof MANUAL_REVIEW_API_FAILURE_CODES)[number]

/**
 * UNKNOWN intentionally does not preserve any response text. The client uses
 * it for network, malformed, and unrecognized responses so an API error can
 * never become user-visible document data.
 */
export type ManualReviewFailureCode = ManualReviewApiFailureCode | 'UNKNOWN'

export interface ManualReviewDuplicateSourceError {
  row: number
  duplicateOfRow: number
}

export interface ManualReviewIssuePresentation {
  label: string
  message: string
}

const MANUAL_REVIEW_ISSUE_PRESENTATIONS: Record<
  string,
  ManualReviewIssuePresentation
> = {
  TRACEABILITY_MISSING: {
    label: 'מקור חסר',
    message: 'חסרים פרטי עמוד או שורת מקור.',
  },
  INVALID_QUANTITY: {
    label: 'כמות לא תקינה',
    message: 'הכמויות אינן תקינות לבדיקה.',
  },
  PRODUCT_UNRESOLVED: {
    label: 'פריט לא זוהה',
    message: 'לא נמצאה התאמה בקטלוג המאומת.',
  },
  PRODUCT_CONFLICT: {
    label: 'התאמה סותרת',
    message: 'מזהי הפריט מצביעים על יותר ממוצר אחד.',
  },
  PRODUCT_UNVERIFIED: {
    label: 'פריט לא מאומת',
    message: 'הפריט אינו מאומת לשימוש תפעולי.',
  },
  UNIT_TYPE_ENFORCEMENT: {
    label: 'ליקוט בודדים לא מאושר',
    message: 'הקטלוג אינו מאפשר ליקוט בודדים עבור פריט זה.',
  },
  ZERO_TOTAL: {
    label: 'כמות אפס',
    message: 'השורה כוללת אפס מארזים ואפס בודדים.',
  },
}

const UNKNOWN_MANUAL_REVIEW_ISSUE: ManualReviewIssuePresentation = {
  label: 'בדיקה נדרשת',
  message: 'התקבלה תוצאה שאינה מוכרת. יש לבדוק את השורה מול המקור.',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isManualReviewApiFailureCode(
  value: unknown
): value is ManualReviewApiFailureCode {
  return (
    typeof value === 'string' &&
    MANUAL_REVIEW_API_FAILURE_CODES.includes(value as ManualReviewApiFailureCode)
  )
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

/**
 * Whitelists only an expected failure code; it never reads an API `error` or
 * `message` field.
 */
export function manualReviewFailureCodeFromResponse(
  value: unknown,
  status?: number
): ManualReviewFailureCode {
  if (!isRecord(value) || !isManualReviewApiFailureCode(value.code)) {
    return 'UNKNOWN'
  }

  if (
    status !== undefined &&
    ((value.code === 'INVALID_MANUAL_REVIEW_INPUT' && status !== 400) ||
      (value.code === 'CATALOG_UNAVAILABLE' && status !== 503))
  ) {
    return 'UNKNOWN'
  }

  return value.code
}

/**
 * Duplicate source rows are the sole structured error the form renders. Only
 * validated form-row positions are retained; no source-document value,
 * filename, API message, or arbitrary detail is surfaced.
 */
export function manualReviewDuplicateSourceErrorFromResponse(
  value: unknown,
  totalRowCount: number,
  status: number
): ManualReviewDuplicateSourceError | null {
  if (
    status !== 400 ||
    !isRecord(value) ||
    value.code !== 'INVALID_MANUAL_REVIEW_INPUT' ||
    !Number.isInteger(totalRowCount) ||
    totalRowCount < 1 ||
    !Array.isArray(value.details)
  ) {
    return null
  }

  for (const detail of value.details) {
    if (
      isRecord(detail) &&
      detail.code === 'DUPLICATE_SOURCE_ROW' &&
      isPositiveInteger(detail.row) &&
      isPositiveInteger(detail.duplicateOfRow) &&
      detail.row <= totalRowCount &&
      detail.duplicateOfRow <= totalRowCount &&
      detail.row !== detail.duplicateOfRow
    ) {
      return { row: detail.row, duplicateOfRow: detail.duplicateOfRow }
    }
  }

  return null
}

/**
 * Success-result issue messages are server implementation details. The UI
 * renders this fixed presentation instead, so a malformed response cannot
 * surface arbitrary server text in the review workspace.
 */
export function manualReviewIssuePresentation(
  code: unknown
): ManualReviewIssuePresentation {
  return (
    (typeof code === 'string' && MANUAL_REVIEW_ISSUE_PRESENTATIONS[code]) ||
    UNKNOWN_MANUAL_REVIEW_ISSUE
  )
}
