import {
  lowConfidenceFieldIssues,
  OCR_FIELD_CONFIDENCE_REVIEW_THRESHOLD,
  type MaayanFieldConfidences,
} from '@/lib/document-intake'

function fieldConfidences(
  overrides: Partial<MaayanFieldConfidences> = {}
): MaayanFieldConfidences {
  return {
    printedRowNumber: 90,
    sku: 90,
    barcode: 90,
    productName: 90,
    caseQuantity: 90,
    unitsPerCase: 90,
    totalUnits: 90,
    ...overrides,
  }
}

describe('lowConfidenceFieldIssues', () => {
  it('flags only a present field below the review threshold', () => {
    const issues = lowConfidenceFieldIssues(
      fieldConfidences({
        sku: OCR_FIELD_CONFIDENCE_REVIEW_THRESHOLD - 1,
        barcode: OCR_FIELD_CONFIDENCE_REVIEW_THRESHOLD,
        productName: null,
      })
    )

    expect(issues).toEqual([
      expect.objectContaining({ code: 'LOW_FIELD_CONFIDENCE', field: 'sku' }),
    ])
  })

  it('does not invent a confidence issue for a missing field', () => {
    expect(
      lowConfidenceFieldIssues(fieldConfidences({ totalUnits: null }))
    ).toEqual([])
  })
})
