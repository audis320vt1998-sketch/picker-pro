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

/**
 * The upload UI may move focus to a completed result only after OCR has
 * finished and there is an actual page draft or page-level failure to review.
 * An empty in-progress or cleared outcome must not be announced as a result.
 */
export function shouldFocusCompletedOcrPreflightResult(
  outcome: OcrPreflightBatchOutcome | null,
  isSubmitting: boolean
): boolean {
  return (
    outcome !== null &&
    !isSubmitting &&
    (outcome.pages.length > 0 || outcome.failures.length > 0)
  )
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

/**
 * A newly selected replacement image invalidates only the draft or failure
 * created from the prior image in that logical page slot. Other selected
 * images stay visible and reviewable.
 */
export function removeOcrPreflightBatchOutcomeSource(
  outcome: OcrPreflightBatchOutcome,
  sourceDocumentRef: string
): OcrPreflightBatchOutcome {
  return {
    pages: outcome.pages.filter(
      (page) => page.sourceDocumentRef !== sourceDocumentRef
    ),
    failures: outcome.failures.filter(
      (failure) => failure.sourceDocumentRef !== sourceDocumentRef
    ),
  }
}
