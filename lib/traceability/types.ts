export interface SourcePageRef {
  jobId: string
  pageNumber: number
  pageId?: string
  sourceFileName?: string
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
