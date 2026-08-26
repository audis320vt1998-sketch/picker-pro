import {
  canReturnToOcrImageSelectionForEditing,
  isOcrPreflightReviewInteractionLocked,
  moveOcrPreflightSelectionItem,
  removeOcrPreflightSelectionItem,
} from '@/lib/document-intake/preflight-selection'

describe('browser OCR preflight selection helpers', () => {
  it('allows a completed local image batch to return to ordering only after OCR is idle', () => {
    expect(
      canReturnToOcrImageSelectionForEditing({
        selectedImageCount: 2,
        hasPdfSelection: false,
        hasPreflightOutcome: true,
        isSubmitting: false,
        hasPendingSourceSelection: false,
      })
    ).toBe(true)

    for (const blockedCheck of [
      {
        selectedImageCount: 0,
        hasPdfSelection: false,
        hasPreflightOutcome: true,
        isSubmitting: false,
        hasPendingSourceSelection: false,
      },
      {
        selectedImageCount: 2,
        hasPdfSelection: true,
        hasPreflightOutcome: true,
        isSubmitting: false,
        hasPendingSourceSelection: false,
      },
      {
        selectedImageCount: 2,
        hasPdfSelection: false,
        hasPreflightOutcome: false,
        isSubmitting: false,
        hasPendingSourceSelection: false,
      },
      {
        selectedImageCount: 2,
        hasPdfSelection: false,
        hasPreflightOutcome: true,
        isSubmitting: true,
        hasPendingSourceSelection: false,
      },
      {
        selectedImageCount: 2,
        hasPdfSelection: false,
        hasPreflightOutcome: true,
        isSubmitting: false,
        hasPendingSourceSelection: true,
      },
    ]) {
      expect(canReturnToOcrImageSelectionForEditing(blockedCheck)).toBe(false)
    }
  })

  it('locks OCR-result interaction while submitting or confirming a return to the batch', () => {
    expect(
      isOcrPreflightReviewInteractionLocked({
        isSubmitting: false,
        isBatchEditConfirmationPending: false,
      })
    ).toBe(false)
    expect(
      isOcrPreflightReviewInteractionLocked({
        isSubmitting: true,
        isBatchEditConfirmationPending: false,
      })
    ).toBe(true)
    expect(
      isOcrPreflightReviewInteractionLocked({
        isSubmitting: false,
        isBatchEditConfirmationPending: true,
      })
    ).toBe(true)
  })

  it('moves one selected item without mutating the original order', () => {
    const original = ['first', 'second', 'third']

    const reordered = moveOcrPreflightSelectionItem(original, 2, 0)

    expect(reordered).toEqual(['third', 'first', 'second'])
    expect(original).toEqual(['first', 'second', 'third'])
  })

  it('keeps the existing selection for an invalid or no-op move', () => {
    const original = ['first', 'second']

    expect(moveOcrPreflightSelectionItem(original, 0, 0)).toBe(original)
    expect(moveOcrPreflightSelectionItem(original, -1, 1)).toBe(original)
    expect(moveOcrPreflightSelectionItem(original, 0, 2)).toBe(original)
  })

  it('removes an item without mutating the original order', () => {
    const original = ['first', 'second', 'third']

    const remaining = removeOcrPreflightSelectionItem(original, 1)

    expect(remaining).toEqual(['first', 'third'])
    expect(original).toEqual(['first', 'second', 'third'])
  })

  it('keeps the existing selection when an invalid item is removed', () => {
    const original = ['first']

    expect(removeOcrPreflightSelectionItem(original, -1)).toBe(original)
    expect(removeOcrPreflightSelectionItem(original, 1)).toBe(original)
  })
})
