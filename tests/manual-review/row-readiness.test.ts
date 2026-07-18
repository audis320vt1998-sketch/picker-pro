import {
  getManualReviewRowReadiness,
  type ManualReviewRowDraft,
} from '@/lib/manual-review/row-readiness'

function draft(overrides: Partial<ManualReviewRowDraft> = {}): ManualReviewRowDraft {
  return {
    sourceDocumentRef: 'doc_7e3ad2d4-0c9b-4d6e-a3c1-2f1b8a9c7d6e',
    pageNumber: '1',
    rowNumber: '2',
    rawText: '92100 7290020531025 1 10 10',
    productName: '',
    barcode: '7290020531025',
    sku: '92100',
    cases: '1',
    units: '0',
    ...overrides,
  }
}

describe('manual-review row readiness', () => {
  it('keeps an imported OCR row incomplete until cases and units are entered', () => {
    const readiness = getManualReviewRowReadiness(
      draft({ cases: '', units: '' })
    )

    expect(readiness.isReady).toBe(false)
    expect(readiness.input).toBeNull()
    expect(readiness.problems.map((item) => item.code)).toEqual([
      'CASES_REQUIRED',
      'UNITS_REQUIRED',
    ])
    expect(readiness.summary).toBe('חסרים: מארזים, בודדים')
  })

  it('accepts explicit zero quantities without converting them', () => {
    const readiness = getManualReviewRowReadiness(
      draft({ cases: '0', units: '0' })
    )

    expect(readiness).toMatchObject({
      isReady: true,
      summary: 'מוכן לבדיקה',
      input: {
        pageNumber: 1,
        rowNumber: 2,
        cases: 0,
        units: 0,
      },
    })
  })

  it('requires one explicit product identifier', () => {
    const readiness = getManualReviewRowReadiness(
      draft({ barcode: '', sku: '', productName: '' })
    )

    expect(readiness.problems.map((item) => item.code)).toEqual([
      'PRODUCT_IDENTIFIER_REQUIRED',
    ])
  })

  it('reports missing and invalid page, row, and quantity fields', () => {
    const readiness = getManualReviewRowReadiness(
      draft({
        pageNumber: '',
        rowNumber: '1.5',
        cases: '-1',
        units: 'not-a-number',
      })
    )

    expect(readiness.problems.map((item) => item.code)).toEqual([
      'PAGE_NUMBER_REQUIRED',
      'ROW_NUMBER_INVALID',
      'CASES_INVALID',
      'UNITS_INVALID',
    ])
    expect(readiness.summary).toBe(
      'לתיקון: מספר עמוד, מספר שורה, מארזים, בודדים'
    )
  })
})
