import type { DocumentPreflightPage } from '@/lib/document-intake'
import {
  createOcrPreflightBatchOutcome,
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
})
