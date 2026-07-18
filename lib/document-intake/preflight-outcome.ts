import type { OcrPreflightFailureCode } from './preflight-failure'
import {
  type OcrPreflightBatchPage,
  upsertOcrPreflightBatchPage,
} from './preflight-batch'

/**
 * One selected source image can have exactly one visible outcome. Keeping
 * successful drafts and failures together prevents an image from appearing
 * in both lists while a user explicitly retries it.
 */
export interface OcrPreflightBatchFailure {
  pageNumber: number
  sourceDocumentRef: string
  code: OcrPreflightFailureCode
}

export interface OcrPreflightBatchOutcome {
  pages: readonly OcrPreflightBatchPage[]
  failures: readonly OcrPreflightBatchFailure[]
}

export function createOcrPreflightBatchOutcome(): OcrPreflightBatchOutcome {
  return { pages: [], failures: [] }
}

function sortFailures(
  failures: readonly OcrPreflightBatchFailure[]
): readonly OcrPreflightBatchFailure[] {
  return [...failures].sort(
    (left, right) =>
      left.pageNumber - right.pageNumber ||
      left.sourceDocumentRef.localeCompare(right.sourceDocumentRef)
  )
}

export function recordOcrPreflightBatchSuccess(
  outcome: OcrPreflightBatchOutcome,
  page: OcrPreflightBatchPage
): OcrPreflightBatchOutcome {
  return {
    pages: upsertOcrPreflightBatchPage(outcome.pages, page),
    failures: outcome.failures.filter(
      ({ sourceDocumentRef }) => sourceDocumentRef !== page.sourceDocumentRef
    ),
  }
}

export function recordOcrPreflightBatchFailure(
  outcome: OcrPreflightBatchOutcome,
  failure: OcrPreflightBatchFailure
): OcrPreflightBatchOutcome {
  return {
    pages: outcome.pages.filter(
      ({ sourceDocumentRef }) => sourceDocumentRef !== failure.sourceDocumentRef
    ),
    failures: sortFailures([
      ...outcome.failures.filter(
        ({ sourceDocumentRef }) => sourceDocumentRef !== failure.sourceDocumentRef
      ),
      failure,
    ]),
  }
}
