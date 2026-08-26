import { findDuplicateSourceRows } from '@/lib/manual-review/source-duplicate'

const firstDocument = 'doc_01234567-89ab-4def-8123-456789abcdef'
const secondDocument = 'doc_fedcba98-7654-4321-8fed-cba987654321'

describe('manual-review source duplicate guard', () => {
  it('finds a repeated opaque document, page, and source-row combination', () => {
    expect(
      findDuplicateSourceRows([
        { sourceDocumentRef: firstDocument, pageNumber: 1, rowNumber: 4 },
        { sourceDocumentRef: firstDocument, pageNumber: 1, rowNumber: 4 },
      ])
    ).toEqual([{ firstInputIndex: 0, duplicateInputIndex: 1 }])
  })

  it('allows the same printed page and row on two distinct source documents', () => {
    expect(
      findDuplicateSourceRows([
        { sourceDocumentRef: firstDocument, pageNumber: 1, rowNumber: 4 },
        { sourceDocumentRef: secondDocument, pageNumber: 1, rowNumber: 4 },
      ])
    ).toEqual([])
  })

  it('allows different rows or pages on one source document', () => {
    expect(
      findDuplicateSourceRows([
        { sourceDocumentRef: firstDocument, pageNumber: 1, rowNumber: 4 },
        { sourceDocumentRef: firstDocument, pageNumber: 1, rowNumber: 5 },
        { sourceDocumentRef: firstDocument, pageNumber: 2, rowNumber: 4 },
      ])
    ).toEqual([])
  })

  it('does not invent a document identity for direct manual rows', () => {
    expect(
      findDuplicateSourceRows([
        { pageNumber: 1, rowNumber: 4 },
        { pageNumber: 1, rowNumber: 4 },
      ])
    ).toEqual([])
  })
})
