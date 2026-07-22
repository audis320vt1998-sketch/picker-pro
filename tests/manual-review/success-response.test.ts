import { manualReviewResultFromResponse } from '@/lib/manual-review/success-response'

const REVIEW_ID = 'manual-review-123e4567-e89b-42d3-a456-426614174000'

function validResponse() {
  return {
    reviewId: REVIEW_ID,
    catalog: {
      version: '1.3.0',
      totalProducts: 124,
      verifiedProducts: 124,
      unverifiedProducts: 0,
      privateCatalogField: 'do-not-retain',
    },
    totals: [
      {
        product: {
          productKey: 'product-1',
          barcode: '7290000000001',
          sku: 'SKU-1',
          name: 'פריט בדיקה',
          resolvedBy: 'barcode',
          privateProductField: 'do-not-retain',
        },
        cases: {
          value: 1,
          sources: [
            {
              page: {
                jobId: 'server-private-review-id',
                pageNumber: 2,
                pageId: 'private-page-id',
              },
              row: {
                rowNumber: 5,
                rowId: 'private-row-id',
                rawText: 'private customer order text',
              },
            },
          ],
        },
        units: {
          value: 3,
          sources: [
            {
              page: {
                jobId: 'server-private-review-id',
                pageNumber: 2,
              },
              row: { rowNumber: 5 },
            },
          ],
        },
      },
    ],
    issues: [
      {
        code: 'UNITS_AT_OR_ABOVE_CASE_SIZE',
        message: 'untrusted server message',
        severity: 'warn',
        stage: 'row',
        source: {
          page: { jobId: 'server-private-review-id', pageNumber: 2 },
          row: { rowNumber: 5, rawText: 'private source text' },
        },
        productKey: 'product-1',
      },
    ],
    acceptedRowCount: 1,
    totalRowCount: 1,
    privateResponseField: 'do-not-retain',
  }
}

describe('manualReviewResultFromResponse', () => {
  it('whitelists safe result fields and source locations', () => {
    const result = manualReviewResultFromResponse(validResponse(), 1)

    expect(result).toEqual({
      reviewId: 'manual-review',
      catalog: {
        version: '1.3.0',
        totalProducts: 124,
        verifiedProducts: 124,
        unverifiedProducts: 0,
      },
      totals: [
        {
          product: {
            productKey: 'product-1',
            barcode: '7290000000001',
            sku: 'SKU-1',
            name: 'פריט בדיקה',
            resolvedBy: 'barcode',
          },
          cases: {
            value: 1,
            sources: [
              {
                page: { jobId: 'manual-review', pageNumber: 2 },
                row: { rowNumber: 5 },
              },
            ],
          },
          units: {
            value: 3,
            sources: [
              {
                page: { jobId: 'manual-review', pageNumber: 2 },
                row: { rowNumber: 5 },
              },
            ],
          },
        },
      ],
      issues: [
        {
          code: 'UNITS_AT_OR_ABOVE_CASE_SIZE',
          message: '',
          severity: 'warn',
          stage: 'row',
          source: {
            page: { jobId: 'manual-review', pageNumber: 2 },
            row: { rowNumber: 5 },
          },
        },
      ],
      acceptedRowCount: 1,
      totalRowCount: 1,
    })

    const serialized = JSON.stringify(result)
    expect(serialized).not.toContain('private')
    expect(serialized).not.toContain('untrusted server message')
  })

  it('rejects malformed nested totals and source locations', () => {
    const malformedTotal = validResponse()
    malformedTotal.totals[0].cases.value = '1' as never
    expect(manualReviewResultFromResponse(malformedTotal, 1)).toBeNull()

    const malformedSource = validResponse()
    malformedSource.totals[0].units.sources[0].row.rowNumber = 0
    expect(manualReviewResultFromResponse(malformedSource, 1)).toBeNull()
  })

  it('rejects contradictory counts and catalog summaries', () => {
    const wrongExpectedCount = validResponse()
    expect(manualReviewResultFromResponse(wrongExpectedCount, 2)).toBeNull()

    const tooManyAccepted = validResponse()
    tooManyAccepted.acceptedRowCount = 2
    expect(manualReviewResultFromResponse(tooManyAccepted, 1)).toBeNull()

    const contradictoryCatalog = validResponse()
    contradictoryCatalog.catalog.verifiedProducts = 123
    expect(manualReviewResultFromResponse(contradictoryCatalog, 1)).toBeNull()
  })

  it('rejects unknown or semantically invalid issue data', () => {
    const unknownIssue = validResponse()
    unknownIssue.issues[0].code = 'UPSTREAM_PRIVATE_SENTINEL'
    expect(manualReviewResultFromResponse(unknownIssue, 1)).toBeNull()

    const invalidIssueShape = validResponse()
    invalidIssueShape.issues[0].severity = 'fail'
    expect(manualReviewResultFromResponse(invalidIssueShape, 1)).toBeNull()
  })
})
