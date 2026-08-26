import {
  createSourceDocumentOrdinals,
  sourceDocumentOrdinalForRow,
} from '@/lib/manual-review/document-ordinal'

const firstDocument = 'doc_7e3ad2d4-0c9b-4d6e-a3c1-2f1b8a9c7d6e'
const secondDocument = 'doc_01234567-89ab-4def-8123-456789abcdef'

describe('manual-review source document ordinals', () => {
  it('creates stable request-local positions for distinct opaque documents', () => {
    const rows = [
      { sourceDocumentRef: firstDocument },
      { sourceDocumentRef: secondDocument },
      { sourceDocumentRef: firstDocument },
      {},
    ]

    const ordinals = createSourceDocumentOrdinals(rows)

    expect([...ordinals.entries()]).toEqual([
      [firstDocument, 1],
      [secondDocument, 2],
    ])
    expect(sourceDocumentOrdinalForRow(rows[0], ordinals)).toBe(1)
    expect(sourceDocumentOrdinalForRow(rows[1], ordinals)).toBe(2)
    expect(sourceDocumentOrdinalForRow(rows[3], ordinals)).toBeUndefined()
  })

  it('does not create an ordinal for a blank direct-manual reference', () => {
    const row = { sourceDocumentRef: '   ' }
    const ordinals = createSourceDocumentOrdinals([row])

    expect([...ordinals.entries()]).toEqual([])
    expect(sourceDocumentOrdinalForRow(row, ordinals)).toBeUndefined()
  })
})
