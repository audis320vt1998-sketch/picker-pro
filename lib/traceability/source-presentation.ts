import type { SourceReference } from './types'

export interface SourceReferencePresentation {
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
  const pageNumber = source?.page?.pageNumber
  const rowNumber = source?.row?.rowNumber

  if (!isPositiveInteger(pageNumber) || !isPositiveInteger(rowNumber)) {
    return null
  }

  return {
    pageNumber,
    rowNumber,
    label: `עמוד ${pageNumber}, שורה ${rowNumber}`,
  }
}

/**
 * Preserves every source entry in its original total. Similar-looking
 * page/row pairs are not deduplicated because they may have originated from
 * distinct, non-persistent documents whose identities are not returned.
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
