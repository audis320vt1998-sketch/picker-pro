/**
 * Browser-only helpers for arranging a selected OCR batch before it is sent.
 * They deliberately know nothing about files, names, or document content, so
 * the UI can keep those details local while preserving the selected order.
 */

export interface OcrImageBatchEditCheck {
  selectedImageCount: number
  hasPdfSelection: boolean
  hasPreflightOutcome: boolean
  isSubmitting: boolean
  hasPendingSourceSelection: boolean
}

export interface OcrPreflightReviewInteractionLockCheck {
  isSubmitting: boolean
  isBatchEditConfirmationPending: boolean
}

/**
 * OCR-result controls must remain inert while either an OCR request or the
 * destructive return-to-selection confirmation is active.
 */
export function isOcrPreflightReviewInteractionLocked({
  isSubmitting,
  isBatchEditConfirmationPending,
}: OcrPreflightReviewInteractionLockCheck): boolean {
  return isSubmitting || isBatchEditConfirmationPending
}

/**
 * A completed OCR outcome can be discarded only to return to the exact local
 * image batch that created it, with no other source-replacement decision
 * awaiting confirmation. PDF pages are intentionally excluded because their
 * individual source images are not retained in the browser.
 */
export function canReturnToOcrImageSelectionForEditing({
  selectedImageCount,
  hasPdfSelection,
  hasPreflightOutcome,
  isSubmitting,
  hasPendingSourceSelection,
}: OcrImageBatchEditCheck): boolean {
  return (
    Number.isInteger(selectedImageCount) &&
    selectedImageCount > 0 &&
    !hasPdfSelection &&
    hasPreflightOutcome &&
    !isSubmitting &&
    !hasPendingSourceSelection
  )
}

export function moveOcrPreflightSelectionItem<T>(
  items: readonly T[],
  currentIndex: number,
  destinationIndex: number
): readonly T[] {
  if (
    !Number.isInteger(currentIndex) ||
    !Number.isInteger(destinationIndex) ||
    currentIndex < 0 ||
    destinationIndex < 0 ||
    currentIndex >= items.length ||
    destinationIndex >= items.length ||
    currentIndex === destinationIndex
  ) {
    return items
  }

  const nextItems = [...items]
  const [movedItem] = nextItems.splice(currentIndex, 1)
  nextItems.splice(destinationIndex, 0, movedItem)
  return nextItems
}

export function removeOcrPreflightSelectionItem<T>(
  items: readonly T[],
  index: number
): readonly T[] {
  if (!Number.isInteger(index) || index < 0 || index >= items.length) {
    return items
  }

  return [...items.slice(0, index), ...items.slice(index + 1)]
}
