import type { SourceReference } from './types'

export interface SourceReferencePresentation {
  documentOrdinal?: number
  pageNumber: number
  rowNumber: number
  label: string
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

/**
 * Builds a display-safe source reference for review results. It intentionally
 * omits job IDs, document/page IDs, source text, and any file metadata.
 */
export function sourceReferencePresentation(
  source: SourceReference
): SourceReferencePresentation | null {
  const documentOrdinal = source?.page?.documentOrdinal
  const pageNumber = source?.page?.pageNumber
  const rowNumber = source?.row?.rowNumber

  if (
    !isPositiveInteger(pageNumber) ||
    !isPositiveInteger(rowNumber) ||
    (documentOrdinal !== undefined && !isPositiveInteger(documentOrdinal))
  ) {
    return null
  }

  return {
    ...(documentOrdinal ? { documentOrdinal } : {}),
    pageNumber,
    rowNumber,
    label: documentOrdinal
      ? `מסמך ${documentOrdinal}, עמוד ${pageNumber}, שורה ${rowNumber}`
      : `עמוד ${pageNumber}, שורה ${rowNumber}`,
  }
}

/**
 * Preserves every source entry in its original total. Similar-looking
 * page/row pairs are not deduplicated because they may have originated from
 * distinct, non-persistent documents. When available, a response-local
 * document ordinal distinguishes them without exposing their identities.
 */
export function sourceReferencePresentations(
  sources: readonly SourceReference[]
): SourceReferencePresentation[] {
  return sources
    .map(sourceReferencePresentation)
    .filter(
      (presentation): presentation is SourceReferencePresentation => presentation !== null
    )
}
