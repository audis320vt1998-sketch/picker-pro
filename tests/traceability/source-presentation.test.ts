import {
  sourceReferencePresentation,
  sourceReferencePresentations,
} from '@/lib/traceability/source-presentation'

describe('source traceability presentation', () => {
  it('renders only the page and row for a valid source', () => {
    const presentation = sourceReferencePresentation({
      page: {
        jobId: 'manual-review-private-id',
        pageId: 'opaque-document-reference',
        pageNumber: 3,
      },
      row: {
        rowId: 'private-row-id',
        rowNumber: 8,
        rawText: 'private source text',
      },
    })

    expect(presentation).toEqual({
      pageNumber: 3,
      rowNumber: 8,
      label: 'עמוד 3, שורה 8',
    })
    expect(JSON.stringify(presentation)).not.toContain('private')
    expect(JSON.stringify(presentation)).not.toContain('opaque-document-reference')
  })

  it('preserves duplicate-looking references instead of assuming one document', () => {
    const sources = [
      {
        page: { jobId: 'review-a', pageNumber: 1 },
        row: { rowNumber: 2 },
      },
      {
        page: { jobId: 'review-b', pageNumber: 1 },
        row: { rowNumber: 2 },
      },
    ]

    expect(sourceReferencePresentations(sources)).toEqual([
      { pageNumber: 1, rowNumber: 2, label: 'עמוד 1, שורה 2' },
      { pageNumber: 1, rowNumber: 2, label: 'עמוד 1, שורה 2' },
    ])
  })

  it('does not present malformed source locations', () => {
    expect(
      sourceReferencePresentation({
        page: { jobId: 'review-a', pageNumber: 0 },
        row: { rowNumber: 2 },
      })
    ).toBeNull()
    expect(
      sourceReferencePresentations([
        {
          page: { jobId: 'review-a', pageNumber: 2 },
          row: { rowNumber: 0 },
        },
      ])
    ).toEqual([])
  })
})
