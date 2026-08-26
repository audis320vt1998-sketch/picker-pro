import type { ManualReviewRowInput } from './types'

export type SourceDocumentOrdinals = ReadonlyMap<string, number>

function usableSourceDocumentRef(
  sourceDocumentRef: string | undefined
): string | undefined {
  const normalized = sourceDocumentRef?.trim()
  return normalized || undefined
}

/**
 * Creates stable, request-local document positions without returning or
 * persisting the opaque source-document identifiers themselves. Direct manual
 * rows have no document position because they did not originate from a traced
 * OCR document.
 */
export function createSourceDocumentOrdinals(
  rows: readonly Pick<ManualReviewRowInput, 'sourceDocumentRef'>[]
): SourceDocumentOrdinals {
  const ordinals = new Map<string, number>()

  for (const row of rows) {
    const sourceDocumentRef = usableSourceDocumentRef(row.sourceDocumentRef)
    if (!sourceDocumentRef || ordinals.has(sourceDocumentRef)) {
      continue
    }

    ordinals.set(sourceDocumentRef, ordinals.size + 1)
  }

  return ordinals
}

export function sourceDocumentOrdinalForRow(
  row: Pick<ManualReviewRowInput, 'sourceDocumentRef'>,
  ordinals: SourceDocumentOrdinals
): number | undefined {
  const sourceDocumentRef = usableSourceDocumentRef(row.sourceDocumentRef)
  return sourceDocumentRef ? ordinals.get(sourceDocumentRef) : undefined
}
