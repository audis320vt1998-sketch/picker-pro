import type {
  DocumentPreflightPage,
  DocumentPreflightRow,
  OcrPreflightBatchOutcome,
} from '@/lib/document-intake'
import {
  createOcrPreflightBatchOutcome,
  hasLowConfidenceOcrPreflightRow,
  removeOcrPreflightBatchOutcomeSource,
  recordOcrPreflightBatchFailure,
  recordOcrPreflightBatchSuccess,
  shouldFocusCompletedOcrPreflightResult,
  summarizeLowConfidenceOcrPreflightReview,
} from '@/lib/document-intake/preflight-outcome'
import { createOcrPreflightBatchPage } from '@/lib/document-intake/preflight-batch'

const firstSourceDocumentRef = 'doc_01234567-89ab-4def-8123-456789abcdef'
const secondSourceDocumentRef = 'doc_fedcba98-7654-4cde-8123-456789abcdef'

function row(lowConfidenceFields: DocumentPreflightRow['issues'] = []): DocumentPreflightRow {
  return {
    source: { pageNumber: 1, printedRowNumber: 1, parserRowIndex: 1 },
    sku: '92101',
    barcode: '07290020531001',
    trayBarcode: null,
    productName: 'מוצר לדוגמה',
    sourceQuantities: { caseQuantity: 1, unitsPerCase: 10, totalUnits: 10 },
    traceText: 'transient OCR source text',
    confidence: 90,
    fieldConfidences: {
      printedRowNumber: 90,
      sku: 90,
      barcode: 90,
      productName: 90,
      caseQuantity: 90,
      unitsPerCase: 90,
      totalUnits: 90,
    },
    boundingBox: { x0: 1, y0: 2, x1: 3, y1: 4 },
    issues: lowConfidenceFields,
  }
}

function page(rows: readonly DocumentPreflightRow[] = []): DocumentPreflightPage {
  return {
    pageNumber: 1,
    rows,
    issues: [],
  }
}

describe('OCR preflight batch outcome', () => {
  it('moves focus only to a completed outcome that contains a draft or failure', () => {
    const emptyOutcome = createOcrPreflightBatchOutcome()
    const failedOutcome = recordOcrPreflightBatchFailure(emptyOutcome, {
      pageNumber: 1,
      sourceDocumentRef: firstSourceDocumentRef,
      code: 'OCR_PREFLIGHT_UNAVAILABLE',
    })
    const successfulOutcome = recordOcrPreflightBatchSuccess(
      emptyOutcome,
      createOcrPreflightBatchPage(page(), 1, firstSourceDocumentRef)
    )

    expect(shouldFocusCompletedOcrPreflightResult(null, false)).toBe(false)
    expect(shouldFocusCompletedOcrPreflightResult(emptyOutcome, false)).toBe(false)
    expect(shouldFocusCompletedOcrPreflightResult(successfulOutcome, true)).toBe(false)
    expect(shouldFocusCompletedOcrPreflightResult(successfulOutcome, false)).toBe(true)
    expect(shouldFocusCompletedOcrPreflightResult(failedOutcome, false)).toBe(true)
  })

  it('keeps a source image in one outcome and restores it in selected order after retry', () => {
    const firstPage = createOcrPreflightBatchPage(page(), 1, firstSourceDocumentRef)
    const secondPage = createOcrPreflightBatchPage(page(), 2, secondSourceDocumentRef)

    const failedSecond = recordOcrPreflightBatchFailure(
      recordOcrPreflightBatchSuccess(
        createOcrPreflightBatchOutcome(),
        firstPage
      ),
      {
        pageNumber: 2,
        sourceDocumentRef: secondSourceDocumentRef,
        code: 'OCR_PREFLIGHT_UNAVAILABLE',
      }
    )

    const recovered = recordOcrPreflightBatchSuccess(failedSecond, secondPage)

    expect(recovered.failures).toEqual([])
    expect(recovered.pages.map(({ sourceDocumentRef }) => sourceDocumentRef)).toEqual([
      firstSourceDocumentRef,
      secondSourceDocumentRef,
    ])
  })

  it('replaces a repeated failure without duplicating its opaque source reference', () => {
    const firstFailure = recordOcrPreflightBatchFailure(
      createOcrPreflightBatchOutcome(),
      {
        pageNumber: 2,
        sourceDocumentRef: secondSourceDocumentRef,
        code: 'OCR_PREFLIGHT_UNAVAILABLE',
      }
    )

    const repeatedFailure = recordOcrPreflightBatchFailure(firstFailure, {
      pageNumber: 2,
      sourceDocumentRef: secondSourceDocumentRef,
      code: 'OCR_PREFLIGHT_TIMEOUT',
    })

    expect(repeatedFailure.pages).toEqual([])
    expect(repeatedFailure.failures).toEqual([
      {
        pageNumber: 2,
        sourceDocumentRef: secondSourceDocumentRef,
        code: 'OCR_PREFLIGHT_TIMEOUT',
      },
    ])
  })

  it('clears only the old outcome when one selected source image is replaced', () => {
    const firstPage = createOcrPreflightBatchPage(page(), 1, firstSourceDocumentRef)
    const secondPage = createOcrPreflightBatchPage(page(), 2, secondSourceDocumentRef)
    const outcome: OcrPreflightBatchOutcome = {
      pages: [firstPage, secondPage],
      failures: [
        {
          pageNumber: 2,
          sourceDocumentRef: secondSourceDocumentRef,
          code: 'INVALID_IMAGE',
        },
        {
          pageNumber: 3,
          sourceDocumentRef: 'doc_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
          code: 'INVALID_IMAGE',
        },
      ],
    }

    const replaced = removeOcrPreflightBatchOutcomeSource(
      outcome,
      secondSourceDocumentRef
    )

    expect(replaced.pages.map(({ sourceDocumentRef }) => sourceDocumentRef)).toEqual([
      firstSourceDocumentRef,
    ])
    expect(replaced.failures).toEqual([
      {
        pageNumber: 3,
        sourceDocumentRef: 'doc_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        code: 'INVALID_IMAGE',
      },
    ])
  })

  it('summarizes only temporary low-confidence review rows and fields', () => {
    const lowSku = row([
      {
        code: 'LOW_FIELD_CONFIDENCE',
        field: 'sku',
        message: 'not shown to the browser',
      },
    ])
    const lowBarcodeAndName = row([
      {
        code: 'LOW_FIELD_CONFIDENCE',
        field: 'barcode',
        message: 'not shown to the browser',
      },
      {
        code: 'LOW_FIELD_CONFIDENCE',
        field: 'productName',
        message: 'not shown to the browser',
      },
    ])
    const first = createOcrPreflightBatchPage(
      page([lowSku, row()]),
      1,
      firstSourceDocumentRef
    )
    const second = createOcrPreflightBatchPage(
      page([lowBarcodeAndName]),
      2,
      secondSourceDocumentRef
    )

    expect(hasLowConfidenceOcrPreflightRow(lowSku)).toBe(true)
    expect(hasLowConfidenceOcrPreflightRow(row())).toBe(false)
    expect(summarizeLowConfidenceOcrPreflightReview([first, second])).toEqual({
      rowCount: 2,
      fieldCount: 3,
      pageNumbers: [1, 2],
    })
  })
})
