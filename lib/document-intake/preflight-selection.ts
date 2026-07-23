/**
 * Browser-only helpers for arranging a selected OCR batch before it is sent.
 * They deliberately know nothing about files, names, or document content, so
 * the UI can keep those details local while preserving the selected order.
 */
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
