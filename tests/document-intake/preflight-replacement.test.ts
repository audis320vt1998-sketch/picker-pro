import {
  removeOcrPreflightPageRowSelections,
  removeOcrPreflightReplacementSlot,
  upsertOcrPreflightReplacementSlot,
} from '@/lib/document-intake/preflight-replacement'

const firstSourceDocumentRef = 'doc_01234567-89ab-4def-8123-456789abcdef'
const secondSourceDocumentRef = 'doc_fedcba98-7654-4cde-8123-456789abcdef'

describe('OCR preflight source replacement helpers', () => {
  it('keeps one pending replacement per opaque source reference in page order', () => {
    const slots = upsertOcrPreflightReplacementSlot(
      [
        {
          pageNumber: 2,
          sourceDocumentRef: secondSourceDocumentRef,
        },
      ],
      {
        pageNumber: 1,
        sourceDocumentRef: firstSourceDocumentRef,
      }
    )

    expect(slots).toEqual([
      {
        pageNumber: 1,
        sourceDocumentRef: firstSourceDocumentRef,
      },
      {
        pageNumber: 2,
        sourceDocumentRef: secondSourceDocumentRef,
      },
    ])

    expect(
      upsertOcrPreflightReplacementSlot(slots, {
        pageNumber: 2,
        sourceDocumentRef: secondSourceDocumentRef,
      })
    ).toHaveLength(2)

    expect(
      upsertOcrPreflightReplacementSlot(slots, {
        pageNumber: 2,
        sourceDocumentRef: 'doc_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      })
    ).toEqual([
      {
        pageNumber: 1,
        sourceDocumentRef: firstSourceDocumentRef,
      },
      {
        pageNumber: 2,
        sourceDocumentRef: 'doc_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      },
    ])
  })

  it('removes only the replaced page slot and its selected OCR row keys', () => {
    expect(
      removeOcrPreflightReplacementSlot(
        [
          { pageNumber: 1, sourceDocumentRef: firstSourceDocumentRef },
          { pageNumber: 2, sourceDocumentRef: secondSourceDocumentRef },
        ],
        secondSourceDocumentRef
      )
    ).toEqual([{ pageNumber: 1, sourceDocumentRef: firstSourceDocumentRef }])

    const selectedRowKeys = {
      '1:2': true,
      '2:3': true,
      '2:4': false,
      '20:1': true,
    }
    const remainingSelections = removeOcrPreflightPageRowSelections(
      selectedRowKeys,
      2
    )

    expect(remainingSelections).toEqual({
      '1:2': true,
      '20:1': true,
    })
    expect(remainingSelections).not.toBe(selectedRowKeys)
    expect(selectedRowKeys).toEqual({
      '1:2': true,
      '2:3': true,
      '2:4': false,
      '20:1': true,
    })
  })
})
