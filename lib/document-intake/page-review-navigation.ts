import type { OcrPreflightPageReviewState } from './page-review'

export type OcrPreflightPageNavigationStatus =
  | 'REPLACEMENT_PENDING'
  | 'OCR_FAILED'
  | 'ROWS_REQUIRED'
  | 'ROUTE_REQUIRED'
  | 'PENDING_CONFIRMATION'
  | 'CONFIRMED'

export interface OcrPreflightPageNavigationReview {
  pageNumber: number
  sourceDocumentRef: string
  reviewState: OcrPreflightPageReviewState
  lowConfidenceRowCount: number
}

export interface OcrPreflightPageNavigationFailure {
  pageNumber: number
  sourceDocumentRef: string
}

export interface OcrPreflightPageNavigationReplacement {
  pageNumber: number
  sourceDocumentRef: string
}

export interface OcrPreflightPageNavigationInput {
  reviewedPages: readonly OcrPreflightPageNavigationReview[]
  failedPages: readonly OcrPreflightPageNavigationFailure[]
  replacementPages: readonly OcrPreflightPageNavigationReplacement[]
}

export interface OcrPreflightPageNavigationEntry {
  pageNumber: number
  sourceDocumentRef: string
  status: OcrPreflightPageNavigationStatus
  lowConfidenceRowCount: number
}

export interface OcrPreflightPageNavigationSummary {
  pageCount: number
  confirmedPageCount: number
  attentionPageCount: number
  lowConfidenceConfirmedPageCount: number
}

export type OcrPreflightPageNavigationDirection = 'previous' | 'next'

function statusForReview(
  reviewState: OcrPreflightPageReviewState
): OcrPreflightPageNavigationStatus {
  switch (reviewState.kind) {
    case 'ROWS_REQUIRED':
      return 'ROWS_REQUIRED'
    case 'ROUTE_REQUIRED':
      return 'ROUTE_REQUIRED'
    case 'PENDING':
      return 'PENDING_CONFIRMATION'
    case 'CONFIRMED':
      return 'CONFIRMED'
  }
}

function attentionPriority(entry: OcrPreflightPageNavigationEntry): number {
  switch (entry.status) {
    case 'REPLACEMENT_PENDING':
      return 0
    case 'OCR_FAILED':
      return 1
    case 'ROUTE_REQUIRED':
      return 2
    case 'ROWS_REQUIRED':
      return 3
    case 'PENDING_CONFIRMATION':
      return 4
    case 'CONFIRMED':
      return entry.lowConfidenceRowCount > 0 ? 5 : Number.POSITIVE_INFINITY
  }
}

function normalizePageNumber(pageNumber: number): number | null {
  return Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : null
}

function normalizeLowConfidenceRowCount(count: number): number {
  return Number.isInteger(count) && count > 0 ? count : 0
}

function isValidSourceDocumentRef(value: string): boolean {
  return value.trim().length > 0
}

function compareEntries(
  left: OcrPreflightPageNavigationEntry,
  right: OcrPreflightPageNavigationEntry
): number {
  return (
    left.pageNumber - right.pageNumber ||
    left.sourceDocumentRef.localeCompare(right.sourceDocumentRef)
  )
}

function preferEntry(
  current: OcrPreflightPageNavigationEntry | undefined,
  candidate: OcrPreflightPageNavigationEntry
): OcrPreflightPageNavigationEntry {
  if (!current || attentionPriority(candidate) < attentionPriority(current)) {
    return candidate
  }

  return current
}

/**
 * Builds a browser-only page navigator for the currently visible OCR batch.
 * A source reference can contribute only one entry, with a pending replacement
 * or a failed OCR attempt taking precedence over a stale successful draft.
 */
export function createOcrPreflightPageNavigation({
  reviewedPages,
  failedPages,
  replacementPages,
}: OcrPreflightPageNavigationInput): readonly OcrPreflightPageNavigationEntry[] {
  const entriesBySourceDocumentRef = new Map<
    string,
    OcrPreflightPageNavigationEntry
  >()

  const addEntry = (entry: OcrPreflightPageNavigationEntry) => {
    if (
      normalizePageNumber(entry.pageNumber) === null ||
      !isValidSourceDocumentRef(entry.sourceDocumentRef)
    ) {
      return
    }

    entriesBySourceDocumentRef.set(
      entry.sourceDocumentRef,
      preferEntry(entriesBySourceDocumentRef.get(entry.sourceDocumentRef), entry)
    )
  }

  for (const page of reviewedPages) {
    addEntry({
      pageNumber: page.pageNumber,
      sourceDocumentRef: page.sourceDocumentRef,
      status: statusForReview(page.reviewState),
      lowConfidenceRowCount: normalizeLowConfidenceRowCount(
        page.lowConfidenceRowCount
      ),
    })
  }

  for (const page of failedPages) {
    addEntry({
      pageNumber: page.pageNumber,
      sourceDocumentRef: page.sourceDocumentRef,
      status: 'OCR_FAILED',
      lowConfidenceRowCount: 0,
    })
  }

  for (const page of replacementPages) {
    addEntry({
      pageNumber: page.pageNumber,
      sourceDocumentRef: page.sourceDocumentRef,
      status: 'REPLACEMENT_PENDING',
      lowConfidenceRowCount: 0,
    })
  }

  return [...entriesBySourceDocumentRef.values()].sort(compareEntries)
}

export function pageNavigationRequiresAttention(
  entry: OcrPreflightPageNavigationEntry
): boolean {
  return attentionPriority(entry) < Number.POSITIVE_INFINITY
}

export function summarizeOcrPreflightPageNavigation(
  entries: readonly OcrPreflightPageNavigationEntry[]
): OcrPreflightPageNavigationSummary {
  const attentionPageCount = entries.filter(
    pageNavigationRequiresAttention
  ).length
  const confirmedEntries = entries.filter(
    (entry) => entry.status === 'CONFIRMED'
  )

  return {
    pageCount: entries.length,
    confirmedPageCount: confirmedEntries.length,
    attentionPageCount,
    lowConfidenceConfirmedPageCount: confirmedEntries.filter(
      (entry) => entry.lowConfidenceRowCount > 0
    ).length,
  }
}

/**
 * Preserves the current page when it still exists. Otherwise it sends the
 * reviewer to the highest-priority unresolved page, then to the first page.
 */
export function resolveOcrPreflightPageNavigationEntry(
  entries: readonly OcrPreflightPageNavigationEntry[],
  preferredSourceDocumentRef: string | null
): OcrPreflightPageNavigationEntry | null {
  const preferred = preferredSourceDocumentRef
    ? entries.find(
        ({ sourceDocumentRef }) =>
          sourceDocumentRef === preferredSourceDocumentRef
      )
    : undefined
  if (preferred) {
    return preferred
  }

  const nextAttention = entries
    .filter(pageNavigationRequiresAttention)
    .sort(
      (left, right) =>
        attentionPriority(left) - attentionPriority(right) ||
        compareEntries(left, right)
    )[0]

  return nextAttention ?? entries[0] ?? null
}

export function getAdjacentOcrPreflightPageNavigationEntry(
  entries: readonly OcrPreflightPageNavigationEntry[],
  sourceDocumentRef: string,
  direction: OcrPreflightPageNavigationDirection
): OcrPreflightPageNavigationEntry | null {
  const currentIndex = entries.findIndex(
    (entry) => entry.sourceDocumentRef === sourceDocumentRef
  )
  if (currentIndex < 0) {
    return null
  }

  const nextIndex = direction === 'previous' ? currentIndex - 1 : currentIndex + 1
  return entries[nextIndex] ?? null
}

/**
 * Finds the next page that still needs review in document order, wrapping once
 * at the end. The current page is deliberately excluded so a single remaining
 * attention item does not produce a button that appears to make progress.
 */
export function getNextOcrPreflightPageNavigationAttentionEntry(
  entries: readonly OcrPreflightPageNavigationEntry[],
  sourceDocumentRef: string | null
): OcrPreflightPageNavigationEntry | null {
  const currentIndex = entries.findIndex(
    (entry) => entry.sourceDocumentRef === sourceDocumentRef
  )

  if (currentIndex < 0) {
    return entries.find(pageNavigationRequiresAttention) ?? null
  }

  for (let offset = 1; offset < entries.length; offset += 1) {
    const candidate = entries[(currentIndex + offset) % entries.length]
    if (pageNavigationRequiresAttention(candidate)) {
      return candidate
    }
  }

  return null
}
