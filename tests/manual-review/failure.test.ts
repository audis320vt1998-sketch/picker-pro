import {
  isManualReviewIssueCode,
  manualReviewDuplicateSourceErrorFromResponse,
  manualReviewFailureCodeFromResponse,
  manualReviewIssuePresentation,
} from '@/lib/manual-review/failure'

describe('manual-review client failure boundary', () => {
  it('retains only documented failure codes', () => {
    expect(
      manualReviewFailureCodeFromResponse({
        code: 'INVALID_MANUAL_REVIEW_INPUT',
        error: 'customer-private-order.jpg',
      }, 400)
    ).toBe('INVALID_MANUAL_REVIEW_INPUT')
    expect(
      manualReviewFailureCodeFromResponse({
        code: 'UNTRUSTED_SERVER_FAILURE',
        error: 'customer-private-order.jpg',
      }, 503)
    ).toBe('UNKNOWN')
    expect(
      manualReviewFailureCodeFromResponse(
        { code: 'CATALOG_UNAVAILABLE' },
        400
      )
    ).toBe('UNKNOWN')
  })

  it('accepts only row positions from a duplicate-source detail', () => {
    expect(
      manualReviewDuplicateSourceErrorFromResponse({
        code: 'INVALID_MANUAL_REVIEW_INPUT',
        details: [
          {
            code: 'DUPLICATE_SOURCE_ROW',
            row: 3,
            duplicateOfRow: 1,
            sourceDocumentRef: 'customer-private-order.jpg',
            message: 'untrusted error text',
          },
        ],
      }, 3, 400)
    ).toEqual({ row: 3, duplicateOfRow: 1 })
    expect(
      manualReviewDuplicateSourceErrorFromResponse({
        code: 'INVALID_MANUAL_REVIEW_INPUT',
        details: [
          { code: 'DUPLICATE_SOURCE_ROW', row: '3', duplicateOfRow: 1 },
        ],
      }, 3, 400)
    ).toBeNull()
    expect(
      manualReviewDuplicateSourceErrorFromResponse(
        {
          code: 'INVALID_MANUAL_REVIEW_INPUT',
          details: [{ code: 'DUPLICATE_SOURCE_ROW', row: 3, duplicateOfRow: 1 }],
        },
        2,
        400
      )
    ).toBeNull()
    expect(
      manualReviewDuplicateSourceErrorFromResponse(
        {
          code: 'UNTRUSTED_SERVER_FAILURE',
          details: [{ code: 'DUPLICATE_SOURCE_ROW', row: 2, duplicateOfRow: 1 }],
        },
        2,
        400
      )
    ).toBeNull()
    expect(
      manualReviewDuplicateSourceErrorFromResponse(
        {
          code: 'INVALID_MANUAL_REVIEW_INPUT',
          details: [{ code: 'DUPLICATE_SOURCE_ROW', row: 2, duplicateOfRow: 1 }],
        },
        2,
        503
      )
    ).toBeNull()
  })

  it('maps review issue display text without using API messages', () => {
    expect(isManualReviewIssueCode('UNITS_AT_OR_ABOVE_CASE_SIZE')).toBe(true)
    expect(isManualReviewIssueCode('UPSTREAM_PRIVATE_SENTINEL')).toBe(false)
    expect(manualReviewIssuePresentation('PRODUCT_UNVERIFIED')).toEqual({
      label: 'פריט לא מאומת',
      message: 'הפריט אינו מאומת לשימוש תפעולי.',
    })
    expect(
      manualReviewIssuePresentation('UNITS_AT_OR_ABOVE_CASE_SIZE')
    ).toEqual({
      label: 'בודדים בגודל מארז או יותר',
      message:
        'כמות הבודדים שווה לגודל המארז או גדולה ממנו. יש לאשר את הכמות מול המקור.',
    })
    expect(manualReviewIssuePresentation('UPSTREAM_PRIVATE_SENTINEL')).toEqual({
      label: 'בדיקה נדרשת',
      message: 'התקבלה תוצאה שאינה מוכרת. יש לבדוק את השורה מול המקור.',
    })
  })
})
