/**
 * Browser-only replacement state for a selected OCR image. A slot contains
 * only an opaque source reference and its stable selected-order page number;
 * it deliberately does not contain a file name, object URL, or image data.
 */
export interface OcrPreflightReplacementSlot {
  pageNumber: number
  sourceDocumentRef: string
}

function sortReplacementSlots(
  slots: readonly OcrPreflightReplacementSlot[]
): readonly OcrPreflightReplacementSlot[] {
  return [...slots].sort(
    (left, right) =>
      left.pageNumber - right.pageNumber ||
      left.sourceDocumentRef.localeCompare(right.sourceDocumentRef)
  )
}

export function upsertOcrPreflightReplacementSlot(
  slots: readonly OcrPreflightReplacementSlot[],
  nextSlot: OcrPreflightReplacementSlot
): readonly OcrPreflightReplacementSlot[] {
  return sortReplacementSlots([
    ...slots.filter(
      ({ pageNumber, sourceDocumentRef }) =>
        sourceDocumentRef !== nextSlot.sourceDocumentRef &&
        pageNumber !== nextSlot.pageNumber
    ),
    nextSlot,
  ])
}

export function removeOcrPreflightReplacementSlot(
  slots: readonly OcrPreflightReplacementSlot[],
  sourceDocumentRef: string
): readonly OcrPreflightReplacementSlot[] {
  return slots.filter((slot) => slot.sourceDocumentRef !== sourceDocumentRef)
}

/**
 * Row selections are keyed as `<pageNumber>:<parserRowIndex>`. A replacement
 * invalidates selections from that page because they were checked against the
 * prior source image, while preserving every other selected page.
 */
export function removeOcrPreflightPageRowSelections(
  selectedRowKeys: Readonly<Record<string, boolean>>,
  pageNumber: number
): Record<string, boolean> {
  const prefix = `${pageNumber}:`

  return Object.fromEntries(
    Object.entries(selectedRowKeys).filter(([key]) => !key.startsWith(prefix))
  )
}
