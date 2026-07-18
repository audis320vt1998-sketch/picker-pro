import type {
  DocumentPreflightPage,
  OcrPreflightBatchOutcome,
} from '@/lib/document-intake'
import {
  createOcrPreflightBatchOutcome,
  removeOcrPreflightBatchOutcomeSource,
  recordOcrPreflightBatchFailure,
  recordOcrPreflightBatchSuccess,
} from '@/lib/document-intake/preflight-outcome'
import { createOcrPreflightBatchPage } from '@/lib/document-intake/preflight-batch'

const firstSourceDocumentRef = 'doc_01234567-89ab-4def-8123-456789abcdef'
const secondSourceDocumentRef = 'doc_fedcba98-7654-4cde-8123-456789abcdef'

function page(): DocumentPreflightPage {
  return {
    pageNumber: 1,
    rows: [],
    issues: [],
  }
}

describe('OCR preflight batch outcome', () => {
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
})
