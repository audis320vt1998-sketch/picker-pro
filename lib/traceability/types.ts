export interface SourcePageRef {
  jobId: string
  /**
   * A response-local, non-identifying position for an OCR source document.
   * It exists only when a manual-review request contains an opaque document
   * reference, and never contains that reference, a filename, or customer
   * information.
   */
  documentOrdinal?: number
  pageNumber: number
  pageId?: string
}

export interface SourceRowRef {
  rowNumber: number
  rowId?: string
  rawText?: string
}

export interface SourceReference {
  page: SourcePageRef
  row: SourceRowRef
}

export interface CalculatedValue {
  value: number
  sources: SourceReference[]
}

export function createCalculatedValue(
  value: number,
  source: SourceReference
): CalculatedValue {
  return {
    value,
    sources: [source],
  }
}
