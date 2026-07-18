import type { DocumentPreflightPage } from '@/lib/document-intake'
import {
  createOcrPreflightBatchPage,
  createOcrSourceDocumentRef,
  isOcrSourceDocumentRef,
  reassignPreflightPageNumber,
  upsertOcrPreflightBatchPage,
} from '@/lib/document-intake/preflight-batch'

const sourceDocumentRef = 'doc_01234567-89ab-4def-8123-456789abcdef'

function preflightPage(): DocumentPreflightPage {
  return {
    pageNumber: 1,
    rows: [
      {
        source: {
          pageNumber: 1,
          printedRowNumber: 4,
          parserRowIndex: 4,
        },
        sku: '92100',
        barcode: '7290020531025',
        trayBarcode: null,
        productName: null,
        sourceQuantities: {
          caseQuantity: 1,
          unitsPerCase: 10,
          totalUnits: 10,
        },
        traceText: 'sensitive OCR trace stays in the preflight page only',
        confidence: 91,
        boundingBox: { x0: 1, y0: 2, x1: 3, y1: 4 },
        issues: [],
      },
    ],
    issues: [],
  }
}

describe('browser OCR preflight batch helpers', () => {
  it('creates an opaque UUID v4 source reference from browser random bytes', () => {
    const ref = createOcrSourceDocumentRef(
      Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
    )

    expect(ref).toBe('doc_00010203-0405-4607-8809-0a0b0c0d0e0f')
    expect(isOcrSourceDocumentRef(ref)).toBe(true)
    expect(isOcrSourceDocumentRef('customer-private-order.jpg')).toBe(false)
  })

  it('reassigns a one-image response to its batch page without mutating the source', () => {
    const original = preflightPage()

    const repaged = reassignPreflightPageNumber(original, 3)

    expect(repaged).toMatchObject({
      pageNumber: 3,
      rows: [
        {
          source: { pageNumber: 3, printedRowNumber: 4 },
        },
      ],
    })
    expect(original.rows[0].source.pageNumber).toBe(1)
  })

  it('keeps an opaque source identity beside a repaged result', () => {
    const batchPage = createOcrPreflightBatchPage(
      preflightPage(),
      2,
      sourceDocumentRef
    )

    expect(batchPage).toMatchObject({
      sourceDocumentRef,
      page: {
        pageNumber: 2,
        rows: [{ source: { pageNumber: 2 } }],
      },
    })
  })

  it('rejects a non-opaque source document reference', () => {
    expect(() =>
      createOcrPreflightBatchPage(preflightPage(), 1, 'customer-private-order.jpg')
    ).toThrow('source document reference')
  })

  it('replaces a retried source page and keeps selected page order', () => {
    const firstRef = 'doc_fedcba98-7654-4cde-8123-456789abcdef'
    const firstPage = createOcrPreflightBatchPage(preflightPage(), 1, firstRef)
    const originalSecond = createOcrPreflightBatchPage(
      preflightPage(),
      2,
      sourceDocumentRef
    )
    const retriedSecond = createOcrPreflightBatchPage(
      preflightPage(),
      2,
      sourceDocumentRef
    )

    const pages = upsertOcrPreflightBatchPage(
      [originalSecond, firstPage],
      retriedSecond
    )

    expect(pages).toEqual([firstPage, retriedSecond])
    expect(pages[1]).toBe(retriedSecond)
  })
})
