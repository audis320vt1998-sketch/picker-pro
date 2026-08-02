import {
  createOcrPreflightPageNavigation,
  getAdjacentOcrPreflightPageNavigationEntry,
  pageNavigationRequiresAttention,
  resolveOcrPreflightPageNavigationEntry,
} from '@/lib/document-intake/page-review-navigation'

const confirmed = {
  kind: 'CONFIRMED' as const,
  routeCode: '12',
  selectedRowCount: 1,
}

describe('OCR preflight page review navigation', () => {
  it('builds an ordered, page-level navigator from review, failure, and replacement states', () => {
    expect(
      createOcrPreflightPageNavigation({
        reviewedPages: [
          {
            pageNumber: 3,
            sourceDocumentRef: 'doc-three',
            reviewState: confirmed,
            lowConfidenceRowCount: 1,
          },
          {
            pageNumber: 1,
            sourceDocumentRef: 'doc-one',
            reviewState: { kind: 'ROWS_REQUIRED', selectedRowCount: 0 },
            lowConfidenceRowCount: 0,
          },
        ],
        failedPages: [{ pageNumber: 2, sourceDocumentRef: 'doc-two' }],
        replacementPages: [{ pageNumber: 4, sourceDocumentRef: 'doc-four' }],
      })
    ).toEqual([
      {
        pageNumber: 1,
        sourceDocumentRef: 'doc-one',
        status: 'ROWS_REQUIRED',
        lowConfidenceRowCount: 0,
      },
      {
        pageNumber: 2,
        sourceDocumentRef: 'doc-two',
        status: 'OCR_FAILED',
        lowConfidenceRowCount: 0,
      },
      {
        pageNumber: 3,
        sourceDocumentRef: 'doc-three',
        status: 'CONFIRMED',
        lowConfidenceRowCount: 1,
      },
      {
        pageNumber: 4,
        sourceDocumentRef: 'doc-four',
        status: 'REPLACEMENT_PENDING',
        lowConfidenceRowCount: 0,
      },
    ])
  })

  it('prioritizes a replacement, then a failed OCR page, when no active page remains', () => {
    const entries = createOcrPreflightPageNavigation({
      reviewedPages: [
        {
          pageNumber: 1,
          sourceDocumentRef: 'doc-one',
          reviewState: { kind: 'ROUTE_REQUIRED', selectedRowCount: 1 },
          lowConfidenceRowCount: 0,
        },
      ],
      failedPages: [{ pageNumber: 2, sourceDocumentRef: 'doc-two' }],
      replacementPages: [{ pageNumber: 3, sourceDocumentRef: 'doc-three' }],
    })

    expect(resolveOcrPreflightPageNavigationEntry(entries, null)).toMatchObject({
      sourceDocumentRef: 'doc-three',
      status: 'REPLACEMENT_PENDING',
    })
    expect(
      resolveOcrPreflightPageNavigationEntry(entries, 'doc-one')
    ).toMatchObject({ sourceDocumentRef: 'doc-one' })
  })

  it('deduplicates a source page and lets a pending replacement win over an older draft', () => {
    const entries = createOcrPreflightPageNavigation({
      reviewedPages: [
        {
          pageNumber: 2,
          sourceDocumentRef: 'doc-two',
          reviewState: confirmed,
          lowConfidenceRowCount: 0,
        },
      ],
      failedPages: [{ pageNumber: 2, sourceDocumentRef: 'doc-two' }],
      replacementPages: [{ pageNumber: 2, sourceDocumentRef: 'doc-two' }],
    })

    expect(entries).toEqual([
      {
        pageNumber: 2,
        sourceDocumentRef: 'doc-two',
        status: 'REPLACEMENT_PENDING',
        lowConfidenceRowCount: 0,
      },
    ])
  })

  it('keeps low-confidence confirmed pages in the attention queue and respects bounds', () => {
    const entries = createOcrPreflightPageNavigation({
      reviewedPages: [
        {
          pageNumber: 1,
          sourceDocumentRef: 'doc-one',
          reviewState: confirmed,
          lowConfidenceRowCount: 1,
        },
        {
          pageNumber: 2,
          sourceDocumentRef: 'doc-two',
          reviewState: confirmed,
          lowConfidenceRowCount: 0,
        },
      ],
      failedPages: [],
      replacementPages: [],
    })

    expect(pageNavigationRequiresAttention(entries[0])).toBe(true)
    expect(pageNavigationRequiresAttention(entries[1])).toBe(false)
    expect(
      getAdjacentOcrPreflightPageNavigationEntry(entries, 'doc-one', 'previous')
    ).toBeNull()
    expect(
      getAdjacentOcrPreflightPageNavigationEntry(entries, 'doc-one', 'next')
    ).toMatchObject({ sourceDocumentRef: 'doc-two' })
    expect(
      getAdjacentOcrPreflightPageNavigationEntry(entries, 'doc-two', 'next')
    ).toBeNull()
  })
})
