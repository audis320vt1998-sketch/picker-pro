import type { DocumentPreflightRow } from '@/lib/document-intake'
import {
  consumeOcrManualReviewHandoff,
  createOcrManualReviewHandoff,
  OCR_MANUAL_REVIEW_HANDOFF_STORAGE_KEY,
  saveOcrManualReviewHandoff,
  toManualReviewOcrDraft,
  type OcrManualReviewHandoffCandidate,
  type SessionStorageLike,
} from '@/lib/manual-review/ocr-handoff'

const SOURCE_DOCUMENT_REF = 'doc_01234567-89ab-4def-8123-456789abcdef'

class MemoryStorage implements SessionStorageLike {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

function preflightRow(
  overrides: Partial<DocumentPreflightRow> = {}
): DocumentPreflightRow {
  return {
    source: {
      pageNumber: 1,
      printedRowNumber: 7,
      parserRowIndex: 3,
    },
    sku: '092100',
    barcode: '0123456789012',
    trayBarcode: '1234567890123',
    productName: 'מוצר לדוגמה',
    sourceQuantities: {
      caseQuantity: 2,
      unitsPerCase: 12,
      totalUnits: 24,
    },
    traceText: 'טקסט OCR מלא שעלול להכיל פרטי מסמך וכמויות 2 12 24',
    confidence: 82,
    boundingBox: { x0: 1, y0: 2, x1: 3, y1: 4 },
    issues: [],
    ...overrides,
  }
}

function handoffCandidate(
  row: DocumentPreflightRow,
  sourceDocumentRef = SOURCE_DOCUMENT_REF
): OcrManualReviewHandoffCandidate {
  return { row, sourceDocumentRef }
}

describe('OCR manual-review handoff', () => {
  it('keeps only traceable selected rows and excludes document OCR text and files', () => {
    const valid = preflightRow()
    const noPrintedRow = preflightRow({
      source: { pageNumber: 1, printedRowNumber: null, parserRowIndex: 4 },
    })

    const handoff = createOcrManualReviewHandoff(
      [handoffCandidate(valid), handoffCandidate(noPrintedRow)],
      1000
    )

    expect(handoff).toEqual({
      kind: 'OCR_MANUAL_REVIEW_HANDOFF_V1',
      createdAtMs: 1000,
      rows: [
        expect.objectContaining({
          source: {
            sourceDocumentRef: SOURCE_DOCUMENT_REF,
            pageNumber: 1,
            printedRowNumber: 7,
            parserRowIndex: 3,
          },
          barcode: '0123456789012',
        }),
      ],
    })
    const serialized = JSON.stringify(handoff)
    expect(serialized).not.toContain('טקסט OCR מלא')
    expect(serialized).not.toContain('traceText')
    expect(serialized).not.toContain('sourceFileName')
    expect(serialized).not.toContain('"cases"')
    expect(serialized).not.toContain('"units"')
  })

  it('consumes the session handoff once and leaves manual quantities empty', () => {
    const storage = new MemoryStorage()
    const handoff = createOcrManualReviewHandoff([handoffCandidate(preflightRow())], 1000)
    expect(handoff).not.toBeNull()
    saveOcrManualReviewHandoff(storage, handoff!)

    const consumed = consumeOcrManualReviewHandoff(storage, 1001)

    expect(storage.getItem(OCR_MANUAL_REVIEW_HANDOFF_STORAGE_KEY)).toBeNull()
    expect(consumeOcrManualReviewHandoff(storage, 1002)).toBeNull()
    const draft = toManualReviewOcrDraft(consumed!.rows[0])
    expect(draft).toMatchObject({
      sourceDocumentRef: SOURCE_DOCUMENT_REF,
      pageNumber: 1,
      rowNumber: 7,
      barcode: '0123456789012',
      sourceQuantities: { caseQuantity: 2, unitsPerCase: 12, totalUnits: 24 },
    })
    expect(draft).not.toHaveProperty('cases')
    expect(draft).not.toHaveProperty('units')
    expect(draft.rawText).not.toContain('2 12 24')
  })

  it('clears malformed and expired session data before it can be reused', () => {
    const storage = new MemoryStorage()
    storage.setItem(OCR_MANUAL_REVIEW_HANDOFF_STORAGE_KEY, '{not-json')
    expect(consumeOcrManualReviewHandoff(storage, 2000)).toBeNull()
    expect(storage.getItem(OCR_MANUAL_REVIEW_HANDOFF_STORAGE_KEY)).toBeNull()

    const expired = createOcrManualReviewHandoff([handoffCandidate(preflightRow())], 1000)
    saveOcrManualReviewHandoff(storage, expired!)
    expect(consumeOcrManualReviewHandoff(storage, 1000 + 15 * 60 * 1000 + 1)).toBeNull()
    expect(storage.getItem(OCR_MANUAL_REVIEW_HANDOFF_STORAGE_KEY)).toBeNull()
  })

  it('rejects a handoff candidate without an opaque source document reference', () => {
    const handoff = createOcrManualReviewHandoff([
      handoffCandidate(preflightRow(), 'customer-private-order.jpg'),
    ])

    expect(handoff).toBeNull()
  })
})
