export interface SourceRowIdentity {
  sourceDocumentRef?: string
  pageNumber: number
  rowNumber: number
}

export interface DuplicateSourceRow {
  duplicateInputIndex: number
  firstInputIndex: number
}

/**
 * Finds repeated source rows only when both rows carry the same opaque source
 * document reference. Direct manual rows without a document reference remain
 * intentionally unconstrained because the application cannot safely infer
 * whether they came from one physical document or several.
 */
export function findDuplicateSourceRows(
  rows: readonly SourceRowIdentity[]
): readonly DuplicateSourceRow[] {
  const firstInputIndexBySource = new Map<string, number>()
  const duplicates: DuplicateSourceRow[] = []

  for (const [index, row] of rows.entries()) {
    if (!row.sourceDocumentRef) {
      continue
    }

    const sourceKey = [row.sourceDocumentRef, row.pageNumber, row.rowNumber].join(
      '\u0000'
    )
    const firstInputIndex = firstInputIndexBySource.get(sourceKey)
    if (firstInputIndex !== undefined) {
      duplicates.push({ firstInputIndex, duplicateInputIndex: index })
      continue
    }

    firstInputIndexBySource.set(sourceKey, index)
  }

  return duplicates
}
